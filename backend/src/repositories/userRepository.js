const pool = require('../db/client');

const userRepository = {
  async findByUsername(username) {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0] || null;
  },

  async findById(id) {
    const result = await pool.query(
      'SELECT id, username, is_admin, force_password_reset, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async findPasswordById(id) {
    const result = await pool.query(
      'SELECT id, password_hash FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async create(username, passwordHash) {
    const result = await pool.query(
      `INSERT INTO users (username, password_hash)
       VALUES ($1, $2)
       RETURNING id, username, is_admin, force_password_reset, created_at`,
      [username, passwordHash]
    );
    return result.rows[0];
  },

  async updatePassword(id, passwordHash) {
    await pool.query(
      `UPDATE users SET password_hash = $1, force_password_reset = false WHERE id = $2`,
      [passwordHash, id]
    );
  },

  async resetPassword(id, passwordHash) {
    await pool.query(
      `UPDATE users SET password_hash = $1, force_password_reset = true WHERE id = $2`,
      [passwordHash, id]
    );
  },

  async findAll() {
    const result = await pool.query(
      'SELECT id, username, is_admin, force_password_reset, created_at FROM users ORDER BY created_at DESC'
    );
    return result.rows;
  }
};

module.exports = userRepository;
