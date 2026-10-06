// Pure data-processing for the HackerRank Contests tab. No I/O here so it can be unit tested.

export type ContestStatus = 'upcoming' | 'live' | 'ended' | 'unknown';

export interface AdminContestSummary {
  id: string;
  name: string;
  slug: string;
  owner: string | null;
  startTime: string | null;
  endTime: string | null;
  signupCount: number | null;
  participantCount: number | null;
  status: ContestStatus;
  archived: boolean;
}

export interface ContestInfo {
  id: string | null;
  name: string;
  slug: string;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  status: ContestStatus;
  isPublic: boolean | null;
  createdAt: string | null;
  challengesCount: number | null;
  penalty: boolean | null;
  contestUrl: string;
  adminUrl: string | null;
}

export interface ContestChallenge {
  id: string | null;
  slug: string;
  name: string;
  maxScore: number | null;
  difficulty: string | null;
}

export interface LeaderboardEntry {
  hackerId: string | null;
  username: string;
  rank: number | null;
  score: number | null;
  timeTaken: number | null;
  country: string | null;
  school: string | null;
}

export interface RawSubmission {
  id?: number | string;
  hacker_id?: number | string;
  hacker_username?: string;
  challenge_id?: number | string;
  challenge?: { name?: string; slug?: string } | null;
  status?: string;
  language?: string | null;
  in_contest_bounds?: boolean;
  time_from_start?: number | null;
  created_at?: number | null;
  score?: number | null;
}

export interface ParticipantChallengeResult {
  attempts: number;
  solved: boolean;
  firstAcceptedMinutes: number | null;
  /** HackerRank submission id of the first accepted submission (used to link to the code on HackerRank). */
  firstAcceptedSubmissionId: string | null;
  bestScore: number | null;
  wrongBeforeAccept: number | null;
}

export interface ParticipantRow {
  key: string;
  hackerId: string | null;
  username: string;
  /** Full name from the HackerRank profile, when available. */
  name: string | null;
  rank: number | null;
  score: number | null;
  /** HackerRank leaderboard time (sum of solve times + penalties), in seconds. Kept for reference. */
  timeTaken: number | null;
  /** Minutes after contest start at which the last solved question was first accepted (max, not sum). */
  solveTimeMinutes: number | null;
  country: string | null;
  school: string | null;
  onLeaderboard: boolean;
  solvedCount: number;
  attempts: number;
  languages: string[];
  firstSubmissionMinutes: number | null;
  lastSubmissionMinutes: number | null;
  challenges: Record<string, ParticipantChallengeResult>;
}

export interface ChallengeStats extends ContestChallenge {
  attempted: number;
  solved: number;
  solveRate: number | null;
  submissions: number;
  accepted: number;
  acceptanceRate: number | null;
  medianFirstAcceptedMinutes: number | null;
  averageFirstAcceptedMinutes: number | null;
  fastestSolve: { username: string; minutes: number } | null;
  averageAttemptsToSolve: number | null;
}

export interface ContestAnalytics {
  overview: {
    participants: number;
    submitters: number;
    totalSubmissions: number;
    inContestSubmissions: number;
    practiceSubmissions: number;
    acceptedSubmissions: number;
    maxPossibleScore: number | null;
    averageScore: number | null;
    medianScore: number | null;
    highestScore: number | null;
    perfectScores: number;
    zeroScores: number;
    solvedAll: number;
  };
  challenges: ChallengeStats[];
  participants: ParticipantRow[];
  scoreDistribution: { score: number; count: number }[];
  statusBreakdown: { status: string; count: number }[];
  languageBreakdown: { language: string; submissions: number; participants: number }[];
  solveTimeline: { bucketMinutes: number; buckets: { startMinute: number; counts: Record<string, number> }[] };
}

// ---------- helpers ----------

function toNumber(value: unknown): number | null {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof number === 'number' && Number.isFinite(number) ? number : null;
}

function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function epochToIso(value: unknown): string | null {
  const seconds = toNumber(value);
  return seconds && seconds > 0 ? new Date(seconds * 1000).toISOString() : null;
}

