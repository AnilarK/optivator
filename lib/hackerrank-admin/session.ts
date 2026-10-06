import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Session manager for the separate HackerRank *administrator* account used by the
 * Contests tab. It is intentionally independent from the student-sync integration
 * (HACKERRANK_SESSION_COOKIE / HACKERRANK_CSRF_TOKEN) and uses its own env variables.
 *
 * Fail-safes:
 * - logs in with HACKERRANK_ADMIN_LOGIN / HACKERRANK_ADMIN_PASSWORD when no valid session exists
 * - transparently re-logs in once when a request comes back 401/403/redirect/login page
 * - distinguishes "session expired" from "logged in but not allowed" via /rest/hackers/me
 * - single-flight login (concurrent requests share one login attempt)
 * - cooldown after failed logins so a wrong password never hammers HackerRank
 * - retries once on 429 (honouring a short Retry-After) and on 5xx / network errors
 * - request timeouts
 * - persists the session (AES-256-GCM encrypted when a password is configured) so restarts
 *   do not force a new login; the file is git-ignored and never sent to the browser
 * - secrets are never logged or included in error messages
 */

export type HackerRankAdminErrorCode =
  | 'not_configured'
  | 'invalid_credentials'
  | 'login_blocked'
  | 'session_expired'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'network'
  | 'upstream'
  | 'malformed';

export class HackerRankAdminError extends Error {
  constructor(public code: HackerRankAdminErrorCode, message: string, public status?: number) {
    super(message);
    this.name = 'HackerRankAdminError';
  }
}

interface StoredSession {
  cookies: Record<string, string>;
  csrfToken: string | null;
  username: string | null;
  obtainedAt: string;
  source: 'login' | 'manual';
  fingerprint: string;
}

interface LoginFailure {
  fingerprint: string;
  at: number;
  error: HackerRankAdminError;
}

interface SessionState {
  session: StoredSession | null;
  loaded: boolean;
  pendingLogin: Promise<StoredSession> | null;
  lastLoginFailure: LoginFailure | null;
  lastError: { code: HackerRankAdminErrorCode; message: string; at: string } | null;
}

const REQUEST_TIMEOUT_MS = 20_000;
const INVALID_CREDENTIALS_COOLDOWN_MS = 10 * 60 * 1000;
const OTHER_LOGIN_FAILURE_COOLDOWN_MS = 30 * 1000;
const MAX_RETRY_AFTER_SECONDS = 10;
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const sessionFile = () =>
  process.env.HACKERRANK_ADMIN_SESSION_FILE || path.join(process.cwd(), 'data', 'hackerrank-admin-session.json');

// Survive Next.js dev hot reloads.
const globalState = globalThis as unknown as { __hackerRankAdminSession?: SessionState };
const state: SessionState = globalState.__hackerRankAdminSession ??= {
  session: null,
  loaded: false,
  pendingLogin: null,
  lastLoginFailure: null,
  lastError: null,
};

