import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  absorbSetCookies,
  adminRequest,
  getAdminSessionStatus,
  HackerRankAdminError,
  resetAdminSessionState,
} from '../lib/hackerrank-admin/session';
import {
  buildContestAnalytics,
  contestStatus,
  normalizeContestSummary,
  RawSubmission,
  submissionCodeUrl,
} from '../lib/hackerrank-admin/analytics';
import { computeContestOutcomes, mapStudentsToParticipants, summarizeOutcomes } from '../lib/hackerrank-admin/mapping';

// ---------- analytics ----------

function testAnalytics() {
  const submissions: RawSubmission[] = [
    // alice: WA then AC castle, AC chaos twice (earliest counts)
    { id: 1, hacker_id: 1, hacker_username: 'alice', challenge: { slug: 'castle', name: 'Castle' }, status: 'Wrong Answer', in_contest_bounds: true, time_from_start: 4, language: 'cpp14', score: 0 },
    { id: 2, hacker_id: 1, hacker_username: 'alice', challenge: { slug: 'castle', name: 'Castle' }, status: 'Accepted', in_contest_bounds: true, time_from_start: 10, language: 'cpp14', score: 40 },
    { id: 3, hacker_id: 1, hacker_username: 'alice', challenge: { slug: 'chaos', name: 'Chaos' }, status: 'Accepted', in_contest_bounds: true, time_from_start: 20, language: 'python3', score: 60 },
    { id: 4, hacker_id: 1, hacker_username: 'alice', challenge: { slug: 'chaos', name: 'Chaos' }, status: 'Accepted', in_contest_bounds: true, time_from_start: 16, language: 'python3', score: 60 },
    // duplicate record across pages
    { id: 4, hacker_id: 1, hacker_username: 'alice', challenge: { slug: 'chaos', name: 'Chaos' }, status: 'Accepted', in_contest_bounds: true, time_from_start: 16, language: 'python3', score: 60 },
    // bob: only chaos, reverse order; practice submission ignored
    { id: 5, hacker_id: 2, hacker_username: 'bob', challenge: { slug: 'chaos', name: 'Chaos' }, status: 'Accepted', in_contest_bounds: true, time_from_start: 30, language: 'java8', score: 60 },
    { id: 6, hacker_id: 2, hacker_username: 'bob', challenge: { slug: 'castle', name: 'Castle' }, status: 'Accepted', in_contest_bounds: false, time_from_start: 90, language: 'java8', score: 40 },
    // carol: submitted but never solved, not on leaderboard
    { id: 7, hacker_id: 3, hacker_username: 'carol', challenge: { slug: 'castle', name: 'Castle' }, status: 'Terminated due to timeout', in_contest_bounds: true, time_from_start: 50, language: 'cpp14', score: 0 },
  ];
  const analytics = buildContestAnalytics({
    challenges: [
      { id: '10', slug: 'castle', name: 'Castle on the Grid', maxScore: 40, difficulty: 'Medium' },
      { id: '11', slug: 'chaos', name: 'New Year Chaos', maxScore: 60, difficulty: 'Medium' },
    ],
    leaderboard: [
      { hackerId: '1', username: 'alice', rank: 1, score: 100, timeTaken: 1200, country: 'India', school: null },
      { hackerId: '2', username: 'bob', rank: 2, score: 60, timeTaken: 1800, country: null, school: null },
      { hackerId: '4', username: 'dave', rank: 3, score: 0, timeTaken: null, country: null, school: null },
    ],
    submissions,
    contestStartEpoch: null,
    durationMinutes: 60,
    names: { alice: 'Alice Sharma', bob: null },
  });

  const alice = analytics.participants.find((row) => row.username === 'alice')!;
  assert.equal(alice.challenges.castle.firstAcceptedMinutes, 10, 'first accepted, not first submission');
  assert.equal(alice.challenges.castle.wrongBeforeAccept, 1);
  assert.equal(alice.challenges.castle.firstAcceptedSubmissionId, '2', 'id of the first accepted submission');
  assert.equal(alice.challenges.chaos.firstAcceptedSubmissionId, '4', 'earliest accepted (16 min), not the later one');
  assert.equal(submissionCodeUrl('https://www.hackerrank.com/contests/c1', 'castle', '2'), 'https://www.hackerrank.com/contests/c1/challenges/castle/submissions/code/2');
  assert.equal(submissionCodeUrl('https://www.hackerrank.com/contests/c1', 'id:9', '2'), null);
  assert.equal(alice.challenges.chaos.firstAcceptedMinutes, 16, 'earliest of multiple accepted');
  assert.equal(alice.challenges.chaos.attempts, 2, 'duplicate submission ids counted once');
  assert.equal(alice.solvedCount, 2);
  assert.deepEqual(alice.languages, ['cpp14', 'python3']);
  assert.equal(alice.name, 'Alice Sharma');
  assert.equal(alice.solveTimeMinutes, 16, 'time taken is the max first-accepted time (10, 16), not the sum');
  assert.equal(alice.timeTaken, 1200, 'HackerRank time kept for reference');

  const bob = analytics.participants.find((row) => row.username === 'bob')!;
  assert.equal(bob.solvedCount, 1);
  assert.equal(bob.name, null);
  assert.equal(bob.solveTimeMinutes, 30, 'only one solved question');
  assert.equal(bob.challenges.castle, undefined, 'practice submission ignored');

  const carol = analytics.participants.find((row) => row.username === 'carol')!;
  assert.equal(carol.onLeaderboard, false);
  assert.equal(carol.solvedCount, 0);
  assert.equal(carol.solveTimeMinutes, null, 'nothing solved -> no time');
  const dave = analytics.participants.find((row) => row.username === 'dave')!;
  assert.equal(dave.attempts, 0);

  assert.equal(analytics.overview.participants, 4);
  assert.equal(analytics.overview.submitters, 3);
  assert.equal(analytics.overview.practiceSubmissions, 1);
  assert.equal(analytics.overview.totalSubmissions, 7);
  assert.equal(analytics.overview.maxPossibleScore, 100);
  assert.equal(analytics.overview.perfectScores, 1);
  assert.equal(analytics.overview.solvedAll, 1);
  assert.equal(analytics.overview.zeroScores, 1);

  const castle = analytics.challenges.find((challenge) => challenge.slug === 'castle')!;
  assert.equal(castle.attempted, 2);
  assert.equal(castle.solved, 1);
  assert.deepEqual(castle.fastestSolve, { username: 'alice', minutes: 10 });
  const chaos = analytics.challenges.find((challenge) => challenge.slug === 'chaos')!;
  assert.equal(chaos.solved, 2);
  assert.equal(chaos.medianFirstAcceptedMinutes, 23);

  assert.deepEqual(analytics.scoreDistribution, [{ score: 100, count: 1 }, { score: 60, count: 1 }, { score: 0, count: 1 }]);
  assert.equal(analytics.solveTimeline.buckets.length, 12);
  assert.equal(analytics.solveTimeline.buckets[2].counts.castle, 1);

  assert.equal(contestStatus('2026-01-01T00:00:00Z', '2026-01-01T01:00:00Z', Date.parse('2025-12-31T00:00:00Z')), 'upcoming');
  assert.equal(contestStatus('2026-01-01T00:00:00Z', '2026-01-01T01:00:00Z', Date.parse('2026-01-01T00:30:00Z')), 'live');
  assert.equal(contestStatus('2026-01-01T00:00:00Z', '2026-01-01T01:00:00Z', Date.parse('2026-01-02T00:00:00Z')), 'ended');

  const summary = normalizeContestSummary({ id: 5, name: 'X', slug: 'x', hacker_id: 9, hacker: { username: 'owner' }, epoch_starttime: 1790328600, signup_count: 3, leaderboard_total: 2 });
  assert.equal(summary?.owner, 'owner');
  assert.equal(summary?.startTime, new Date(1790328600 * 1000).toISOString());
  assert.equal(normalizeContestSummary({ name: 'no slug' }), null);
  // The admin list only has effective_epoch_endtime
  const ended = normalizeContestSummary({ id: 6, name: 'Old', slug: 'old', epoch_starttime: 1707372900, effective_epoch_endtime: 1707375600 }, Date.parse('2026-09-27T00:00:00Z'));
  assert.equal(ended?.status, 'ended');
  assert.equal(ended?.endTime, new Date(1707375600 * 1000).toISOString());
}