export function contestStatus(startTime: string | null, endTime: string | null, now = Date.now()): ContestStatus {
  const start = startTime ? Date.parse(startTime) : NaN;
  const end = endTime ? Date.parse(endTime) : NaN;
  if (Number.isFinite(start) && now < start) return 'upcoming';
  if (Number.isFinite(end) && now >= end) return 'ended';
  if (Number.isFinite(start)) return 'live';
  return 'unknown';
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function isAccepted(submission: RawSubmission) {
  return submission.status?.trim().toLowerCase() === 'accepted';
}

/** Minutes after contest start. Prefers time_from_start (already contest-relative, in minutes). */
export function submissionMinutes(submission: RawSubmission, contestStartEpoch: number | null): number | null {
  const fromStart = toNumber(submission.time_from_start);
  if (fromStart !== null && fromStart >= 0) return fromStart;
  const createdAt = toNumber(submission.created_at);
  if (createdAt !== null && contestStartEpoch !== null && createdAt >= contestStartEpoch) {
    return (createdAt - contestStartEpoch) / 60;
  }
  return null;
}

function challengeKey(submission: RawSubmission): string | null {
  const slug = submission.challenge?.slug?.trim();
  if (slug) return slug;
  const id = toStringOrNull(submission.challenge_id);
  return id ? `id:${id}` : null;
}

function hackerKey(hackerId: string | null, username: string | null): string | null {
  if (hackerId) return `id:${hackerId}`;
  return username ? `u:${username.toLowerCase()}` : null;
}

// ---------- normalizers (defensive against missing / renamed fields) ----------

type Loose = Record<string, unknown>;

export function normalizeContestSummary(model: Loose, now = Date.now()): AdminContestSummary | null {
  const slug = toStringOrNull(model.slug);
  if (!slug) return null;
  const startTime = epochToIso(model.epoch_starttime) || toStringOrNull(model.get_starttimeiso);
  const endTime = epochToIso(model.epoch_endtime) || epochToIso(model.effective_epoch_endtime) || toStringOrNull(model.get_endtimeiso);
  const hacker = model.hacker as Loose | undefined;
  return {
    id: toStringOrNull(model.id) || slug,
    name: toStringOrNull(model.name) || slug,
    slug,
    owner: toStringOrNull(hacker?.username) || toStringOrNull(model.hacker_username),
    startTime,
    endTime,
    signupCount: toNumber(model.signup_count),
    participantCount: toNumber(model.leaderboard_total),
    status: model.ended === true ? 'ended' : contestStatus(startTime, endTime, now),
    archived: model.archived === true,
  };
}

export function normalizeContestInfo(model: Loose, slug: string, baseUrl: string, now = Date.now()): ContestInfo {
  const startTime = epochToIso(model.epoch_starttime) || toStringOrNull(model.get_starttimeiso);
  const endTime = epochToIso(model.epoch_endtime) || epochToIso(model.effective_epoch_endtime) || toStringOrNull(model.get_endtimeiso);
  const start = startTime ? Date.parse(startTime) : NaN;
  const end = endTime ? Date.parse(endTime) : NaN;
  const id = toStringOrNull(model.id);
  const description = toStringOrNull(model.description);
  return {
    id,
    name: toStringOrNull(model.name) || slug,
    slug: toStringOrNull(model.slug) || slug,
    description: description && !description.startsWith('Please provide a short description') ? description : null,
    startTime,
    endTime,
    durationMinutes: Number.isFinite(start) && Number.isFinite(end) ? Math.round((end - start) / 60000) : null,
    status: model.ended === true ? 'ended' : contestStatus(startTime, endTime, now),
    isPublic: typeof model.public === 'boolean' ? model.public : null,
    createdAt: toStringOrNull(model.created_at),
    challengesCount: toNumber(model.challenges_count),
    penalty: model.penalty === null || model.penalty === undefined ? null : Boolean(model.penalty),
    contestUrl: `${baseUrl}/contests/${encodeURIComponent(slug)}`,
    adminUrl: id ? `${baseUrl}/administration/contests/edit/${id}/overview` : null,
  };
}

export function normalizeChallenge(model: Loose): ContestChallenge | null {
  const slug = toStringOrNull(model.slug);
  if (!slug) return null;
  return {
    id: toStringOrNull(model.id),
    slug,
    name: toStringOrNull(model.name) || slug,
    maxScore: toNumber(model.max_score),
    difficulty: toStringOrNull(model.difficulty_name),
  };
}

export function normalizeLeaderboardEntry(model: Loose): LeaderboardEntry | null {
  const username = toStringOrNull(model.hacker) || toStringOrNull(model.hacker_username);
  if (!username) return null;
  return {
    hackerId: toStringOrNull(model.hacker_id),
    username,
    rank: toNumber(model.rank),
    score: toNumber(model.score),
    timeTaken: toNumber(model.time_taken),
    country: toStringOrNull(model.country),
    school: toStringOrNull(model.school),
  };
}

// ---------- analytics ----------

/** Link to a submission's code on HackerRank (requires being logged in there as a contest moderator). */
export function submissionCodeUrl(contestUrl: string, challengeSlug: string, submissionId: string | null | undefined): string | null {
  if (!submissionId || challengeSlug.startsWith('id:')) return null;
  return `${contestUrl}/challenges/${encodeURIComponent(challengeSlug)}/submissions/code/${encodeURIComponent(submissionId)}`;
}

/** Latest first-accepted time across solved questions (i.e. when the participant finished), or null if none solved. */
export function participantSolveTime(challenges: Record<string, ParticipantChallengeResult>): number | null {
  const times = Object.values(challenges)
    .filter((result) => result.solved && result.firstAcceptedMinutes !== null)
    .map((result) => result.firstAcceptedMinutes as number);
  return times.length ? Math.max(...times) : null;
}

export function buildContestAnalytics(input: {
  challenges: ContestChallenge[];
  leaderboard: LeaderboardEntry[];
  submissions: RawSubmission[];
  contestStartEpoch: number | null;
  durationMinutes: number | null;
  timelineBucketMinutes?: number;
  /** Profile full names keyed by lowercase username. */
  names?: Record<string, string | null>;
}): ContestAnalytics {
  const { leaderboard, submissions, contestStartEpoch, durationMinutes } = input;
  const bucketMinutes = input.timelineBucketMinutes ?? 5;

  // Challenge catalogue: contest order first, then anything only seen in submissions.
  const challengeMap = new Map<string, ContestChallenge>();
  input.challenges.forEach((challenge) => challengeMap.set(challenge.slug, challenge));
  submissions.forEach((submission) => {
    const key = challengeKey(submission);
    if (key && !challengeMap.has(key)) {
      challengeMap.set(key, {
        id: toStringOrNull(submission.challenge_id),
        slug: key,
        name: submission.challenge?.name?.trim() || key,
        maxScore: null,
        difficulty: null,
      });
    }
  });
  const challengeList = Array.from(challengeMap.values());

  // Participants keyed by hacker id (fallback: username).
  const participants = new Map<string, ParticipantRow>();
  const usernameToKey = new Map<string, string>();
  const ensureParticipant = (hackerId: string | null, username: string | null): ParticipantRow | null => {
    const byUsername = username ? usernameToKey.get(username.toLowerCase()) : undefined;
    const key = (hackerId && participants.has(`id:${hackerId}`) ? `id:${hackerId}` : byUsername) || hackerKey(hackerId, username);
    if (!key) return null;
    let row = participants.get(key);
    if (!row) {
      row = {
        key,
        hackerId,
        username: username || `hacker ${hackerId}`,
        name: null,
        rank: null,
        score: null,
        timeTaken: null,
        solveTimeMinutes: null,
        country: null,
        school: null,
        onLeaderboard: false,
        solvedCount: 0,
        attempts: 0,
        languages: [],
        firstSubmissionMinutes: null,
        lastSubmissionMinutes: null,
        challenges: {},
      };
      participants.set(key, row);
    }
    if (username) usernameToKey.set(username.toLowerCase(), key);
    return row;
  };

  leaderboard.forEach((entry) => {
    const row = ensureParticipant(entry.hackerId, entry.username);
    if (!row) return;
    Object.assign(row, {
      hackerId: entry.hackerId ?? row.hackerId,
      username: entry.username,
      rank: entry.rank,
      score: entry.score,
      timeTaken: entry.timeTaken,
      country: entry.country,
      school: entry.school,
      onLeaderboard: true,
    });
  });

  // Deduplicate submissions by id.
  const seen = new Set<string>();
  const uniqueSubmissions = submissions.filter((submission, index) => {
    const id = toStringOrNull(submission.id) || `idx:${index}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  const statusCounts = new Map<string, number>();
  const languageCounts = new Map<string, { submissions: number; participants: Set<string> }>();
  const challengeSubmissionCounts = new Map<string, { submissions: number; accepted: number; attempted: Set<string> }>();
  const languagesByParticipant = new Map<string, Set<string>>();
  let inContestSubmissions = 0;
  let acceptedSubmissions = 0;

  // Sort chronologically so "first accepted" / "wrong before accept" are well defined.
  const inContest = uniqueSubmissions
    .filter((submission) => submission.in_contest_bounds === true)
    .map((submission) => ({ submission, minutes: submissionMinutes(submission, contestStartEpoch) }))
    .sort((a, b) => (a.minutes ?? Number.POSITIVE_INFINITY) - (b.minutes ?? Number.POSITIVE_INFINITY));

  inContest.forEach(({ submission, minutes }) => {
    const slug = challengeKey(submission);
    const row = ensureParticipant(toStringOrNull(submission.hacker_id), toStringOrNull(submission.hacker_username));
    if (!slug || !row) return;
    inContestSubmissions += 1;

    const status = submission.status?.trim() || 'Unknown';
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);

    const language = submission.language?.trim();
    if (language) {
      const entry = languageCounts.get(language) || { submissions: 0, participants: new Set<string>() };
      entry.submissions += 1;
      entry.participants.add(row.key);
      languageCounts.set(language, entry);
      const languages = languagesByParticipant.get(row.key) || new Set<string>();
      languages.add(language);
      languagesByParticipant.set(row.key, languages);
    }

    const challengeCounts = challengeSubmissionCounts.get(slug) || { submissions: 0, accepted: 0, attempted: new Set<string>() };
    challengeCounts.submissions += 1;
    challengeCounts.attempted.add(row.key);

    row.attempts += 1;
    if (minutes !== null) {
      row.firstSubmissionMinutes = row.firstSubmissionMinutes === null ? minutes : Math.min(row.firstSubmissionMinutes, minutes);
      row.lastSubmissionMinutes = row.lastSubmissionMinutes === null ? minutes : Math.max(row.lastSubmissionMinutes, minutes);
    }

    const result = row.challenges[slug] ||= {
      attempts: 0,
      solved: false,
      firstAcceptedMinutes: null,
      firstAcceptedSubmissionId: null,
      bestScore: null,
      wrongBeforeAccept: null,
    };
    result.attempts += 1;
    const score = toNumber(submission.score);
    if (score !== null) result.bestScore = result.bestScore === null ? score : Math.max(result.bestScore, score);

    if (isAccepted(submission)) {
      acceptedSubmissions += 1;
      challengeCounts.accepted += 1;
      if (!result.solved) {
        result.solved = true;
        result.firstAcceptedMinutes = minutes === null ? null : round(minutes);
        result.firstAcceptedSubmissionId = toStringOrNull(submission.id);
        result.wrongBeforeAccept = result.attempts - 1;
      }
    }
    challengeSubmissionCounts.set(slug, challengeCounts);
  });

  const participantRows = Array.from(participants.values());
  participantRows.forEach((row) => {
    row.solvedCount = Object.values(row.challenges).filter((result) => result.solved).length;
    row.languages = Array.from(languagesByParticipant.get(row.key) || []).sort();
    if (row.firstSubmissionMinutes !== null) row.firstSubmissionMinutes = round(row.firstSubmissionMinutes);
    if (row.lastSubmissionMinutes !== null) row.lastSubmissionMinutes = round(row.lastSubmissionMinutes);
    row.solveTimeMinutes = participantSolveTime(row.challenges);
    row.name = input.names?.[row.username.toLowerCase()] || null;
  });
  participantRows.sort((a, b) =>
    (a.rank ?? Number.POSITIVE_INFINITY) - (b.rank ?? Number.POSITIVE_INFINITY) ||
    (b.score ?? -1) - (a.score ?? -1) ||
    (a.solveTimeMinutes ?? Number.POSITIVE_INFINITY) - (b.solveTimeMinutes ?? Number.POSITIVE_INFINITY) ||
    a.username.localeCompare(b.username),
  );

  const participantCount = participantRows.length;
  const challengeStats: ChallengeStats[] = challengeList.map((challenge) => {
    const counts = challengeSubmissionCounts.get(challenge.slug);
    const solves = participantRows
      .map((row) => ({ username: row.username, result: row.challenges[challenge.slug] }))
      .filter((entry) => entry.result?.solved);
    const solveTimes = solves
      .map((entry) => entry.result.firstAcceptedMinutes)
      .filter((minutes): minutes is number => minutes !== null);
    const fastest = solves
      .filter((entry) => entry.result.firstAcceptedMinutes !== null)
      .sort((a, b) => (a.result.firstAcceptedMinutes as number) - (b.result.firstAcceptedMinutes as number))[0];
    const attemptsToSolve = solves.map((entry) => (entry.result.wrongBeforeAccept ?? 0) + 1);
    const medianTime = median(solveTimes);
    const averageTime = average(solveTimes);
    const averageAttempts = average(attemptsToSolve);
    return {
      ...challenge,
      attempted: counts?.attempted.size || 0,
      solved: solves.length,
      solveRate: participantCount ? round(solves.length / participantCount, 4) : null,
      submissions: counts?.submissions || 0,
      accepted: counts?.accepted || 0,
      acceptanceRate: counts?.submissions ? round(counts.accepted / counts.submissions, 4) : null,
      medianFirstAcceptedMinutes: medianTime === null ? null : round(medianTime),
      averageFirstAcceptedMinutes: averageTime === null ? null : round(averageTime),
      fastestSolve: fastest ? { username: fastest.username, minutes: fastest.result.firstAcceptedMinutes as number } : null,
      averageAttemptsToSolve: averageAttempts === null ? null : round(averageAttempts),
    };
  });

  const scores = participantRows.map((row) => row.score).filter((score): score is number => score !== null);
  const maxScores = challengeList.map((challenge) => challenge.maxScore);
  const maxPossibleScore = maxScores.length && maxScores.every((score) => score !== null)
    ? (maxScores as number[]).reduce((sum, score) => sum + score, 0)
    : null;
  const highestScore = scores.length ? Math.max(...scores) : null;
  const perfectTarget = maxPossibleScore ?? highestScore;

  const distribution = new Map<number, number>();
  scores.forEach((score) => distribution.set(score, (distribution.get(score) || 0) + 1));

  // Timeline of first-accepted solves.
  const lastMinute = Math.max(
    durationMinutes ?? 0,
    ...participantRows.flatMap((row) => Object.values(row.challenges).map((result) => result.firstAcceptedMinutes ?? 0)),
  );
  const bucketCount = Math.max(1, Math.ceil(lastMinute / bucketMinutes));
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    startMinute: index * bucketMinutes,
    counts: Object.fromEntries(challengeList.map((challenge) => [challenge.slug, 0])) as Record<string, number>,
  }));
  participantRows.forEach((row) => {
    Object.entries(row.challenges).forEach(([slug, result]) => {
      if (!result.solved || result.firstAcceptedMinutes === null) return;
      const index = Math.min(bucketCount - 1, Math.floor(result.firstAcceptedMinutes / bucketMinutes));
      buckets[index].counts[slug] = (buckets[index].counts[slug] || 0) + 1;
    });
  });

  const averageScore = average(scores);
  const medianScore = median(scores);
  return {
    overview: {
      participants: participantCount,
      submitters: participantRows.filter((row) => row.attempts > 0).length,
      totalSubmissions: uniqueSubmissions.length,
      inContestSubmissions,
      practiceSubmissions: uniqueSubmissions.filter((submission) => submission.in_contest_bounds !== true).length,
      acceptedSubmissions,
      maxPossibleScore,
      averageScore: averageScore === null ? null : round(averageScore),
      medianScore,
      highestScore,
      perfectScores: perfectTarget === null ? 0 : scores.filter((score) => score >= perfectTarget).length,
      zeroScores: scores.filter((score) => score === 0).length,
      solvedAll: challengeList.length ? participantRows.filter((row) => row.solvedCount === challengeList.length).length : 0,
    },
    challenges: challengeStats,
    participants: participantRows,
    scoreDistribution: Array.from(distribution.entries())
      .map(([score, count]) => ({ score, count }))
      .sort((a, b) => b.score - a.score),
    statusBreakdown: Array.from(statusCounts.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    languageBreakdown: Array.from(languageCounts.entries())
      .map(([language, entry]) => ({ language, submissions: entry.submissions, participants: entry.participants.size }))
      .sort((a, b) => b.submissions - a.submissions),
    solveTimeline: { bucketMinutes, buckets },
  };
}