function cleanEnv(value: string | undefined, headerName?: string): string {
  let cleaned = (value || '').trim();
  if (/^(['"])[\s\S]*\1$/.test(cleaned)) cleaned = cleaned.slice(1, -1).trim();
  if (headerName) {
    const prefix = `${headerName.toLowerCase()}:`;
    if (cleaned.toLowerCase().startsWith(prefix)) cleaned = cleaned.slice(prefix.length).trim();
  }
  return cleaned.replace(/[\r\n]+/g, ' ').trim();
}

/**
 * Next.js expands `$NAME` inside .env values (even single-quoted), which silently corrupts passwords
 * containing `$`. HACKERRANK_ADMIN_PASSWORD_BASE64 avoids that entirely; otherwise escape `$` as `\$`.
 */
function adminPassword(): string {
  const encoded = cleanEnv(process.env.HACKERRANK_ADMIN_PASSWORD_BASE64);
  if (encoded) {
    try {
      return Buffer.from(encoded, 'base64').toString('utf8').replace(/[\r\n]+$/, '');
    } catch {
      return '';
    }
  }
  return (process.env.HACKERRANK_ADMIN_PASSWORD || '').replace(/[\r\n]+$/, '');
}

export function getAdminConfig() {
  return {
    baseUrl: (cleanEnv(process.env.HACKERRANK_ADMIN_BASE_URL) || 'https://www.hackerrank.com').replace(/\/$/, ''),
    login: cleanEnv(process.env.HACKERRANK_ADMIN_LOGIN),
    password: adminPassword(),
    manualCookie: cleanEnv(process.env.HACKERRANK_ADMIN_SESSION_COOKIE, 'Cookie'),
    manualCsrfToken: cleanEnv(process.env.HACKERRANK_ADMIN_CSRF_TOKEN, 'X-CSRF-Token'),
    userAgent: cleanEnv(process.env.HACKERRANK_ADMIN_USER_AGENT) || DEFAULT_USER_AGENT,
  };
}

type AdminConfig = ReturnType<typeof getAdminConfig>;

function hasCredentials(config: AdminConfig) {
  return Boolean(config.login && config.password);
}

/** Changes whenever the configured credentials/cookie change, invalidating stored sessions and cooldowns. */
function configFingerprint(config: AdminConfig): string {
  return crypto
    .createHash('sha256')
    .update([config.baseUrl, config.login, config.password, config.manualCookie].join('\u0000'))
    .digest('hex');
}

function recordError(error: HackerRankAdminError) {
  state.lastError = { code: error.code, message: error.message, at: new Date().toISOString() };
}

// ---------- cookie jar ----------

export function parseCookieHeader(header: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  header.split(';').forEach((part) => {
    const index = part.indexOf('=');
    if (index <= 0) return;
    const name = part.slice(0, index).trim();
    if (name) cookies[name] = part.slice(index + 1).trim();
  });
  return cookies;
}

export function serializeCookies(cookies: Record<string, string>): string {
  return Object.entries(cookies).map(([name, value]) => `${name}=${value}`).join('; ');
}

function getSetCookies(headers: Headers): string[] {
  const withGetter = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof withGetter.getSetCookie === 'function') return withGetter.getSetCookie();
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

/** Applies Set-Cookie headers to a cookie map, honouring deletions. Returns true when anything changed. */
export function absorbSetCookies(cookies: Record<string, string>, headers: Headers): boolean {
  let changed = false;
  getSetCookies(headers).forEach((line) => {
    const [pair, ...attributes] = line.split(';');
    const index = pair.indexOf('=');
    if (index <= 0) return;
    const name = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    const attrs = attributes.map((attribute) => attribute.trim().toLowerCase());
    const maxAge = attrs.find((attribute) => attribute.startsWith('max-age='));
    const expires = attrs.find((attribute) => attribute.startsWith('expires='));
    const deleted =
      !value ||
      value === 'deleted' ||
      (maxAge !== undefined && Number(maxAge.split('=')[1]) <= 0) ||
      (expires !== undefined && Date.parse(expires.slice('expires='.length)) < Date.now());
    if (deleted) {
      if (name in cookies) {
        delete cookies[name];
        changed = true;
      }
    } else if (cookies[name] !== value) {
      cookies[name] = value;
      changed = true;
    }
  });
  return changed;
}

// ---------- persistence ----------

function encryptionKey(config: AdminConfig): Buffer | null {
  if (!config.password) return null;
  return crypto.scryptSync(config.password, `hackerrank-admin:${config.login}`, 32);
}

async function saveSession(session: StoredSession | null, config: AdminConfig) {
  try {
    if (!session) {
      await fs.rm(sessionFile(), { force: true });
      return;
    }
    const plaintext = Buffer.from(JSON.stringify(session), 'utf8');
    const key = encryptionKey(config);
    let payload: object;
    if (key) {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const data = Buffer.concat([cipher.update(plaintext), cipher.final()]);
      payload = {
        v: 1,
        enc: 'aes-256-gcm',
        iv: iv.toString('base64'),
        tag: cipher.getAuthTag().toString('base64'),
        data: data.toString('base64'),
      };
    } else {
      // Manual-cookie-only mode: nothing to derive a key from; the cookie already lives in .env.
      payload = { v: 1, enc: 'none', session };
    }
    await fs.mkdir(path.dirname(sessionFile()), { recursive: true });
    await fs.writeFile(sessionFile(), JSON.stringify(payload), { mode: 0o600 });
  } catch {
    // Persistence is an optimisation; an in-memory session still works.
  }
}

async function loadSession(config: AdminConfig): Promise<StoredSession | null> {
  try {
    const payload = JSON.parse(await fs.readFile(sessionFile(), 'utf8'));
    let session: StoredSession | null = null;
    if (payload?.enc === 'aes-256-gcm') {
      const key = encryptionKey(config);
      if (!key) return null;
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'base64'));
      decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
      const plaintext = Buffer.concat([decipher.update(Buffer.from(payload.data, 'base64')), decipher.final()]);
      session = JSON.parse(plaintext.toString('utf8'));
    } else if (payload?.enc === 'none') {
      session = payload.session;
    }
    if (!session || session.fingerprint !== configFingerprint(config) || typeof session.cookies !== 'object') {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

// ---------- low-level HTTP ----------

function baseHeaders(config: AdminConfig, referer?: string): Headers {
  return new Headers({
    Accept: 'application/json',
    'User-Agent': config.userAgent,
    'X-Requested-With': 'XMLHttpRequest',
    Referer: referer || `${config.baseUrl}/administration/contests`,
  });
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store', redirect: 'manual' });
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    throw new HackerRankAdminError(
      'network',
      aborted ? 'HackerRank did not respond in time. Try again shortly.' : 'Could not reach HackerRank. Check the network connection.',
    );
  } finally {
    clearTimeout(timer);
  }
}

function isAuthFailure(response: Response): boolean {
  if (response.status === 401 || response.status === 403) return true;
  if (response.status >= 300 && response.status < 400) return true;
  return (response.headers.get('content-type') || '').includes('text/html');
}

function extractMetaCsrf(html: string): string | null {
  const match =
    html.match(/<meta[^>]*content="([^"]+)"[^>]*name="csrf-token"/i) ||
    html.match(/<meta[^>]*name="csrf-token"[^>]*content="([^"]+)"/i);
  return match ? match[1] : null;
}

async function readJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new HackerRankAdminError('malformed', 'HackerRank returned an invalid JSON response.');
  }
}

