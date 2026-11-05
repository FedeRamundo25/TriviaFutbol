// Cambiá esto:
// const API_URL = 'https://triviafutbol.onrender.com/api';

// Por esto:
const API_URL = window.__API_URL__ || 'https://triviafutbol.onrender.com/api';

const api = {
  async request(method, path, body = null) {
    try {
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      const token = localStorage.getItem('token');
      if (token) options.headers['Authorization'] = `Bearer ${token}`;
      if (body) options.body = JSON.stringify(body);
      const res = await fetch(`${API_URL}${path}`, options);
      const data = await res.json();
      if (!res.ok) return { error: data.error?.message || 'Error desconocido' };
      return data;
    } catch (err) {
      return { error: 'No se pudo conectar con el servidor' };
    }
  },

  async register(username, password) {
    const res = await this.request('POST', '/auth/register', { username, password });
    if (res.user) {
      const loginRes = await this.login(username, password);
      return { ...loginRes, accountCreated: true };
    }
    return res;
  },
  async login(username, password) {
    const res = await this.request('POST', '/auth/login', { username, password });
    if (res.token) localStorage.setItem('token', res.token);
    return res;
  },
  async logout() {
    localStorage.removeItem('token');
    return { ok: true };
  },
  async getMe() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const res = await this.request('GET', '/auth/me');
    return res.user || null;
  },
  async changePassword(currentPassword, newPassword) {
    return this.request('PUT', '/auth/change-password', { currentPassword, newPassword });
  },

 async startGame(mode) {
    return this.request('POST', '/game/start', { mode });
  },
  async submitAnswer(sessionId, questionRefId, questionType, answerGiven, responseTimeMs) {
    return this.request('POST', `/game/${sessionId}/answer`, {
      questionRefId, questionType, answerGiven, responseTimeMs
    });
  },
  async finishGame(sessionId, rawTimeMs) {
    return this.request('POST', `/game/${sessionId}/finish`, { rawTimeMs });
  },
  async getResult(sessionId) {
    return this.request('GET', `/game/${sessionId}/result`);
  },

  async getLeaderboard(mode) {
    return this.request('GET', `/ranking/${mode}`);
  },

  async getUsers() {
    return this.request('GET', '/admin/users');
  },
  async resetPassword(userId) {
    return this.request('PUT', `/admin/users/${userId}/reset-password`);
  },
};
