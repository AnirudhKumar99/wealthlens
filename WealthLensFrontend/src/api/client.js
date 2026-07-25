const BASE = 'http://localhost:8000';

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  // --- Auth ---
  register: (data) => request('POST', '/api/auth/register', data),
  login: (data) => request('POST', '/api/auth/login', data),
  getMe: (token) => request('GET', `/api/auth/me?token=${token}`),

  // --- Profile Management ---
  getCategories: () => request('GET', '/api/categories'),
  getActiveProfile: () => request('GET', '/api/profiles/active'),
  setActiveProfile: (id) => request('PUT', `/api/profiles/active/${id}`),
  getProfiles: () => request('GET', '/api/profiles'),
  createProfile: (data) => request('POST', '/api/profiles', data),
  updateProfile: (id, data) => request('PUT', `/api/profiles/${id}`, data),
  deleteProfile: (id) => request('DELETE', `/api/profiles/${id}`),
  getProfile: (id) => request('GET', `/api/profiles/${id}`),

  // --- Scoped Items ---
  // Assets
  getAssets: (profileId) => request('GET', `/api/profiles/${profileId}/assets`),
  createAsset: (profileId, data) => request('POST', `/api/profiles/${profileId}/assets`, data),
  updateAsset: (profileId, id, data) => request('PUT', `/api/profiles/${profileId}/assets/${id}`, data),
  deleteAsset: (profileId, id) => request('DELETE', `/api/profiles/${profileId}/assets/${id}`),

  // Goals
  getGoals: (profileId) => request('GET', `/api/profiles/${profileId}/goals`),
  createGoal: (profileId, data) => request('POST', `/api/profiles/${profileId}/goals`, data),
  updateGoal: (profileId, id, data) => request('PUT', `/api/profiles/${profileId}/goals/${id}`, data),
  deleteGoal: (profileId, id) => request('DELETE', `/api/profiles/${profileId}/goals/${id}`),

  // SIPs
  getSips: (profileId) => request('GET', `/api/profiles/${profileId}/sips`),
  createSip: (profileId, data) => request('POST', `/api/profiles/${profileId}/sips`, data),
  updateSip: (profileId, id, data) => request('PUT', `/api/profiles/${profileId}/sips/${id}`, data),
  deleteSip: (profileId, id) => request('DELETE', `/api/profiles/${profileId}/sips/${id}`),

  // Insurance
  getInsurance: (profileId) => request('GET', `/api/profiles/${profileId}/insurance`),
  createInsurance: (profileId, data) => request('POST', `/api/profiles/${profileId}/insurance`, data),
  updateInsurance: (profileId, id, data) => request('PUT', `/api/profiles/${profileId}/insurance/${id}`, data),
  deleteInsurance: (profileId, id) => request('DELETE', `/api/profiles/${profileId}/insurance/${id}`),

  // Loans
  getLoans: (profileId) => request('GET', `/api/profiles/${profileId}/loans`),
  createLoan: (profileId, data) => request('POST', `/api/profiles/${profileId}/loans`, data),
  updateLoan: (profileId, id, data) => request('PUT', `/api/profiles/${profileId}/loans/${id}`, data),
  deleteLoan: (profileId, id) => request('DELETE', `/api/profiles/${profileId}/loans/${id}`),

  // Simulation
  simulate: (profileId) => request('POST', `/api/profiles/${profileId}/simulate`),
};

export function fmt(value, currency = 'INR') {
  const v = Math.abs(Number(value));
  const neg = Number(value) < 0 ? '-' : '';
  if (currency === 'INR') {
    return `${neg}₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    return `${neg}$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
}

export function fmtShort(value, currency = 'INR') {
  const v = Math.abs(Number(value));
  const neg = Number(value) < 0 ? '-' : '';
  const sym = currency === 'INR' ? '₹' : '$';

  if (v === 0) return `${sym}0`;

  if (currency === 'INR') {
    if (v >= 10000000) return `${neg}${sym}${(v / 10000000).toFixed(1).replace(/\\.0$/, '')}Cr`;
    if (v >= 100000) return `${neg}${sym}${(v / 100000).toFixed(1).replace(/\\.0$/, '')}L`;
    if (v >= 1000) return `${neg}${sym}${(v / 1000).toFixed(1).replace(/\\.0$/, '')}k`;
    return `${neg}${sym}${v}`;
  } else {
    if (v >= 1000000000) return `${neg}${sym}${(v / 1000000000).toFixed(1).replace(/\\.0$/, '')}B`;
    if (v >= 1000000) return `${neg}${sym}${(v / 1000000).toFixed(1).replace(/\\.0$/, '')}M`;
    if (v >= 1000) return `${neg}${sym}${(v / 1000).toFixed(1).replace(/\\.0$/, '')}k`;
    return `${neg}${sym}${v}`;
  }
}