async function whoAmI(config: AdminConfig, session: StoredSession): Promise<string | null> {
  const headers = baseHeaders(config);
  headers.set('Cookie', serializeCookies(session.cookies));
  if (session.csrfToken) headers.set('X-CSRF-Token', session.csrfToken);
  const response = await fetchWithTimeout(`${config.baseUrl}/rest/hackers/me`, { headers });
  absorbSetCookies(session.cookies, response.headers);
  if (!response.ok || isAuthFailure(response)) return null;
  const body = await readJson<{ model?: { username?: string } | null }>(response).catch(() => null);
  return body?.model?.username || null;
}

// ---------- login ----------

async function performLogin(config: AdminConfig): Promise<StoredSession> {
  const fingerprint = configFingerprint(config);
  const cookies: Record<string, string> = {};

  // 1. Load the login page for initial cookies + CSRF token.
  const pageResponse = await fetchWithTimeout(`${config.baseUrl}/auth/login`, {
    headers: new Headers({ 'User-Agent': config.userAgent, Accept: 'text/html' }),
  });
  absorbSetCookies(cookies, pageResponse.headers);
  if (pageResponse.status === 429) {
    throw new HackerRankAdminError('rate_limited', 'HackerRank is rate limiting logins. Wait a few minutes and try again.', 429);
  }
  const pageCsrf = pageResponse.ok ? extractMetaCsrf(await pageResponse.text()) : null;

  // 2. Submit credentials.
  const headers = baseHeaders(config, `${config.baseUrl}/auth/login`);
  headers.set('Content-Type', 'application/json');
  headers.set('Origin', config.baseUrl);
  if (Object.keys(cookies).length) headers.set('Cookie', serializeCookies(cookies));
  if (pageCsrf) headers.set('X-CSRF-Token', pageCsrf);
  const loginResponse = await fetchWithTimeout(`${config.baseUrl}/rest/auth/login`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ login: config.login, password: config.password, remember_me: true, fallback: true }),
  });
  absorbSetCookies(cookies, loginResponse.headers);
  if (loginResponse.status === 429) {
    throw new HackerRankAdminError('rate_limited', 'HackerRank is rate limiting logins. Wait a few minutes and try again.', 429);
  }
  if (!loginResponse.ok) {
    throw new HackerRankAdminError('upstream', `HackerRank login failed with status ${loginResponse.status}.`, loginResponse.status);
  }
  const body = await readJson<{
    status?: boolean;
    errors?: unknown;
    internal_status_code?: string;
    csrf_token?: string;
  }>(loginResponse);

  if (!body.status) {
    const reason = Array.isArray(body.errors) && typeof body.errors[0] === 'string' ? body.errors[0] : '';
    const code = (body.internal_status_code || '').toLowerCase();
    const text = `${reason} ${code}`.toLowerCase();
    if (code === 'login_invalid' || /invalid login|password/.test(text)) {
      throw new HackerRankAdminError(
        'invalid_credentials',
        'HackerRank rejected HACKERRANK_ADMIN_LOGIN / HACKERRANK_ADMIN_PASSWORD. Fix them in .env; automatic login is paused until they change.',
      );
    }
    if (/captcha|verif|otp|two.?factor|2fa|locked|blocked|suspend/.test(text)) {
      throw new HackerRankAdminError(
        'login_blocked',
        `HackerRank needs extra verification for this login${reason ? ` ("${reason}")` : ''}. Log in once in a browser, then paste that session into HACKERRANK_ADMIN_SESSION_COOKIE as a fallback.`,
      );
    }
    throw new HackerRankAdminError('upstream', `HackerRank login was not accepted${reason ? `: ${reason}` : '.'}`);
  }

  const session: StoredSession = {
    cookies,
    csrfToken: body.csrf_token || pageCsrf,
    username: null,
    obtainedAt: new Date().toISOString(),
    source: 'login',
    fingerprint,
  };

  // 3. Verify the session really is authenticated.
  session.username = await whoAmI(config, session);
  if (!session.username) {
    throw new HackerRankAdminError(
      'login_blocked',
      'HackerRank accepted the login but did not create a usable session (extra verification may be required). Use HACKERRANK_ADMIN_SESSION_COOKIE as a fallback.',
    );
  }
  return session;
}