function testCookieJar() {
  const cookies: Record<string, string> = { keep: '1', gone: '2' };
  const headers = new Headers();
  headers.append('Set-Cookie', '_hrank_session=abc; path=/; HttpOnly');
  headers.append('Set-Cookie', 'gone=; Max-Age=0; path=/');
  assert.equal(absorbSetCookies(cookies, headers), true);
  assert.deepEqual(cookies, { keep: '1', _hrank_session: 'abc' });
}

// ---------- session / fail-safes with a mocked HackerRank ----------

type Handler = (url: URL, init: RequestInit) => Response | Promise<Response>;

function json(body: unknown, init: ResponseInit & { cookies?: string[] } = {}) {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  (init.cookies || []).forEach((cookie) => headers.append('Set-Cookie', cookie));
  return new Response(JSON.stringify(body), { status: init.status || 200, headers });
}

function cookieOf(init: RequestInit) {
  return new Headers(init.headers).get('Cookie') || '';
}

class MockHackerRank {
  logins = 0;
  validSession = 'sess-1';
  password = 'right-password';
  calls: string[] = [];
  handlers: Record<string, Handler> = {};

  fetch = async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    this.calls.push(`${init.method || 'GET'} ${url.pathname}`);
    const custom = this.handlers[url.pathname];
    if (custom) return custom(url, init);
    if (url.pathname === '/auth/login') {
      return new Response('<html><meta content="page-csrf" name="csrf-token" id="csrf-token"/></html>', {
        headers: { 'Content-Type': 'text/html', 'Set-Cookie': 'hrc_l_i=F; path=/' },
      });
    }
    if (url.pathname === '/rest/auth/login') {
      const body = JSON.parse(String(init.body));
      assert.equal(new Headers(init.headers).get('X-CSRF-Token'), 'page-csrf');
      if (body.password !== this.password) {
        return json({ status: false, errors: ['Invalid login or password. Please try again.'], internal_status_code: 'login_invalid' });
      }
      this.logins += 1;
      this.validSession = `sess-${this.logins}`;
      return json({ status: true, csrf_token: 'login-csrf' }, { cookies: [`_hrank_session=${this.validSession}; path=/`] });
    }
    const authed = cookieOf(init).includes(`_hrank_session=${this.validSession}`);
    if (url.pathname === '/rest/hackers/me') {
      return json({ status: true, model: authed ? { username: 'admin-user' } : null });
    }
    if (!authed) return new Response('Forbidden', { status: 403, headers: { 'Content-Type': 'text/html' } });
    return json({ models: [{ slug: 'c1' }], total: 1 });
  };
}

