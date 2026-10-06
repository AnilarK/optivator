export type HackerRankMatchStatus = 'matched' | 'not_found' | 'ambiguous';
export type HackerRankMatchType = 'username' | 'name' | null;

export interface HackerRankStudent {
  id: string;
  fullName: string;
  hackerRankUsername: string | null;
  hackerRankId?: string | null;
  hackerRankMatchType?: string | null;
}

export interface HackerRankParticipant {
  hackerId: string;
  username: string;
  name?: string | null;
  rank?: number | null;
  score?: number | null;
  timeTaken?: number | null;
}

export interface HackerRankSubmission {
  id?: number | string;
  hacker_id?: number | string;
  hacker_username?: string;
  challenge_id?: number | string;
  challenge?: { name?: string; slug?: string } | null;
  status?: string;
  in_contest_bounds?: boolean;
  time_from_start?: number | null;
  created_at?: number | null;
  score?: number | null;
}

export interface HackerRankQuestionResult {
  challengeId: string | null;
  challengeName: string;
  challengeSlug: string;
  solved: boolean;
  firstAcceptedAtMinutes: number | null;
  firstAcceptedAtSeconds: number | null;
  score: number | null;
}

export interface HackerRankPerformance {
  matchStatus: HackerRankMatchStatus;
  matchType: HackerRankMatchType;
  username: string | null;
  hackerId: string | null;
  score: number | null;
  rank: number | null;
  contestTimeTaken: number | null;
  questionsSolved: number;
  questions: HackerRankQuestionResult[];
}

export function parseHackerRankQuestions(value: string | null | undefined): HackerRankQuestionResult[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed as HackerRankQuestionResult[] : [];
  } catch {
    return [];
  }
}

export interface HackerRankPage<T> {
  models: T[];
  total: number;
}

export type HackerRankMatchResult =
  | { participant: HackerRankParticipant; matchType: 'username' | 'name' }
  | { ambiguous: true }
  | null;