async function login(config: AdminConfig, { force = false } = {}): Promise<StoredSession> {
  if (!hasCredentials(config)) {
    throw new HackerRankAdminError(
      'not_configured',
      config.manualCookie
        ? 'The HackerRank admin session in HACKERRANK_ADMIN_SESSION_COOKIE has expired, and no HACKERRANK_ADMIN_LOGIN / HACKERRANK_ADMIN_PASSWORD are set to log in again.'
        : 'Set HACKERRANK_ADMIN_LOGIN and HACKERRANK_ADMIN_PASSWORD in .env (server only), then reconnect.',
    );
  }
  const fingerprint = configFingerprint(config);
  const failure = state.lastLoginFailure;
  if (failure && failure.fingerprint === fingerprint && !force) {
    const cooldown = failure.error.code === 'invalid_credentials' ? INVALID_CREDENTIALS_COOLDOWN_MS : OTHER_LOGIN_FAILURE_COOLDOWN_MS;
    if (Date.now() - failure.at < cooldown) throw failure.error;
  }
  if (state.pendingLogin) return state.pendingLogin;

  state.pendingLogin = (async () => {
    try {
      const session = await performLogin(config);
      state.session = session;
      state.lastLoginFailure = null;
      state.lastError = null;
      await saveSession(session, config);
      return session;
    } catch (error) {
      const adminError = error instanceof HackerRankAdminError
        ? error
        : new HackerRankAdminError('upstream', 'HackerRank login failed unexpectedly.');
      state.lastLoginFailure = { fingerprint, at: Date.now(), error: adminError };
      recordError(adminError);
      throw adminError;
    } finally {
      state.pendingLogin = null;
    }
  })();
  return state.pendingLogin;
}

async function currentSession(config: AdminConfig): Promise<StoredSession> {
  const fingerprint = configFingerprint(config);
  if (state.session && state.session.fingerprint !== fingerprint) state.session = null;
  if (!state.session && !state.loaded) {
    state.loaded = true;
    state.session = await loadSession(config);
  }
  if (state.session) return state.session;

  if (config.manualCookie) {
    const manual: StoredSession = {
      cookies: parseCookieHeader(config.manualCookie),
      csrfToken: config.manualCsrfToken || null,
      username: null,
      obtainedAt: new Date().toISOString(),
      source: 'manual',
      fingerprint,
    };
    state.session = manual;
    return manual;
  }
  return login(config);
}

async function invalidateSession(config: AdminConfig) {
  state.session = null;
  state.loaded = true;
  await saveSession(null, config);
}

// ---------- public API ----------

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Authenticated GET against the HackerRank REST API with automatic re-login.
 * `pathWithQuery` is relative to the base URL, e.g. `/rest/administration/contests?offset=0&limit=50`.
 */
