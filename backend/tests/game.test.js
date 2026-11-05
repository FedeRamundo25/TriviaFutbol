const request = require('supertest');
const app = require('../src/index');

describe('Game Flow Integration Tests', () => {
  let authToken;
  const testUser = {
    username: 'gameTestUser' + Date.now(),
    password: 'password123'
  };

  beforeAll(async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    expect(registerResponse.statusCode).toBe(201);

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send(testUser);

    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.body.token).toEqual(expect.any(String));
    authToken = loginResponse.body.token;
  });

  test('Should require authentication to start game', async () => {
    const res = await request(app)
      .post('/api/game/start')
      .send({ mode: 'teams' });

    expect(res.statusCode).toBe(401);
  });

  test('Should start a new game session when authenticated', async () => {
    const res = await request(app)
      .post('/api/game/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ mode: 'teams' });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('sessionId');
    expect(Array.isArray(res.body.questions)).toBe(true);
    expect(res.body.questions.length).toBeGreaterThan(0);
  });

  test('Should reject invalid mode', async () => {
    const res = await request(app)
      .post('/api/game/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ mode: 'invalid_mode' });

    expect(res.statusCode).toBe(400);
  });

  test('Should reject answer for non-existent session', async () => {
    const res = await request(app)
      .post('/api/game/99999/answer')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        questionRefId: 1,
        questionType: 'teams',
        answerGiven: 1,
        responseTimeMs: 1000
      });

    expect(res.statusCode).toBe(404);
  });

  test('Should complete a game, persist its result, and include it in the leaderboard', async () => {
    const startResponse = await request(app)
      .post('/api/game/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ mode: 'teams' });

    expect(startResponse.statusCode).toBe(201);
    expect(startResponse.body.questions.length).toBeGreaterThan(1);

    const { sessionId, questions } = startResponse.body;
    const firstQuestion = questions[0];
    const wrongOption = firstQuestion.options.find(
      option => option.id !== firstQuestion.questionRefId
    );
    expect(wrongOption).toBeDefined();

    const wrongAnswerResponse = await request(app)
      .post(`/api/game/${sessionId}/answer`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        questionRefId: firstQuestion.questionRefId,
        questionType: firstQuestion.questionType,
        answerGiven: wrongOption.id,
        responseTimeMs: 1000
      });

    expect(wrongAnswerResponse.statusCode).toBe(200);
    expect(wrongAnswerResponse.body.isCorrect).toBe(false);
    expect(wrongAnswerResponse.body.penaltyMs).toBeGreaterThan(0);

    const secondQuestion = questions[1];
    const correctAnswerResponse = await request(app)
      .post(`/api/game/${sessionId}/answer`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        questionRefId: secondQuestion.questionRefId,
        questionType: secondQuestion.questionType,
        answerGiven: secondQuestion.questionRefId,
        responseTimeMs: 1000
      });

    expect(correctAnswerResponse.statusCode).toBe(200);
    expect(correctAnswerResponse.body.isCorrect).toBe(true);

    const finishResponse = await request(app)
      .post(`/api/game/${sessionId}/finish`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ rawTimeMs: 2000 });

    expect(finishResponse.statusCode).toBe(200);
    expect(finishResponse.body.correctAnswers).toBe(1);
    expect(finishResponse.body.wrongAnswers).toBe(1);
    expect(finishResponse.body.penaltyMs).toBeGreaterThan(0);
    expect(finishResponse.body.totalTimeMs).toBe(
      finishResponse.body.rawTimeMs + finishResponse.body.penaltyMs
    );

    const resultResponse = await request(app)
      .get(`/api/game/${sessionId}/result`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(resultResponse.statusCode).toBe(200);
    expect(resultResponse.body.session.completed).toBe(true);
    expect(resultResponse.body.session.correct_answers).toBe(1);
    expect(resultResponse.body.session.wrong_answers).toBe(1);

    const leaderboardResponse = await request(app).get('/api/ranking/teams');
    expect(leaderboardResponse.statusCode).toBe(200);
    expect(leaderboardResponse.body.leaderboard).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          username: testUser.username,
          correct_answers: 1
        })
      ])
    );
  });
});
