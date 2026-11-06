const pool = require('../db/client');

const gameRepository = {
  async createSession(userId, mode, questions) {
    const result = await pool.query(
      'INSERT INTO game_sessions (user_id, mode, questions) VALUES ($1, $2, $3) RETURNING *',
      [userId, mode, JSON.stringify(questions)]
    );
    return result.rows[0];
  },

  async findSessionById(id) {
    const result = await pool.query('SELECT * FROM game_sessions WHERE id = $1', [id]);
    return result.rows[0];
  },

  async wasQuestionAnswered(sessionId, questionRefId, questionType) {
    const result = await pool.query(
      'SELECT id FROM game_answers WHERE session_id = $1 AND question_ref_id = $2 AND question_type = $3',
      [sessionId, questionRefId, questionType]
    );
    return result.rowCount > 0;
  },

  async findAnswer(sessionId, questionRefId, questionType) {
    const result = await pool.query(
      'SELECT is_correct, penalty_ms FROM game_answers WHERE session_id = $1 AND question_ref_id = $2 AND question_type = $3 ORDER BY id LIMIT 1',
      [sessionId, questionRefId, questionType]
    );
    return result.rows[0] || null;
  },

  async createAnswer(sessionId, questionRefId, questionType, answerGiven, isCorrect, responseTimeMs, penaltyMs) {
    await pool.query(
      'INSERT INTO game_answers (session_id, question_ref_id, question_type, answer_given, is_correct, response_time_ms, penalty_ms) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [sessionId, questionRefId, questionType, answerGiven, isCorrect, responseTimeMs, penaltyMs]
    );
  },

  async updateSession(id, data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    await pool.query(
      `UPDATE game_sessions SET ${setClause} WHERE id = $1`,
      [id, ...values]
    );
  },

  // ESTE ES EL NUEVO MÉTODO QUE CENTRALIZA EL SQL DE JUGADORES
  async getPlayerTeam(playerId) {
    const result = await pool.query(
      'SELECT team_id FROM players WHERE id = $1',
      [playerId]
    );
    return result.rows[0];
  }
};

module.exports = gameRepository;