export async function adminRequest<T>(pathWithQuery: string, { referer }: { referer?: string } = {}): Promise<T> {
  const config = getAdminConfig();
  if (!hasCredentials(config) && !config.manualCookie) {
    const error = new HackerRankAdminError(
      'not_configured',
      'Set HACKERRANK_ADMIN_LOGIN and HACKERRANK_ADMIN_PASSWORD in .env (server only), then reconnect.',
    );
    recordError(error);
    throw error;
  }

  let reloggedIn = false;
  let retriedTransient = false;
  let session = await currentSession(config);

  // Bounded loop: at most one re-login and one transient retry.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const headers = baseHeaders(config, referer);
    headers.set('Cookie', serializeCookies(session.cookies));
    if (session.csrfToken) headers.set('X-CSRF-Token', session.csrfToken);

    let response: Response;
    try {
      response = await fetchWithTimeout(`${config.baseUrl}${pathWithQuery}`, { headers });
    } catch (error) {
      if (!retriedTransient) {
        retriedTransient = true;
        await sleep(1000);
        continue;
      }
      if (error instanceof HackerRankAdminError) recordError(error);
      throw error;
    }

    if (absorbSetCookies(session.cookies, response.headers) && session.source === 'login') {
      void saveSession(session, config);
    }

    if (response.status === 404) {
      throw new HackerRankAdminError('not_found', 'HackerRank could not find that resource.', 404);
    }

    if (isAuthFailure(response)) {
      // Is the session dead, or is this account simply not allowed to see this resource?
      const username = await whoAmI(config, session).catch(() => null);
      if (username) {
        session.username = username;
        throw new HackerRankAdminError(
          'forbidden',
          `The HackerRank account "${username}" is logged in but is not allowed to view this (it must own or moderate the contest).`,
          response.status,
        );
      }
      if (!reloggedIn && hasCredentials(config)) {
        reloggedIn = true;
        await invalidateSession(config);
        session = await login(config, { force: true });
        continue;
      }
      await invalidateSession(config);
      const error = new HackerRankAdminError(
        'session_expired',
        hasCredentials(config)
          ? 'HackerRank rejected the admin session even after logging in again.'
          : 'The HackerRank admin session has expired. Update HACKERRANK_ADMIN_SESSION_COOKIE or set HACKERRANK_ADMIN_LOGIN / HACKERRANK_ADMIN_PASSWORD for automatic login.',
        response.status,
      );
      recordError(error);
      throw error;
    }

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('Retry-After'));
      if (!retriedTransient && (!Number.isFinite(retryAfter) || retryAfter <= MAX_RETRY_AFTER_SECONDS)) {
        retriedTransient = true;
        await sleep((Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 2) * 1000);
        continue;
      }
      const error = new HackerRankAdminError('rate_limited', 'HackerRank rate limit reached. Wait a minute and refresh again.', 429);
      recordError(error);
      throw error;
    }

    if (response.status >= 500 && !retriedTransient) {
      retriedTransient = true;
      await sleep(1000);
      continue;
    }

    if (!response.ok) {
      const error = new HackerRankAdminError('upstream', `HackerRank request failed with status ${response.status}.`, response.status);
      recordError(error);
      throw error;
    }

    const data = await readJson<T>(response);
    state.lastError = null;
    return data;
  }
  throw new HackerRankAdminError('upstream', 'HackerRank request could not be completed.');
}

/** Drops any stored session and logs in again with the configured credentials. */
export async function reconnectAdminSession() {
  const config = getAdminConfig();
  await invalidateSession(config);
  state.lastLoginFailure = null;
  if (hasCredentials(config)) {
    await login(config, { force: true });
  } else {
    const session = await currentSession(config);
    session.username = await whoAmI(config, session);
    if (!session.username) {
      await invalidateSession(config);
      const error = new HackerRankAdminError('session_expired', 'The session in HACKERRANK_ADMIN_SESSION_COOKIE is not logged in.');
      recordError(error);
      throw error;
    }
    state.lastError = null;
  }
  return getAdminSessionStatus();
}

export async function clearAdminSession() {
  await invalidateSession(getAdminConfig());
  state.lastLoginFailure = null;
  state.lastError = null;
}

/** Test helper: forget all in-memory state (does not touch the session file). */
export function resetAdminSessionState() {
  Object.assign(state, { session: null, loaded: false, pendingLogin: null, lastLoginFailure: null, lastError: null });
}

/** Safe-to-expose status. Never includes cookies, tokens or passwords. */
export async function getAdminSessionStatus() {
  const config = getAdminConfig();
  if (!state.session && !state.loaded) {
    state.loaded = true;
    state.session = await loadSession(config);
  }
  const session = state.session && state.session.fingerprint === configFingerprint(config) ? state.session : null;
  return {
    credentialsConfigured: hasCredentials(config),
    manualCookieConfigured: Boolean(config.manualCookie),
    login: config.login ? config.login.replace(/^(.{2})[^@]*(@.*)?$/, (_match, start: string, domain?: string) => `${start}***${domain || ''}`) : null,
    connected: Boolean(session),
    username: session?.username || null,
    sessionSource: session?.source || null,
    sessionObtainedAt: session?.obtainedAt || null,
    lastError: state.lastError,
  };
}

export type AdminSessionStatus = Awaited<ReturnType<typeof getAdminSessionStatus>>;
