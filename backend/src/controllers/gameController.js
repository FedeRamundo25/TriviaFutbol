const gameService = require('../services/gameService');
const questionService = require('../services/questionService');
const asyncHandler = require('../utils/asyncHandler');

const gameController = {
  // Iniciar partida
  start: asyncHandler(async (req, res) => {
    const { mode } = req.body;
    const count = mode === 'timed' ? 50 : 10;
    const questions = (await questionService.generateQuestions(mode, count)) || [];
    const sessionQuestions = questions.map(question => {
      const options = question.options || [];
      return {
        questionRefId: question.questionRefId,
        questionType: question.questionType,
        correctAnswerId: options.find(option => option.correct)?.id,
        optionIds: options.map(option => option.id)
      };
    });
    const session = await gameService.startSession(req.user.id, mode, sessionQuestions);

    const publicQuestions = questions.map(question => ({
      ...question,
      options: (question.options || []).map(({ id, name }) => ({ id, name }))
    }));

    res.status(201).json({
      sessionId: session.id,
      mode: session.mode,
      questions: publicQuestions
    });
  }),

  // Procesar respuesta
  answer: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { questionRefId, questionType, answerGiven, responseTimeMs } = req.body;

    const result = await gameService.submitAnswer(
      parseInt(sessionId),
      req.user.id,
      questionRefId,
      questionType,
      answerGiven,
      responseTimeMs
    );

    res.json(result);
  }),

  // Finalizar partida
  finish: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { rawTimeMs } = req.body;

    const result = await gameService.finishSession(
      parseInt(sessionId),
      req.user.id,
      rawTimeMs
    );

    res.json(result);
  }),

  // Obtener resultado individual
  result: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const session = await gameService.getResult(parseInt(sessionId), req.user.id);
    res.json({ session });
  })
};

module.exports = gameController;
