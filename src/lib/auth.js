'use client';

// Sign-in against the FastAPI backend (POST /api/auth/login → Supabase password grant).
// PoC: the session is kept in localStorage. For production prefer an httpOnly cookie set by the API.

import { useSyncExternalStore } from 'react';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

const KEY = 'kinova.session';
const EVENT = 'kinova:session';

export class AuthError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// FastAPI errors arrive as {detail: {code, message}} (HTTPException) or {detail: [...]} (validation).
function errorFrom(status, data) {
  const d = data && data.detail;
  if (d && typeof d === 'object' && !Array.isArray(d) && d.message) {
    const msg = /invalid login credentials/i.test(d.message) ? 'Incorrect email or password.' : d.message;
    return new AuthError(msg, d.code, status);
  }
  if (Array.isArray(d)) return new AuthError('Check your email and password and try again.', 'VALIDATION', status);
  if (data && data.error && data.error.message) return new AuthError(data.error.message, data.error.code, status);
  if (status === 401) return new AuthError('Incorrect email or password.', 'LOGIN_FAILED', status);
  return new AuthError('Sign-in failed. Please try again.', 'UNKNOWN', status);
}

export async function login(email, password) {
  let res;
  try {
    res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new AuthError(`Can't reach the sign-in service at ${API_URL}. Is the API running?`, 'NETWORK', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw errorFrom(res.status, data);
  if (!data.access_token) throw new AuthError('Sign-in failed: no session returned.', 'NO_SESSION', res.status);

  const expiresAt = data.expires_at ? data.expires_at * 1000 : Date.now() + (data.expires_in || 3600) * 1000;
  const session = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || null,
    expiresAt,
    user: { id: data.user && data.user.id, email: (data.user && data.user.email) || email },
  };
  saveSession(session);
  return session;
}

export function saveSession(session) {
  window.localStorage.setItem(KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(EVENT));
}

export function clearSession() {
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function getSession() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s.accessToken || (s.expiresAt && s.expiresAt <= Date.now())) return null;
    return s;
  } catch {
    return null;
  }
}

/** Authorization header for calls to protected API routes (e.g. GET /api/auth/me). */
export function authHeader() {
  const s = getSession();
  return s ? { Authorization: `Bearer ${s.accessToken}` } : {};
}

// --- React hook -------------------------------------------------------------
let cachedRaw;
let cachedSession = null;

function snapshot() {
  const raw = window.localStorage.getItem(KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSession = getSession();
  }
  return cachedSession;
}

function subscribe(cb) {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

/** undefined while loading (server render), null when signed out, otherwise the session. */
export function useSession() {
  return useSyncExternalStore(subscribe, snapshot, () => undefined);
}
