// Client-side API helpers — the single place to point the UI at a real backend.

import { API_URL, authHeader, clearSession } from './auth';
import { adaptFemale } from './cltch';

const CLTCH_TIMEOUT_MS = 30000;

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

// Same list params on every call so the API reuses one cached Cltch list (its cache key).
// include_details=false: cards and filters both come from Cltch list rows, so they always agree.
const FEMALES_LIST_PARAMS = {
  take: '200',
  max_pages: '5',
  include_details: 'false',
  include_morph_records: 'true',
};
export const FEMALES_PAGE_SIZE = 6;
const FEMALES_CACHE_TTL_MS = 3 * 60 * 1000; // matches the API's CLTCH_CACHE_TTL_SECONDS
const femalesCache = new Map(); // query string -> { at, promise }

async function cltchGet(path, params, { timeoutMs = CLTCH_TIMEOUT_MS, fallbackMessage = "Couldn't load your females from Cltch." } = {}) {
  const query = new URLSearchParams(params);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`${API_URL}${path}?${query.toString()}`, {
      headers: { Accept: 'application/json', ...authHeader() },
      signal: controller.signal,
    });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new ApiError(0, { code: 'TIMEOUT', message: `Cltch took too long to respond for ${path}.` });
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
      message: (d && d.message) || fallbackMessage,
    });
  }
  return data;
}

function femalesPageParams({ page = 1, pageSize = FEMALES_PAGE_SIZE, q = '', ready = 'all' }) {
  const params = { ...FEMALES_LIST_PARAMS, page: String(page), page_size: String(pageSize), ready };
  if (q) params.q = q;
  return params;
}

/**
 * One page of females from GET /api/cltch/females (server-side paging, filters and search).
 * Pages are cached for a few minutes and concurrent requests for the same page share one fetch,
 * so going back, or clicking Next after a prefetch, makes no request.
 * `refresh: true` drops the client cache and asks the API to refetch from Cltch.
 */
export function getFemalesPage({ refresh = false, ...args } = {}) {
  const params = femalesPageParams(args);
  const key = new URLSearchParams(params).toString();
  if (refresh) femalesCache.clear();
  const hit = femalesCache.get(key);
  if (hit && Date.now() - hit.at < FEMALES_CACHE_TTL_MS) return hit.promise;

  const promise = cltchGet('/api/cltch/females', refresh ? { ...params, refresh: 'true' } : params).then((data) => {
    const policy = data.readinessPolicy || {};
    const paging = data.paging || {};
    return {
      females: (data.data || []).map((row) => adaptFemale(row, policy)),
      page: paging.page || 1,
      totalPages: paging.totalPages || 1,
      hasNext: Boolean(paging.hasNext),
      pageSize: paging.pageSize || FEMALES_PAGE_SIZE,
      total: data.totalMatched || 0,
      totalInCollection: data.totalInCollection || 0,
      counts: data.counts || { all: 0, ready: 0, notReady: 0 },
    };
  });
  femalesCache.set(key, { at: Date.now(), promise });
  promise.catch(() => femalesCache.delete(key));
  return promise;
}

/** Warm the cache for a page the user is likely to open next. Errors are ignored. */
export function prefetchFemalesPage(args) {
  getFemalesPage(args).catch(() => {});
}

/** A single female by id (deep links; she may not be on any loaded page). */
export async function getFemale(id) {
  const { take, max_pages, include_details, include_morph_records } = FEMALES_LIST_PARAMS;
  const data = await cltchGet(`/api/cltch/females/${encodeURIComponent(id)}`, { take, max_pages, include_details, include_morph_records });
  return adaptFemale(data.data, data.readinessPolicy || {});
}

/** Sample males from the Next mock route (no males endpoint yet). Females load page by page via getFemalesPage. */
export async function getCollection() {
  const mock = await getFemales().catch(() => ({ males: [] }));
  return { males: mock.males || [], syncedAt: 'just now' };
}

/**
 * Ranked male candidates for a female: GET /api/cltch/females/{id}/males.
 * The API checks a shortlist window (limit) per call; use paging.nextOffset to check more.
 * limit 0 only warms the API's caches (used when a female is selected).
 */
export async function getMaleCandidates(femaleId, { offset = 0, limit = 10, refresh = false } = {}) {
  const params = {
    pedigree_depth: '2',
    include_pairing_warnings: 'true',
    limit: String(limit),
    offset: String(offset),
  };
  if (refresh) params.refresh = 'true';
  return cltchGet(`/api/cltch/females/${encodeURIComponent(femaleId)}/males`, params, {
    timeoutMs: 45000,
    fallbackMessage: "Couldn't load male candidates from Cltch.",
  });
}

const offspringCache = new Map(); // "female:male" -> promise (per page load)

/** Possible offspring for one pair: GET /api/cltch/females/{femaleId}/males/{maleId}/offspring. */
export function getOffspring(femaleId, maleId, { refresh = false } = {}) {
  const key = `${femaleId}:${maleId}`;
  if (!refresh && offspringCache.has(key)) return offspringCache.get(key);
  const promise = cltchGet(
    `/api/cltch/females/${encodeURIComponent(femaleId)}/males/${encodeURIComponent(maleId)}/offspring`,
    refresh ? { refresh: 'true' } : {},
    { timeoutMs: 30000, fallbackMessage: "Couldn't load possible offspring from Cltch." },
  );
  offspringCache.set(key, promise);
  promise.catch(() => offspringCache.delete(key));
  return promise;
}

export function findPairings({ femaleId, goals, simulateFailure, female }) {
  return request('/api/pairings', { method: 'POST', body: JSON.stringify({ femaleId, goals, simulateFailure, female }) });
}

export function askAdvisor({ femaleId, goals, question, context, female }) {
  return request('/api/advisor', { method: 'POST', body: JSON.stringify({ femaleId, goals, question, context, female }) });
}
