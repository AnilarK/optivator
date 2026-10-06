import { fetchAllHackerRankPages } from '@/lib/hackerrank';
import { isStatelessDeployment } from '@/lib/runtime';
import { adminRequest, getAdminConfig, HackerRankAdminError } from '@/lib/hackerrank-admin/session';
import {
  AdminContestSummary,
  buildContestAnalytics,
  ContestAnalytics,
  ContestChallenge,
  ContestInfo,
  LeaderboardEntry,
  normalizeChallenge,
  normalizeContestInfo,
  normalizeContestSummary,
  normalizeLeaderboardEntry,
  RawSubmission,
} from '@/lib/hackerrank-admin/analytics';

type Loose = Record<string, unknown>;

const PAGE_SIZES = { contests: 50, challenges: 50, leaderboard: 100, submissions: 100 };
const MAX_PAGES = 500;

export interface ContestListPayload {
  contests: AdminContestSummary[];
  fetchedAt: string;
}

export interface ContestDetailPayload {
  contest: ContestInfo;
  analytics: ContestAnalytics;
  warnings: string[];
  fetchedAt: string;
}

export interface CachedResult<T> {
  data: T | null;
  fetchedAt: string | null;
  fromCache: boolean;
  stale: boolean;
  error: { code: string; message: string } | null;
}

function slugPath(slug: string) {
  return `/rest/contests/${encodeURIComponent(slug)}`;
}

async function fetchPaged<T>(path: string, pageSize: number, getId: (record: T) => unknown, referer?: string): Promise<T[]> {
  return fetchAllHackerRankPages<T>(
    async (offset, limit) => {
      const separator = path.includes('?') ? '&' : '?';
      const page = await adminRequest<{ models?: T[]; total?: number }>(
        `${path}${separator}offset=${offset}&limit=${limit}`,
        { referer },
      );
      if (!page || !Array.isArray(page.models)) {
        throw new HackerRankAdminError('malformed', 'HackerRank returned an unexpected paginated response.');
      }
      return { models: page.models, total: typeof page.total === 'number' ? page.total : page.models.length };
    },
    pageSize,
    (record) => {
      const id = getId(record);
      return typeof id === 'string' || typeof id === 'number' ? id : null;
    },
    MAX_PAGES,
  );
}

// ---------- profile names ----------

const PROFILE_TTL_MS = 24 * 60 * 60 * 1000;
const PROFILE_CONCURRENCY = 4;
const profileCache = ((globalThis as unknown as { __hrAdminProfileNames?: Map<string, { name: string | null; at: number }> })
  .__hrAdminProfileNames ??= new Map());

/**
 * Full names from HackerRank profiles, keyed by lowercase username. Cached for a day, fetched with
 * bounded concurrency; individual failures just leave that name empty.
 */
async function fetchProfileNames(usernames: string[]): Promise<{ names: Record<string, string | null>; failures: number }> {
  const names: Record<string, string | null> = {};
  const pending: string[] = [];
  Array.from(new Set(usernames.map((username) => username.toLowerCase()))).forEach((key) => {
    const cachedName = profileCache.get(key);
    if (cachedName && Date.now() - cachedName.at < PROFILE_TTL_MS) names[key] = cachedName.name;
    else pending.push(key);
  });

  let failures = 0;
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(PROFILE_CONCURRENCY, pending.length) }, async () => {
    while (next < pending.length) {
      const key = pending[next++];
      try {
        const response = await adminRequest<{ model?: { name?: string | null; personal_first_name?: string | null; personal_last_name?: string | null } | null }>(
          `/rest/contests/master/hackers/${encodeURIComponent(key)}/profile`,
        );
        const model = response?.model;
        const fullName = model?.name?.trim() ||
          [model?.personal_first_name, model?.personal_last_name].map((part) => part?.trim()).filter(Boolean).join(' ') ||
          null;
        names[key] = fullName;
        profileCache.set(key, { name: fullName, at: Date.now() });
      } catch {
        failures += 1;
        names[key] = null;
      }
    }
  }));
  return { names, failures };
}

// ---------- snapshot cache (local only) ----------

// Imported lazily so the stateless (Vercel) path never loads Prisma.
async function db() {
  return (await import('@/lib/prisma')).default;
}

async function readSnapshot<T>(key: string): Promise<{ data: T; fetchedAt: Date } | null> {
  const prisma = await db();
  const row = await prisma.hackerRankAdminSnapshot.findUnique({ where: { key } });
  if (!row) return null;
  try {
    return { data: JSON.parse(row.data) as T, fetchedAt: row.fetchedAt };
  } catch {
    return null;
  }
}

async function writeSnapshot(key: string, data: unknown, fetchedAt: Date) {
  const json = JSON.stringify(data);
  const prisma = await db();
  await prisma.hackerRankAdminSnapshot.upsert({
    where: { key },
    create: { key, data: json, fetchedAt },
    update: { data: json, fetchedAt },
  });
}

function errorInfo(error: unknown) {
  if (error instanceof HackerRankAdminError) return { code: error.code, message: error.message };
  if (error instanceof Error && /pagination|malformed/i.test(error.message)) {
    return { code: 'malformed', message: error.message };
  }
  return { code: 'upstream', message: 'Fetching data from HackerRank failed.' };
}

