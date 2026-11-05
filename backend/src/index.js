const env = require('./config/env');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const logger = require('./utils/logger');
const errorHandler = require('./middlewares/errorHandler');

const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const rankingRoutes = require('./routes/ranking');
const adminRoutes = require('./routes/admin');

const app = express();

app.use(helmet());
app.disable('x-powered-by');

app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://127.0.0.1:4173', 'http://localhost:4173', 'https://triviafutbol-1.onrender.com'],
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser(env.COOKIE_SECRET));

app.use((req, res, next) => {
  logger.info({ message: 'request', method: req.method, path: req.path });
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: env.NODE_ENV });
});

app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/admin', adminRoutes);

app.use(errorHandler);

const PORT = env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`🚀 Servidor corriendo en puerto ${PORT}`);
  });
}

module.exports = app;
