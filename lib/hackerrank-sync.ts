import prisma from '@/lib/prisma';
import {
  buildHackerRankPerformance,
  fetchAllHackerRankPages,
  HackerRankParticipant,
  HackerRankSubmission,
  matchHackerRankStudents,
} from '@/lib/hackerrank';

const DEFAULT_CONTEST_SLUG = 'optus-sde-hiring-assessment-2026';
const DEFAULT_QUESTION_SLUGS = ['castle-on-the-grid', 'new-year-chaos'];
const SYNC_ID = 'optus-sde-hiring-assessment-2026';
const profileNameCache = new Map<string, { name: string; cachedAt: number }>();
const pendingProfileNames = new Map<string, Promise<string | null>>();

interface HackerRankApiPage<T> {
  models: T[];
  total: number;
}

interface LeaderboardModel {
  hacker_id: number | string;
  hacker: string;
  rank?: number;
  score?: number;
  time_taken?: number;
}

interface ProfileResponse {
  model?: { name?: string | null };
}

function positiveInteger(value: string | undefined, fallback: number, maximum = 500): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

function getConfiguration() {
  const questionSlugs = (process.env.HACKERRANK_QUESTION_SLUGS || DEFAULT_QUESTION_SLUGS.join(','))
    .split(',')
    .map((slug) => slug.trim())
    .filter(Boolean);
  const contestStart = process.env.HACKERRANK_CONTEST_START_AT;
  const contestStartAt = contestStart && /(?:Z|[+-]\d{2}:\d{2})$/i.test(contestStart)
    ? Date.parse(contestStart) / 1000
    : undefined;

  return {
    baseUrl: (process.env.HACKERRANK_BASE_URL || 'https://www.hackerrank.com').replace(/\/$/, ''),
    contestSlug: process.env.HACKERRANK_CONTEST_SLUG || DEFAULT_CONTEST_SLUG,
    questionSlugs,
    leaderboardPageSize: positiveInteger(process.env.HACKERRANK_LEADERBOARD_PAGE_SIZE, 100),
    submissionsPageSize: positiveInteger(process.env.HACKERRANK_SUBMISSIONS_PAGE_SIZE, 100),
    maxPages: positiveInteger(process.env.HACKERRANK_MAX_PAGES, 1000, 10000),
    contestStartAt: Number.isFinite(contestStartAt) ? contestStartAt : undefined,
  };
}

function cleanHeaderValue(value: string | undefined, headerName: string): string {
  let cleaned = (value || '').trim();
  // Tolerate values pasted with surrounding quotes or with the header name still attached.
  if (/^(['"])[\s\S]*\1$/.test(cleaned)) cleaned = cleaned.slice(1, -1).trim();
  const prefix = `${headerName.toLowerCase()}:`;
  if (cleaned.toLowerCase().startsWith(prefix)) cleaned = cleaned.slice(prefix.length).trim();
  return cleaned.replace(/[\r\n]+/g, ' ').trim();
}

export function getHackerRankAuth() {
  return {
    cookie: cleanHeaderValue(process.env.HACKERRANK_SESSION_COOKIE, 'Cookie'),
    csrfToken: cleanHeaderValue(process.env.HACKERRANK_CSRF_TOKEN, 'X-CSRF-Token'),
  };
}

export function buildHackerRankHeaders(baseUrl: string, contestSlug: string): Headers {
  const { cookie, csrfToken } = getHackerRankAuth();
  const headers = new Headers({
    Accept: 'application/json',
    'User-Agent': process.env.HACKERRANK_USER_AGENT?.trim() ||
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
    Referer: `${baseUrl}/contests/${encodeURIComponent(contestSlug)}/judge/submissions`,
    'X-Requested-With': 'XMLHttpRequest',
  });
  if (cookie) headers.set('Cookie', cookie);
  if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
  return headers;
}

const SESSION_HELP = 'Copy fresh HACKERRANK_SESSION_COOKIE / HACKERRANK_CSRF_TOKEN values from a logged-in browser into .env, then retry.';

async function requestHackerRank<T>(url: string): Promise<T> {
  const { baseUrl, contestSlug } = getConfiguration();
  const headers = buildHackerRankHeaders(baseUrl, contestSlug);

  let response: Response;
  try {
    response = await fetch(url, { headers, cache: 'no-store', redirect: 'manual' });
  } catch {
    throw new Error('Could not reach HackerRank. Check the network connection and HACKERRANK_BASE_URL.');
  }
  if (response.status === 401 || response.status === 403) {
    if (!headers.has('Cookie')) {
      throw new Error('HackerRank requires an authenticated session. Set HACKERRANK_SESSION_COOKIE in the server .env and restart the app.');
    }
    throw new Error(`HackerRank rejected the session (401/403). It may have expired, or the account may not be a moderator of this contest. ${SESSION_HELP}`);
  }
  if (response.status >= 300 && response.status < 400) {
    throw new Error(`HackerRank redirected the request, which usually means the session expired. ${SESSION_HELP}`);
  }
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    throw new Error(`HackerRank rate limit reached${retryAfter ? `; retry after ${retryAfter}` : ''}.`);
  }
  if (!response.ok) {
    throw new Error(`HackerRank API request failed with status ${response.status}.`);
  }
  if ((response.headers.get('Content-Type') || '').includes('text/html')) {
    throw new Error(`HackerRank returned a web page instead of data, which usually means the session expired. ${SESSION_HELP}`);
  }
  try {
    return await response.json() as T;
  } catch {
    throw new Error('HackerRank returned an invalid JSON response.');
  }
}

async function fetchAllContestPages<T>(
  path: string,
  pageSize: number,
  maxPages: number,
  idSelector: (record: T) => string | number | null | undefined,
): Promise<T[]> {
  return fetchAllHackerRankPages(async (offset, limit) => {
    const url = new URL(path);
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('limit', String(limit));
    const page = await requestHackerRank<HackerRankApiPage<T>>(url.toString());
    return page;
  }, pageSize, idSelector, maxPages);
}

async function fetchProfileName(baseUrl: string, username: string): Promise<string | null> {
  const cacheKey = username.trim().toLocaleLowerCase();
  const cached = profileNameCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < 15 * 60 * 1000) return cached.name;
  const pending = pendingProfileNames.get(cacheKey);
  if (pending) return pending;

  const request = (async () => {
  try {
    const response = await requestHackerRank<ProfileResponse>(
      `${baseUrl}/rest/contests/master/hackers/${encodeURIComponent(username)}/profile`,
    );
    const name = response.model?.name?.trim() || null;
    if (name) profileNameCache.set(cacheKey, { name, cachedAt: Date.now() });
    return name;
  } catch {
    return null;
  }
  })();
  pendingProfileNames.set(cacheKey, request);
  try {
    return await request;
  } finally {
    pendingProfileNames.delete(cacheKey);
  }
}

async function enrichParticipantNames(
  participants: HackerRankParticipant[],
  baseUrl: string,
): Promise<number> {
  let profileFailures = 0;
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(4, participants.length) }, async () => {
    while (nextIndex < participants.length) {
      const participant = participants[nextIndex];
      nextIndex += 1;
      participant.name = await fetchProfileName(baseUrl, participant.username);
      if (!participant.name) profileFailures += 1;
    }
  });
  await Promise.all(workers);
  return profileFailures;
}