/**
 * Returns the cached snapshot unless `refresh` is requested (or nothing is cached yet).
 * A failed refresh never destroys the previous snapshot: it is returned with `stale: true` and the error.
 * On a stateless deployment there is no snapshot store: every call fetches live from HackerRank.
 */
async function cached<T>(key: string, refresh: boolean, load: () => Promise<T>): Promise<CachedResult<T>> {
  if (isStatelessDeployment()) {
    try {
      const fetchedAt = new Date();
      const data = await load();
      return { data, fetchedAt: fetchedAt.toISOString(), fromCache: false, stale: false, error: null };
    } catch (error) {
      if (!(error instanceof HackerRankAdminError)) console.error('HackerRank admin fetch failed:', error instanceof Error ? error.message : error);
      return { data: null, fetchedAt: null, fromCache: false, stale: false, error: errorInfo(error) };
    }
  }
  const existing = await readSnapshot<T>(key);
  if (existing && !refresh) {
    return { data: existing.data, fetchedAt: existing.fetchedAt.toISOString(), fromCache: true, stale: false, error: null };
  }
  try {
    const fetchedAt = new Date();
    const data = await load();
    await writeSnapshot(key, data, fetchedAt);
    return { data, fetchedAt: fetchedAt.toISOString(), fromCache: false, stale: false, error: null };
  } catch (error) {
    if (!(error instanceof HackerRankAdminError)) console.error('HackerRank admin fetch failed:', error instanceof Error ? error.message : error);
    return {
      data: existing?.data ?? null,
      fetchedAt: existing?.fetchedAt.toISOString() ?? null,
      fromCache: Boolean(existing),
      stale: Boolean(existing),
      error: errorInfo(error),
    };
  }
}

// ---------- public API ----------

export async function getAdminContests(refresh = false): Promise<CachedResult<ContestListPayload>> {
  return cached('contests', refresh, async () => {
    const models = await fetchPaged<Loose>('/rest/administration/contests', PAGE_SIZES.contests, (model) => model.id ?? model.slug);
    const now = Date.now();
    const contests = models
      .map((model) => normalizeContestSummary(model, now))
      .filter((contest): contest is AdminContestSummary => contest !== null)
      .sort((a, b) => (b.startTime ? Date.parse(b.startTime) : 0) - (a.startTime ? Date.parse(a.startTime) : 0));
    return { contests, fetchedAt: new Date(now).toISOString() };
  });
}

export async function getAdminContestDetail(slug: string, refresh = false): Promise<CachedResult<ContestDetailPayload>> {
  return cached(`contest:${slug}`, refresh, async () => {
    const { baseUrl } = getAdminConfig();
    const referer = `${baseUrl}/contests/${encodeURIComponent(slug)}/judge/submissions`;
    const warnings: string[] = [];

    // The contest itself is required; everything else degrades gracefully.
    const contestResponse = await adminRequest<{ model?: Loose }>(slugPath(slug), { referer });
    if (!contestResponse?.model || typeof contestResponse.model !== 'object') {
      throw new HackerRankAdminError('malformed', 'HackerRank returned an unexpected contest response.');
    }
    const contest = normalizeContestInfo(contestResponse.model, slug, baseUrl);

    const optional = async <T>(label: string, load: () => Promise<T[]>): Promise<T[]> => {
      try {
        return await load();
      } catch (error) {
        const info = errorInfo(error);
        // Auth problems that survived re-login should fail the whole refresh (and keep the old snapshot).
        if (info.code === 'session_expired' || info.code === 'not_configured' || info.code === 'invalid_credentials' || info.code === 'login_blocked') {
          throw error;
        }
        warnings.push(`${label}: ${info.message}`);
        return [];
      }
    };

    const [challengeModels, leaderboardModels, submissions] = await Promise.all([
      optional('Challenges', () => fetchPaged<Loose>(`${slugPath(slug)}/challenges`, PAGE_SIZES.challenges, (model) => model.id ?? model.slug, referer)),
      optional('Leaderboard', () => fetchPaged<Loose>(`${slugPath(slug)}/leaderboard?include_practice=true`, PAGE_SIZES.leaderboard, (model) => model.hacker_id ?? model.hacker, referer)),
      optional('Submissions', () => fetchPaged<RawSubmission>(`${slugPath(slug)}/judge_submissions/`, PAGE_SIZES.submissions, (model) => model.id, referer)),
    ]);

    const challenges = challengeModels
      .map(normalizeChallenge)
      .filter((challenge): challenge is ContestChallenge => challenge !== null);
    const leaderboard = leaderboardModels
      .map(normalizeLeaderboardEntry)
      .filter((entry): entry is LeaderboardEntry => entry !== null);
    const startEpoch = contest.startTime ? Date.parse(contest.startTime) / 1000 : null;

    const usernames = [
      ...leaderboard.map((entry) => entry.username),
      ...submissions.map((submission) => submission.hacker_username).filter((username): username is string => Boolean(username)),
    ];
    const { names, failures } = await fetchProfileNames(usernames);
    if (failures) warnings.push(`Names: could not load the HackerRank profile name for ${failures} participant${failures === 1 ? '' : 's'}.`);

    const analytics = buildContestAnalytics({
      challenges,
      leaderboard,
      submissions,
      contestStartEpoch: startEpoch,
      durationMinutes: contest.durationMinutes,
      names,
    });
    return { contest, analytics, warnings, fetchedAt: new Date().toISOString() };
  });
}
