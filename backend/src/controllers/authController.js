const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

const authController = {
  register: asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const user = await authService.register(username, password);
    logger.info({ message: 'user_registered', userId: user.id, username });
    res.status(201).json({ user });
  }),

  login: asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const { token, user } = await authService.login(username, password);
    logger.info({ message: 'user_logged_in', userId: user.id, username });
    res.json({ token, user });
  }),

  // Agregamos estas para que las rutas no rompan:
  logout: asyncHandler(async (req, res) => {
    res.json({
      message: 'El cierre de sesión se realiza en el cliente eliminando el JWT; el servidor no revoca tokens emitidos.'
    });
  }),

  me: asyncHandler(async (req, res) => {
    // Retorna el usuario actual (ya viene en req.user por el middleware authenticate)
    res.json({ user: req.user });
  }),

  changePassword: asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ message: 'Password changed successfully' });
  })
};

module.exports = authController;