export async function refreshHackerRankContest() {
  const config = getConfiguration();
  const contestPath = `/rest/contests/${encodeURIComponent(config.contestSlug)}`;
  const [leaderboardModels, submissions] = await Promise.all([
    fetchAllContestPages<LeaderboardModel>(
      `${config.baseUrl}${contestPath}/leaderboard?include_practice=true`,
      config.leaderboardPageSize,
      config.maxPages,
      (record) => record.hacker_id,
    ),
    fetchAllContestPages<HackerRankSubmission>(
      `${config.baseUrl}${contestPath}/judge_submissions/`,
      config.submissionsPageSize,
      config.maxPages,
      (record) => record.id,
    ),
  ]);

  const participants: HackerRankParticipant[] = leaderboardModels
    .filter((model) => model.hacker_id !== undefined && typeof model.hacker === 'string')
    .map((model) => ({
      hackerId: String(model.hacker_id),
      username: model.hacker.trim(),
      rank: typeof model.rank === 'number' ? model.rank : null,
      score: typeof model.score === 'number' ? model.score : null,
      timeTaken: typeof model.time_taken === 'number' ? model.time_taken : null,
    }));

  const students = await prisma.student.findMany({
    select: {
      id: true,
      fullName: true,
      hackerRankUsername: true,
      hackerRankId: true,
      hackerRankMatchType: true,
    },
  });
  const studentsNeedingNameMatch = students.filter((student) => !student.hackerRankUsername?.trim());
  let profileFailures = 0;
  if (studentsNeedingNameMatch.length > 0) {
    profileFailures = await enrichParticipantNames(participants, config.baseUrl);
  }

  const matches = matchHackerRankStudents(students, participants);
  const lastSyncedAt = new Date();
  const updateOperations = students.map((student) => {
    const match = matches.get(student.id) || null;
    const performance = buildHackerRankPerformance({
      match,
      submissions,
      questionSlugs: config.questionSlugs,
      contestStartAt: config.contestStartAt,
    });
    return prisma.student.update({
      where: { id: student.id },
      data: {
        hackerRankUsername: performance.username || student.hackerRankUsername,
        hackerRankId: performance.hackerId,
        hackerRankMatchStatus: performance.matchStatus,
        hackerRankMatchType: performance.matchType,
        hackerRankScore: performance.score,
        hackerRankRank: performance.rank,
        hackerRankContestTimeTaken: performance.contestTimeTaken,
        hackerRankQuestionsSolved: performance.questionsSolved,
        hackerRankQuestionsJson: JSON.stringify(performance.questions),
        hackerRankQuestion1Minutes: performance.questions[0]?.firstAcceptedAtMinutes ?? null,
        hackerRankQuestion2Minutes: performance.questions[1]?.firstAcceptedAtMinutes ?? null,
        hackerRankLastSyncedAt: lastSyncedAt,
      },
    });
  });

  await prisma.$transaction([
    ...updateOperations,
    prisma.hackerRankSync.upsert({
      where: { id: SYNC_ID },
      create: { id: SYNC_ID, contestSlug: config.contestSlug, lastSyncedAt },
      update: { contestSlug: config.contestSlug, lastSyncedAt },
    }),
  ]);

  return {
    contestSlug: config.contestSlug,
    lastSyncedAt,
    studentsUpdated: students.length,
    leaderboardRecords: leaderboardModels.length,
    submissionRecords: submissions.length,
    profileFailures,
    questionSlugs: config.questionSlugs,
  };
}

export async function getHackerRankSyncStatus() {
  return prisma.hackerRankSync.findUnique({ where: { id: SYNC_ID } });
}