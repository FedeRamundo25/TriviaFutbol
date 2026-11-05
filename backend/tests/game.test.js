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
});