export function normalizeHackerRankName(name: string): string {
  return name.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

export async function fetchAllHackerRankPages<T>(
  fetchPage: (offset: number, limit: number) => Promise<HackerRankPage<T>>,
  pageSize: number,
  getId: (record: T) => string | number | null | undefined,
  maxPages = 1000,
): Promise<T[]> {
  const records = new Map<string, T>();
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  for (let page = 0; page < maxPages && records.size < total; page += 1) {
    const result = await fetchPage(offset, pageSize);
    if (!Array.isArray(result.models) || !Number.isFinite(result.total) || result.total < 0) {
      throw new Error('HackerRank returned a malformed paginated response.');
    }
    total = result.total;
    if (result.models.length === 0) break;

    result.models.forEach((record, index) => {
      const id = getId(record);
      const key = id === null || id === undefined ? `page:${offset}:record:${index}` : String(id);
      if (!records.has(key)) records.set(key, record);
    });
    offset += result.models.length;
  }

  if (records.size < total) {
    throw new Error('HackerRank pagination ended before all records were retrieved.');
  }
  return Array.from(records.values());
}

function submissionTimeSeconds(
  submission: HackerRankSubmission,
  contestStartAt?: number,
): number | null {
  if (typeof submission.time_from_start === 'number' && submission.time_from_start >= 0) {
    return submission.time_from_start * 60;
  }
  if (
    typeof submission.created_at === 'number' &&
    typeof contestStartAt === 'number' &&
    submission.created_at >= contestStartAt
  ) {
    return submission.created_at - contestStartAt;
  }
  return null;
}

export function matchHackerRankStudents(
  students: HackerRankStudent[],
  participants: HackerRankParticipant[],
): Map<string, HackerRankMatchResult> {
  const participantsByUsername = new Map<string, HackerRankParticipant>();
  const participantsById = new Map<string, HackerRankParticipant>();
  const participantsByName = new Map<string, HackerRankParticipant[]>();

  participants.forEach((participant) => {
    participantsByUsername.set(participant.username.trim().toLocaleLowerCase(), participant);
    participantsById.set(participant.hackerId, participant);
    const normalizedName = participant.name ? normalizeHackerRankName(participant.name) : '';
    if (normalizedName) {
      participantsByName.set(normalizedName, [...(participantsByName.get(normalizedName) || []), participant]);
    }
  });

  const matches = new Map<string, HackerRankMatchResult>();
  students.forEach((student) => {
    const username = student.hackerRankUsername?.trim().toLocaleLowerCase();
    if (username) {
      const participant = participantsByUsername.get(username) ||
        (student.hackerRankId ? participantsById.get(student.hackerRankId) : undefined);
      const matchType = participant && student.hackerRankId === participant.hackerId && student.hackerRankMatchType === 'name'
        ? 'name'
        : 'username';
      matches.set(student.id, participant ? { participant, matchType } : null);
      return;
    }

    const nameMatches = participantsByName.get(normalizeHackerRankName(student.fullName)) || [];
    matches.set(student.id, nameMatches.length === 1
      ? { participant: nameMatches[0], matchType: 'name' }
      : nameMatches.length > 1 ? { ambiguous: true } : null);
  });
  return matches;
}

export function buildHackerRankPerformance(input: {
  match: HackerRankMatchResult;
  submissions: HackerRankSubmission[];
  questionSlugs: string[];
  contestStartAt?: number;
}): HackerRankPerformance {
  const { match, submissions, questionSlugs, contestStartAt } = input;
  const resolvedMatch = match && 'participant' in match ? match : null;
  const participant = resolvedMatch?.participant;
  const matchingSubmissions = participant
    ? submissions.filter((submission) => {
        if (submission.in_contest_bounds !== true) return false;
        const idMatches = submission.hacker_id !== undefined && String(submission.hacker_id) === participant.hackerId;
        const usernameMatches = submission.hacker_username?.trim().toLocaleLowerCase() === participant.username.toLocaleLowerCase();
        return idMatches || usernameMatches;
      })
    : [];

  const challenges = new Map<string, { id: string | null; name: string; slug: string }>();
  matchingSubmissions.forEach((submission) => {
    const slug = submission.challenge?.slug?.trim() || '';
    const challengeId = submission.challenge_id === undefined ? null : String(submission.challenge_id);
    const key = slug || (challengeId ? `id:${challengeId}` : '');
    if (key && !challenges.has(key)) {
      challenges.set(key, {
        id: challengeId,
        name: submission.challenge?.name?.trim() || slug || `Challenge ${challengeId}`,
        slug: slug || key,
      });
    }
  });

  const knownSlugs = questionSlugs.map((slug) => slug.trim()).filter(Boolean);
  const questions: HackerRankQuestionResult[] = [];
  const orderedKeys = knownSlugs.concat(
    Array.from(challenges.keys()).filter((slug) => !knownSlugs.includes(slug)).sort(),
  );
  orderedKeys.forEach((slug) => {
    const challenge = challenges.get(slug);
    const accepted = matchingSubmissions
      .filter((submission) => {
        const submissionSlug = submission.challenge?.slug?.trim();
        return submissionSlug ? submissionSlug === slug : challenge?.id !== null && String(submission.challenge_id) === challenge?.id;
      })
      .filter((submission) => submission.status?.trim().toLocaleLowerCase() === 'accepted')
      .map((submission) => ({
        submission,
        seconds: submissionTimeSeconds(submission, contestStartAt),
      }))
      .sort((left, right) => (left.seconds ?? Number.POSITIVE_INFINITY) - (right.seconds ?? Number.POSITIVE_INFINITY));
    const first = accepted[0];
    questions.push({
      challengeId: challenge?.id || null,
      challengeName: challenge?.name || slug.replace(/-/g, ' '),
      challengeSlug: slug,
      solved: Boolean(first),
      firstAcceptedAtMinutes: first?.seconds !== null && first?.seconds !== undefined
        ? Math.round((first.seconds / 60) * 100) / 100
        : null,
      firstAcceptedAtSeconds: first?.seconds !== null && first?.seconds !== undefined
        ? Math.round(first.seconds)
        : null,
      score: first && typeof first.submission.score === 'number' ? first.submission.score : null,
    });
  });

  return {
    matchStatus: participant ? 'matched' : match && 'ambiguous' in match ? 'ambiguous' : 'not_found',
    matchType: resolvedMatch?.matchType || null,
    username: participant?.username || null,
    hackerId: participant?.hackerId || null,
    score: participant && typeof participant.score === 'number' ? participant.score : participant ? 0 : null,
    rank: participant?.rank ?? null,
    contestTimeTaken: participant?.timeTaken ?? null,
    questionsSolved: questions.filter((question) => question.solved).length,
    questions,
  };
}