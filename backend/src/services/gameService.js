const gameRepository = require('../repositories/gameRepository');
const rankingService = require('./rankingService');
const logger = require('../utils/logger');

const MAX_RESPONSE_TIME_MS = 60000;

const gameService = {
  async startSession(userId, mode, questions) {
    const session = await gameRepository.createSession(userId, mode, questions);
    logger.info({ message: 'game_started', userId, sessionId: session.id, mode });
    return session;
  },

  async submitAnswer(sessionId, userId, questionRefId, questionType, answerGiven, responseTimeMs) {
    const session = await gameRepository.findSessionById(sessionId);

    if (!session) {
      const error = new Error('Sesión no encontrada');
      error.status = 404;
      throw error;
    }
    if (session.user_id !== userId) {
      const error = new Error('No autorizado');
      error.status = 403;
      throw error;
    }
    if (session.completed) {
      const error = new Error('La partida ya terminó');
      error.status = 400;
      throw error;
    }
    if (responseTimeMs <= 0 || responseTimeMs > MAX_RESPONSE_TIME_MS) {
      const error = new Error('Tiempo de respuesta inválido');
      error.status = 400;
      throw error;
    }

    if (session.mode && session.mode !== 'timed' && session.mode !== questionType) {
      const error = new Error('El tipo de pregunta no corresponde al modo de juego');
      error.status = 400;
      throw error;
    }

    const sessionQuestions = Array.isArray(session.questions) ? session.questions : null;
    const storedQuestion = sessionQuestions?.find(question =>
      question.questionRefId === questionRefId && question.questionType === questionType
    );

    if (sessionQuestions && !storedQuestion) {
      const error = new Error('La pregunta no pertenece a esta partida');
      error.status = 400;
      throw error;
    }

    let correctAnswerId;
    if (storedQuestion) {
      if (!storedQuestion.optionIds?.includes(answerGiven)) {
        const error = new Error('La respuesta no es una opción válida para esta pregunta');
        error.status = 400;
        throw error;
      }

      correctAnswerId = storedQuestion.correctAnswerId;
      if (correctAnswerId === undefined) {
        const error = new Error('No se pudo validar la respuesta');
        error.status = 500;
        throw error;
      }
    }

    const alreadyAnswered = await gameRepository.wasQuestionAnswered(sessionId, questionRefId, questionType);
    if (alreadyAnswered) {
      const previousAnswer = await gameRepository.findAnswer(sessionId, questionRefId, questionType);
      return {
        isCorrect: previousAnswer?.is_correct || false,
        penaltyMs: previousAnswer?.penalty_ms || 0,
        correctAnswerId: correctAnswerId ?? questionRefId
      };
    }

    let isCorrect = false;
    if (storedQuestion) {
      isCorrect = answerGiven === correctAnswerId;
    } else if (questionType === 'teams') {
      correctAnswerId = questionRefId;
      isCorrect = answerGiven === correctAnswerId;
    } else if (questionType === 'players') {
      const player = await gameRepository.getPlayerTeam(questionRefId);
      isCorrect = player && answerGiven === player.team_id;
      correctAnswerId = player?.team_id;
    }

    const penalty = isCorrect ? 0 : (5000 + (session.wrong_answers * 3000));

    await gameRepository.createAnswer(
      sessionId, questionRefId, questionType,
      answerGiven, isCorrect, responseTimeMs, penalty
    );

    await gameRepository.updateSession(sessionId, {
      correct_answers: session.correct_answers + (isCorrect ? 1 : 0),
      wrong_answers: session.wrong_answers + (isCorrect ? 0 : 1),
      penalty_ms: session.penalty_ms + penalty,
      questions_answered: session.questions_answered + 1,
    });

    logger.info({ message: 'answer_submitted', sessionId, questionRefId, isCorrect, responseTimeMs });

    return { isCorrect, penaltyMs: penalty, correctAnswerId };
  },

  async finishSession(sessionId, userId, rawTimeMs) {
    const session = await gameRepository.findSessionById(sessionId);

    if (!session) {
      const error = new Error('Sesión no encontrada');
      error.status = 404;
      throw error;
    }
    if (session.user_id !== userId) {
      const error = new Error('No autorizado');
      error.status = 403;
      throw error;
    }
    if (session.completed) {
      const error = new Error('La partida ya terminó');
      error.status = 400;
      throw error;
    }

    const createdAtMs = Date.parse(session.created_at);
    const elapsedFromServer = Number.isFinite(createdAtMs) ? Date.now() - createdAtMs : 0;
    const trustedRawTimeMs = Math.max(rawTimeMs, elapsedFromServer, 1);
    const totalTimeMs = trustedRawTimeMs + session.penalty_ms;

    await gameRepository.updateSession(sessionId, {
      raw_time_ms: trustedRawTimeMs,
      total_time_ms: totalTimeMs,
      completed: true
    });

    const rankingPosition = await rankingService.getSessionPosition(sessionId, session.mode);

    logger.info({
      message: 'game_finished',
      userId,
      sessionId,
      mode: session.mode,
      correctAnswers: session.correct_answers,
      totalTimeMs,
      rankingPosition
    });

    return {
      correctAnswers: session.correct_answers,
      wrongAnswers: session.wrong_answers,
      penaltyMs: session.penalty_ms,
      rawTimeMs: trustedRawTimeMs,
      totalTimeMs,
      rankingPosition
    };
  },

  async getResult(sessionId, userId) {
    const session = await gameRepository.findSessionById(sessionId);

    if (!session) {
      const error = new Error('Sesión no encontrada');
      error.status = 404;
      throw error;
    }
    if (session.user_id !== userId) {
      const error = new Error('No autorizado');
      error.status = 403;
      throw error;
    }

    const { questions, ...publicSession } = session;
    return publicSession;
  }
};

module.exports = gameService;
