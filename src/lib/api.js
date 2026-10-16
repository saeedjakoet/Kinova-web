// Client-side API helpers — the single place to point the UI at a real backend.

import { API_URL, authHeader, clearSession } from './auth';
import { adaptFemale } from './cltch';

const CLTCH_TIMEOUT_MS = 30000;
const FEMALES_LIMIT = 65;

export class ApiError extends Error {
  constructor(status, payload) {
    super((payload && payload.message) || 'Request failed');
    this.status = status;
    this.code = payload && payload.code;
    this.payload = payload || {};
  }
}

async function request(url, options) {
  let res;
  try {
    res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  } catch {
    throw new ApiError(0, { code: 'NETWORK', message: 'Network error — check your connection and try again.' });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error);
  return data;
}

export function getFemales() {
  return request('/api/females');
}

/**
 * Females from the FastAPI Cltch route (GET /api/cltch/females, Bearer auth) + sample males
 * from the Next mock route (no males endpoint yet).
 * A 401 clears the session and sends the user back to /login.
 */
export async function getCollection() {
  const femalesReq = (async () => {
    const query = new URLSearchParams({
      limit: String(FEMALES_LIMIT),
      offset: '0',
      take: String(FEMALES_LIMIT),
      max_pages: '1',
      include_details: 'false',
      include_morph_records: 'true',
      ready: 'all',
    });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CLTCH_TIMEOUT_MS);
    let res;
    try {
      res = await fetch(`${API_URL}/api/cltch/females?${query.toString()}`, {
        headers: { Accept: 'application/json', ...authHeader() },
        signal: controller.signal,
      });
    } catch (err) {
      if (err && err.name === 'AbortError') {
        throw new ApiError(0, { code: 'TIMEOUT', message: 'Cltch took too long to respond for /api/cltch/females.' });
      }
      throw new ApiError(0, { code: 'NETWORK', message: `Can't reach the API at ${API_URL}. Is it running?` });
    } finally {
      clearTimeout(timeoutId);
    }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      clearSession();
      window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      throw new ApiError(401, { code: 'UNAUTHORIZED', message: 'Your session has expired. Please sign in again.' });
    }
    if (!res.ok) {
      const d = data && data.detail;
      throw new ApiError(res.status, {
        code: (d && d.code) || 'LOAD_FAILED',
        message: (d && d.message) || "Couldn't load your females from Cltch.",
      });
    }
    return data;
  })();

  const [females, mock] = await Promise.all([femalesReq, getFemales().catch(() => ({ males: [] }))]);
  const policy = females.readinessPolicy || {};
  return {
    females: (females.data || []).map((row) => adaptFemale(row, policy)),
    males: mock.males || [],
    syncedAt: 'just now',
  };
}

export function findPairings({ femaleId, goals, simulateFailure, female }) {
  return request('/api/pairings', { method: 'POST', body: JSON.stringify({ femaleId, goals, simulateFailure, female }) });
}

export function askAdvisor({ femaleId, goals, question, context, female }) {
  return request('/api/advisor', { method: 'POST', body: JSON.stringify({ femaleId, goals, question, context, female }) });
}