async function testSession() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-admin-test-'));
  process.env.HACKERRANK_ADMIN_SESSION_FILE = path.join(tempDir, 'session.json');
  process.env.HACKERRANK_ADMIN_BASE_URL = 'https://hr.test';
  const originalFetch = globalThis.fetch;
  const mock = new MockHackerRank();
  globalThis.fetch = mock.fetch as typeof fetch;

  try {
    // Not configured
    resetAdminSessionState();
    delete process.env.HACKERRANK_ADMIN_LOGIN;
    delete process.env.HACKERRANK_ADMIN_PASSWORD;
    delete process.env.HACKERRANK_ADMIN_SESSION_COOKIE;
    await assert.rejects(adminRequest('/rest/administration/contests'), (error: HackerRankAdminError) => error.code === 'not_configured');

    // Automatic login on first request
    process.env.HACKERRANK_ADMIN_LOGIN = 'admin@example.com';
    process.env.HACKERRANK_ADMIN_PASSWORD = 'right-password';
    resetAdminSessionState();
    const first = await adminRequest<{ total: number }>('/rest/administration/contests');
    assert.equal(first.total, 1);
    assert.equal(mock.logins, 1);
    const status = await getAdminSessionStatus();
    assert.equal(status.connected, true);
    assert.equal(status.username, 'admin-user');
    assert.equal(status.login, 'ad***@example.com');
    assert.ok(!JSON.stringify(status).includes('right-password'), 'status never exposes the password');
    assert.ok(!JSON.stringify(status).includes('sess-'), 'status never exposes cookies');

    // Persisted session is encrypted and reused after a restart (no new login)
    const stored = fs.readFileSync(process.env.HACKERRANK_ADMIN_SESSION_FILE, 'utf8');
    assert.ok(!stored.includes('sess-1') && stored.includes('aes-256-gcm'), 'session file is encrypted');
    resetAdminSessionState();
    await adminRequest('/rest/administration/contests');
    assert.equal(mock.logins, 1, 'reused persisted session');

    // Session expires server-side -> transparent re-login + retry
    mock.validSession = 'expired-on-server';
    const afterExpiry = await adminRequest<{ total: number }>('/rest/administration/contests');
    assert.equal(afterExpiry.total, 1);
    assert.equal(mock.logins, 2, 're-logged in once');

    // Logged in but not allowed -> forbidden, no re-login loop
    mock.handlers['/rest/contests/other/judge_submissions/'] = () => new Response('no', { status: 403 });
    await assert.rejects(adminRequest('/rest/contests/other/judge_submissions/'), (error: HackerRankAdminError) => error.code === 'forbidden' && error.message.includes('admin-user'));
    assert.equal(mock.logins, 2, 'no login attempted for a permission error');
    delete mock.handlers['/rest/contests/other/judge_submissions/'];

    // 429 is retried once
    let limited = 0;
    mock.handlers['/rest/limited'] = () => (limited++ === 0
      ? new Response('slow down', { status: 429, headers: { 'Retry-After': '0' } })
      : json({ ok: true }));
    assert.deepEqual(await adminRequest('/rest/limited'), { ok: true });

    // 5xx is retried once, then surfaces
    mock.handlers['/rest/broken'] = () => new Response('boom', { status: 500 });
    await assert.rejects(adminRequest('/rest/broken'), (error: HackerRankAdminError) => error.code === 'upstream');

    // Malformed JSON
    mock.handlers['/rest/garbage'] = () => new Response('{not json', { headers: { 'Content-Type': 'application/json' } });
    await assert.rejects(adminRequest('/rest/garbage'), (error: HackerRankAdminError) => error.code === 'malformed');

    // Wrong password -> invalid_credentials, then cooldown (no second login POST)
    process.env.HACKERRANK_ADMIN_PASSWORD = 'wrong-password';
    resetAdminSessionState();
    await assert.rejects(adminRequest('/rest/administration/contests'), (error: HackerRankAdminError) => error.code === 'invalid_credentials');
    const loginPosts = mock.calls.filter((call) => call === 'POST /rest/auth/login').length;
    await assert.rejects(adminRequest('/rest/administration/contests'), (error: HackerRankAdminError) => error.code === 'invalid_credentials');
    assert.equal(mock.calls.filter((call) => call === 'POST /rest/auth/login').length, loginPosts, 'cooldown prevents hammering');
    const failedStatus = await getAdminSessionStatus();
    assert.equal(failedStatus.lastError?.code, 'invalid_credentials');
    assert.ok(!JSON.stringify(failedStatus).includes('wrong-password'));

    // Fixing the password in env lifts the cooldown immediately
    process.env.HACKERRANK_ADMIN_PASSWORD = 'right-password';
    assert.equal((await adminRequest<{ total: number }>('/rest/administration/contests')).total, 1);

    // Manual cookie only, expired -> clear session_expired error
    delete process.env.HACKERRANK_ADMIN_LOGIN;
    delete process.env.HACKERRANK_ADMIN_PASSWORD;
    process.env.HACKERRANK_ADMIN_SESSION_COOKIE = "'_hrank_session=stale'";
    resetAdminSessionState();
    await assert.rejects(adminRequest('/rest/administration/contests'), (error: HackerRankAdminError) => error.code === 'session_expired');

    // Network failure is retried once, then reported without leaking anything
    process.env.HACKERRANK_ADMIN_LOGIN = 'admin@example.com';
    process.env.HACKERRANK_ADMIN_PASSWORD = 'right-password';
    delete process.env.HACKERRANK_ADMIN_SESSION_COOKIE;
    resetAdminSessionState();
    globalThis.fetch = (async () => { throw new TypeError('fetch failed'); }) as typeof fetch;
    await assert.rejects(adminRequest('/rest/administration/contests'), (error: HackerRankAdminError) => error.code === 'network');
  } finally {
    globalThis.fetch = originalFetch;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// ---------- stateless (Vercel) mode: no disk, no database ----------

async function testStatelessDeployment() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-admin-stateless-'));
  const sessionFile = path.join(tempDir, 'session.json');
  process.env.HACKERRANK_ADMIN_SESSION_FILE = sessionFile;
  process.env.HACKERRANK_ADMIN_BASE_URL = 'https://hr.test';
  process.env.HACKERRANK_ADMIN_LOGIN = 'admin@example.com';
  process.env.HACKERRANK_ADMIN_PASSWORD = 'right-password';
  delete process.env.HACKERRANK_ADMIN_SESSION_COOKIE;
  process.env.VERCEL = '1';
  const originalFetch = globalThis.fetch;
  const mock = new MockHackerRank();
  globalThis.fetch = mock.fetch as typeof fetch;

  try {
    resetAdminSessionState();
    const { getAdminContests } = await import('../lib/hackerrank-admin/contests');

    // Fetches live, every call (no snapshot cache), and never writes the session to disk
    const first = await getAdminContests();
    assert.equal(first.error, null);
    assert.deepEqual(first.data?.contests.map((contest) => contest.slug), ['c1']);
    assert.equal(first.fromCache, false);
    const contestCalls = () => mock.calls.filter((call) => call === 'GET /rest/administration/contests').length;
    const before = contestCalls();
    await getAdminContests();
    assert.equal(contestCalls(), before + 1, 'no snapshot cache: every call hits HackerRank');
    assert.equal(mock.logins, 1, 'in-memory session reused within the instance');
    assert.equal(fs.existsSync(sessionFile), false, 'session is never written to disk');
    assert.equal((await getAdminSessionStatus()).connected, true);

    // Failures return the error without stale data
    globalThis.fetch = (async () => { throw new TypeError('fetch failed'); }) as typeof fetch;
    const failed = await getAdminContests();
    assert.equal(failed.data, null);
    assert.equal(failed.stale, false);
    assert.equal(failed.error?.code, 'network');

    assert.ok(
      !Object.keys(require.cache).some((file) => /[\\/]lib[\\/]prisma\.ts$/.test(file) || file.includes(`${path.sep}.prisma${path.sep}client`)),
      'Prisma is never loaded in stateless mode',
    );
  } finally {
    delete process.env.VERCEL;
    globalThis.fetch = originalFetch;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function testMapping() {
  const participants = [
    { username: 'Sagar_G', name: 'SAGAR GUPTA', score: 100 },
    { username: 'riya1', name: 'Riya Sen', score: 60 },
    { username: 'riya2', name: 'riya sen', score: 40 },
    { username: 'bob_x', name: 'Bob Das', score: 40 },
    { username: 'amit', name: 'Amit Roy', score: 20 },
    { username: 'neha', name: 'Neha Jain', score: 80 },
    { username: 'kiran', name: 'Kiran Rao', score: 0 },
  ];
  const students = [
    { id: 's-name', fullName: '  sagar   Gupta ', hackerRankUsername: null, hackerRankMatchType: null },
    { id: 's-user', fullName: 'Totally Different', hackerRankUsername: 'BOB_X', hackerRankMatchType: null },
    { id: 's-manual', fullName: 'Someone', hackerRankUsername: 'neha', hackerRankMatchType: 'manual' },
    { id: 's-dup-participants', fullName: 'Riya Sen', hackerRankUsername: null, hackerRankMatchType: null },
    { id: 's-dup-a', fullName: 'Amit Roy', hackerRankUsername: null, hackerRankMatchType: null },
    { id: 's-dup-b', fullName: 'amit roy', hackerRankUsername: null, hackerRankMatchType: null },
    { id: 's-claimed', fullName: 'Bob Das', hackerRankUsername: null, hackerRankMatchType: null },
    { id: 's-unlinked', fullName: 'Kiran Rao', hackerRankUsername: null, hackerRankMatchType: 'unlinked' },
    { id: 's-absent', fullName: 'Gone Person', hackerRankUsername: 'not_here', hackerRankMatchType: 'username' },
    { id: 's-none', fullName: 'No Account', hackerRankUsername: null, hackerRankMatchType: null },
  ];
  const { matches } = mapStudentsToParticipants(students, participants);
  assert.deepEqual(matches.get('s-name'), { status: 'matched', username: 'Sagar_G', matchType: 'name' }, 'lowercase + whitespace name match');
  assert.deepEqual(matches.get('s-user'), { status: 'matched', username: 'bob_x', matchType: 'username' }, 'case-insensitive username wins over name');
  assert.deepEqual(matches.get('s-manual'), { status: 'matched', username: 'neha', matchType: 'manual' }, 'manual link kept');
  assert.deepEqual(matches.get('s-dup-participants'), { status: 'ambiguous', candidates: ['riya1', 'riya2'] }, 'two participants with the same name');
  assert.equal(matches.get('s-dup-a')?.status, 'ambiguous', 'two students with the same name');
  assert.equal(matches.get('s-dup-b')?.status, 'ambiguous');
  assert.deepEqual(matches.get('s-claimed'), { status: 'not_found', reason: 'no_account' }, 'participant already claimed by username is not name-matched');
  assert.deepEqual(matches.get('s-unlinked'), { status: 'not_found', reason: 'unlinked' }, 'manually unlinked students are never auto-matched');
  assert.deepEqual(matches.get('s-absent'), { status: 'not_found', reason: 'not_in_contest' });
  assert.deepEqual(matches.get('s-none'), { status: 'not_found', reason: 'no_account' });

  const { outcomes } = computeContestOutcomes({
    students,
    participants,
    passScore: 60,
    overrides: { 's-user': 'pass', 's-absent': 'fail' },
  });
  const byId = Object.fromEntries(outcomes.map((outcome) => [outcome.studentId, outcome]));
  assert.equal(byId['s-name'].result, 'pass', '100 >= 60');
  assert.equal(byId['s-manual'].result, 'pass', '80 >= 60');
  assert.equal(byId['s-user'].autoResult, 'fail', '40 < 60');
  assert.equal(byId['s-user'].result, 'pass', 'manual override wins');
  assert.equal(byId['s-user'].resultSource, 'manual');
  assert.equal(byId['s-none'].result, 'absent');
  assert.equal(byId['s-absent'].result, 'fail', 'override also works for absent students');
  assert.equal(byId['s-dup-a'].result, null, 'ambiguous students have no result until mapped');
  assert.deepEqual(summarizeOutcomes(outcomes), { pass: 3, fail: 1, absent: 3, ambiguous: 3, manual: 2, matched: 3 });

  const exact = computeContestOutcomes({ students: [students[0]], participants: [{ ...participants[0], score: 60 }], passScore: 60, overrides: {} });
  assert.equal(exact.outcomes[0].result, 'pass', 'score equal to cutoff passes');
  const noCutoff = computeContestOutcomes({ students: [students[0]], participants, passScore: null, overrides: {} });
  assert.equal(noCutoff.outcomes[0].result, null, 'no cutoff -> no automatic pass/fail');
}

testAnalytics();
testCookieJar();
testMapping();
testSession().then(testStatelessDeployment).then(() => {
  console.log('HackerRank admin (contests tab) tests passed.');
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
