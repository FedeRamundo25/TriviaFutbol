const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');
const userRepository = require('../repositories/userRepository');

const SALT_ROUNDS = 12;

const authService = {
  async register(username, password) {
    const existing = await userRepository.findByUsername(username);
    if (existing) {
      const error = new Error('El nombre de usuario ya existe');
      error.status = 409;
      throw error;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await userRepository.create(username, passwordHash);
    return user;
  },

  async login(username, password) {
    const user = await userRepository.findByUsername(username);
    if (!user) {
      const error = new Error('Usuario o contraseña incorrectos');
      error.status = 401;
      throw error;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const error = new Error('Usuario o contraseña incorrectos');
      error.status = 401;
      throw error;
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, is_admin: user.is_admin },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        is_admin: user.is_admin,
        force_password_reset: user.force_password_reset
      }
    };
  },

  async changePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findPasswordById(userId);
    if (!user) {
      const error = new Error('Usuario no encontrado');
      error.status = 404;
      throw error;
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      const error = new Error('La contraseña actual es incorrecta');
      error.status = 401;
      throw error;
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await userRepository.updatePassword(userId, passwordHash);
  },

  async resetPassword(userId) {
    const tempPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);
    await userRepository.resetPassword(userId, passwordHash);
    return tempPassword;
  }
};

module.exports = authService;
