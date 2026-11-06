const rankingRepository = require('../repositories/rankingRepository');

const rankingService = {
  async getSessionPosition(sessionId, mode) {
    return rankingRepository.getSessionPosition(sessionId, mode);
  },

  async getLeaderboard(mode) {
    return rankingRepository.getLeaderboard(mode);
  }
};

module.exports = rankingService;
