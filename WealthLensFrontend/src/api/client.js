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
  // Profile
  getProfile: () => request('GET', '/api/profile'),
  updateProfile: (data) => request('PUT', '/api/profile', data),

  // Assets
  getAssets: () => request('GET', '/api/assets'),
  createAsset: (data) => request('POST', '/api/assets', data),
  updateAsset: (id, data) => request('PUT', `/api/assets/${id}`, data),
  deleteAsset: (id) => request('DELETE', `/api/assets/${id}`),

  // Goals
  getGoals: () => request('GET', '/api/goals'),
  createGoal: (data) => request('POST', '/api/goals', data),
  updateGoal: (id, data) => request('PUT', `/api/goals/${id}`, data),
  deleteGoal: (id) => request('DELETE', `/api/goals/${id}`),

  // SIPs
  getSips: () => request('GET', '/api/sips'),
  createSip: (data) => request('POST', '/api/sips', data),
  updateSip: (id, data) => request('PUT', `/api/sips/${id}`, data),
  deleteSip: (id) => request('DELETE', `/api/sips/${id}`),

  // Insurance
  getInsurance: () => request('GET', '/api/insurance'),
  createInsurance: (data) => request('POST', '/api/insurance', data),
  updateInsurance: (id, data) => request('PUT', `/api/insurance/${id}`, data),
  deleteInsurance: (id) => request('DELETE', `/api/insurance/${id}`),

  // Loans
  getLoans: () => request('GET', '/api/loans'),
  createLoan: (data) => request('POST', '/api/loans', data),
  updateLoan: (id, data) => request('PUT', `/api/loans/${id}`, data),
  deleteLoan: (id) => request('DELETE', `/api/loans/${id}`),

  // Simulation
  simulate: () => request('POST', '/api/simulate'),
};

export function fmt(value, currency = 'INR') {
  const v = Math.abs(Number(value));
  const neg = Number(value) < 0 ? '-' : '';
  if (currency === 'INR') {
    const sym = '₹';
    if (v >= 10_000_000) return `${neg}${sym}${(v / 10_000_000).toFixed(1)}Cr`;
    if (v >= 100_000) return `${neg}${sym}${(v / 100_000).toFixed(1)}L`;
    return `${neg}${sym}${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  } else {
    const sym = '$';
    if (v >= 1_000_000) return `${neg}${sym}${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `${neg}${sym}${(v / 1_000).toFixed(1)}K`;
    return `${neg}${sym}${v.toLocaleString()}`;
  }
}
