/** API service — all backend communication goes through here. */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function getToken() {
  return localStorage.getItem('token');
}

function getAdminToken() {
  return localStorage.getItem('admin_token');
}

export function getWsUrl(path) {
  const wsBase = import.meta.env.VITE_WS_URL || `ws://${window.location.host}/ws`;
  return `${wsBase}${path}`;
}

async function request(url, options = {}) {
  const { auth = 'student', ...fetchOptions } = options;
  
  const headers = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (auth === 'student') {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } else if (auth === 'admin') {
    const token = getAdminToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      msg = data.detail || msg;
    } catch {}
    throw new ApiError(msg, res.status);
  }

  // Handle CSV/binary responses
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/csv')) {
    return res.blob();
  }

  return res.json();
}

// Auth
export const api = {
  // Student Auth
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data), auth: 'none' }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data), auth: 'none' }),
  getProfile: () => request('/auth/me'),
  heartbeat: () => request('/auth/heartbeat', { method: 'POST' }),
  registerTabSwitch: () => request('/auth/tab-switch', { method: 'POST' }),

  // Server time
  getServerTime: () => request('/server-time', { auth: 'none' }),

  // Rounds
  getCompetitionConfig: () => request('/rounds/config'),
  startRound: (round) => request(`/rounds/${round}/start`, { method: 'POST' }),
  getRoundStatus: (round) => request(`/rounds/${round}/status`),
  getQuestions: (round) => request(`/rounds/${round}/questions`),
  runCode: (round, data) => request(`/rounds/${round}/run`, { method: 'POST', body: JSON.stringify(data) }),
  submitCode: (round, questionId, data) => request(`/rounds/${round}/submit/${questionId}`, { method: 'POST', body: JSON.stringify(data) }),
  submitMCQ: (questionId, data) => request(`/rounds/1/submit-mcq/${questionId}`, { method: 'POST', body: JSON.stringify(data) }),
  getSubmissions: (round, questionId) => request(`/rounds/${round}/submissions/${questionId}`),
  finishRound: (round) => request(`/rounds/${round}/finish`, { method: 'POST' }),

  // Leaderboard
  getLeaderboard: (params = {}) => {
    const query = new URLSearchParams();
    if (params.round) query.set('round', params.round);
    if (params.department) query.set('department', params.department);
    if (params.year) query.set('year', params.year);
    if (params.search) query.set('search', params.search);
    return request(`/leaderboard?${query.toString()}`);
  },

  // Admin
  adminLogin: (data) => request('/admin/login', { method: 'POST', body: JSON.stringify(data), auth: 'none' }),
  getCompetitionStatus: () => request('/admin/competition/status', { auth: 'admin' }),
  updateConfig: (data) => request('/admin/competition/config', { method: 'POST', body: JSON.stringify(data), auth: 'admin' }),
  getStudents: (params = {}) => {
    const query = new URLSearchParams(params);
    return request(`/admin/students?${query.toString()}`, { auth: 'admin' });
  },
  getAdminQuestions: (round) => {
    const query = round ? `?round_number=${round}` : '';
    return request(`/admin/questions${query}`, { auth: 'admin' });
  },
  createQuestion: (data) => request('/admin/questions', { method: 'POST', body: JSON.stringify(data), auth: 'admin' }),
  updateQuestion: (id, data) => request(`/admin/questions/${id}`, { method: 'PUT', body: JSON.stringify(data), auth: 'admin' }),
  deleteQuestion: (id) => request(`/admin/questions/${id}`, { method: 'DELETE', auth: 'admin' }),
  addTestCase: (questionId, data) => request(`/admin/questions/${questionId}/test-cases`, { method: 'POST', body: JSON.stringify(data), auth: 'admin' }),
  deleteTestCase: (id) => request(`/admin/test-cases/${id}`, { method: 'DELETE', auth: 'admin' }),
  getAdminLeaderboard: (params = {}) => {
    const query = new URLSearchParams();
    if (params.round) query.set('round', params.round);
    if (params.department) query.set('department', params.department);
    if (params.year) query.set('year', params.year);
    if (params.search) query.set('search', params.search);
    return request(`/admin/leaderboard?${query.toString()}`, { auth: 'admin' });
  },
  exportResults: () => request('/admin/results/export', { auth: 'admin' }),
  restartEvent: (password) => request('/admin/restart-event', { method: 'POST', body: JSON.stringify({ password }), auth: 'admin' }),
};

export { ApiError };
