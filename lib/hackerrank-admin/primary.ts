import prisma from '@/lib/prisma';
import type { HackerRankQuestionResult } from '@/lib/hackerrank';
import { ContestDetailPayload, getAdminContestDetail } from '@/lib/hackerrank-admin/contests';
import { participantSolveTime } from '@/lib/hackerrank-admin/analytics';
import {
  computeContestOutcomes,
  MappingParticipant,
  StudentOutcome,
  summarizeOutcomes,
} from '@/lib/hackerrank-admin/mapping';

/**
 * The "primary" contest drives the dashboard: its results are written onto the Student rows
 * (hackerRank* fields), so the existing dashboard columns, filters and CSV export keep working.
 * Everything here reads the cached contest snapshot, so applying never calls HackerRank.
 */

export class PrimaryContestError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

async function readSnapshot(slug: string): Promise<{ data: ContestDetailPayload; fetchedAt: Date } | null> {
  const row = await prisma.hackerRankAdminSnapshot.findUnique({ where: { key: `contest:${slug}` } });
  if (!row) return null;
  try {
    return { data: JSON.parse(row.data) as ContestDetailPayload, fetchedAt: row.fetchedAt };
  } catch {
    return null;
  }
}

export async function getPrimarySetting() {
  return prisma.hackerRankContestSetting.findFirst({ where: { isPrimary: true } });
}

function participantsOf(detail: ContestDetailPayload): MappingParticipant[] {
  return detail.analytics.participants.map((row) => ({ username: row.username, name: row.name ?? null, score: row.score }));
}

async function loadMappingInputs(slug: string) {
  const [students, overrides] = await Promise.all([
    prisma.student.findMany({
      select: { id: true, fullName: true, hackerRankUsername: true, hackerRankMatchType: true, college: true, passingYear: true, emailId: true, emailAddress: true },
      orderBy: { fullName: 'asc' },
    }),
    prisma.hackerRankResultOverride.findMany({ where: { contestSlug: slug } }),
  ]);
  return {
    students,
    overrides: Object.fromEntries(overrides.map((override) => [override.studentId, override.result as 'pass' | 'fail'])),
  };
}

const CLEARED_RESULT_FIELDS = {
  hackerRankId: null,
  hackerRankMatchStatus: null,
  hackerRankScore: null,
  hackerRankRank: null,
  hackerRankContestTimeTaken: null,
  hackerRankQuestionsSolved: null,
  hackerRankQuestionsJson: null,
  hackerRankQuestion1Minutes: null,
  hackerRankQuestion2Minutes: null,
  hackerRankLastSyncedAt: null,
  hackerRankContestSlug: null,
  hackerRankContestName: null,
  hackerRankResult: null,
  hackerRankResultSource: null,
};

/** Recomputes Pass/Fail/Absent for every student from the primary contest snapshot and saves it. */
export async function applyPrimaryContest() {
  const setting = await getPrimarySetting();
  if (!setting) return null;
  const snapshot = await readSnapshot(setting.slug);
  if (!snapshot) throw new PrimaryContestError('The primary contest has not been fetched yet. Refresh it from HackerRank first.', 409);

  const detail = snapshot.data;
  const { students, overrides } = await loadMappingInputs(setting.slug);
  const { outcomes } = computeContestOutcomes({
    students,
    participants: participantsOf(detail),
    passScore: setting.passScore,
    overrides,
  });

  const rowsByUsername = new Map(detail.analytics.participants.map((row) => [row.username.toLowerCase(), row]));
  const challenges = detail.analytics.challenges;

  const updates = outcomes.map((outcome) => {
    const base = {
      ...CLEARED_RESULT_FIELDS,
      hackerRankContestSlug: detail.contest.slug,
      hackerRankContestName: detail.contest.name,
      hackerRankResult: outcome.result,
      hackerRankResultSource: outcome.resultSource,
      hackerRankLastSyncedAt: snapshot.fetchedAt,
    };
    if (outcome.match.status !== 'matched') {
      return prisma.student.update({
        where: { id: outcome.studentId },
        data: { ...base, hackerRankMatchStatus: outcome.match.status },
      });
    }
    const row = rowsByUsername.get(outcome.match.username.toLowerCase());
    const questions: HackerRankQuestionResult[] = challenges.map((challenge) => {
      const result = row?.challenges[challenge.slug];
      const minutes = result?.solved ? result.firstAcceptedMinutes : null;
      return {
        challengeId: challenge.id,
        challengeName: challenge.name,
        challengeSlug: challenge.slug,
        solved: Boolean(result?.solved),
        firstAcceptedAtMinutes: minutes,
        firstAcceptedAtSeconds: minutes === null ? null : Math.round(minutes * 60),
        score: result?.bestScore ?? null,
      };
    });
    const solveTime = row ? (row.solveTimeMinutes !== undefined ? row.solveTimeMinutes : participantSolveTime(row.challenges)) : null;
    return prisma.student.update({
      where: { id: outcome.studentId },
      data: {
        ...base,
        // Persist the link so the same person is matched by username in future contests.
        hackerRankUsername: outcome.match.username,
        hackerRankMatchType: outcome.match.matchType,
        hackerRankId: row?.hackerId ?? null,
        hackerRankMatchStatus: 'matched',
        hackerRankScore: row?.score ?? 0,
        hackerRankRank: row?.rank ?? null,
        hackerRankContestTimeTaken: solveTime === null ? null : Math.round(solveTime * 60),
        hackerRankQuestionsSolved: questions.filter((question) => question.solved).length,
        hackerRankQuestionsJson: JSON.stringify(questions),
        hackerRankQuestion1Minutes: questions[0]?.firstAcceptedAtMinutes ?? null,
        hackerRankQuestion2Minutes: questions[1]?.firstAcceptedAtMinutes ?? null,
      },
    });
  });

  await prisma.$transaction([
    ...updates,
    prisma.hackerRankContestSetting.update({ where: { slug: setting.slug }, data: { appliedAt: new Date() } }),
  ]);
  return summarizeOutcomes(outcomes);
}

export async function getPrimaryStatus() {
  const setting = await getPrimarySetting();
  if (!setting) return { primary: null, counts: null };
  const [snapshot, grouped, ambiguous] = await Promise.all([
    prisma.hackerRankAdminSnapshot.findUnique({ where: { key: `contest:${setting.slug}` }, select: { fetchedAt: true } }),
    prisma.student.groupBy({ by: ['hackerRankResult'], _count: { _all: true } }),
    prisma.student.count({ where: { hackerRankMatchStatus: 'ambiguous' } }),
  ]);
  const count = (result: string) => grouped.find((group) => group.hackerRankResult === result)?._count._all ?? 0;
  return {
    primary: {
      slug: setting.slug,
      name: setting.name,
      passScore: setting.passScore,
      appliedAt: setting.appliedAt?.toISOString() ?? null,
      fetchedAt: snapshot?.fetchedAt.toISOString() ?? null,
    },
    counts: { pass: count('pass'), fail: count('fail'), absent: count('absent'), ambiguous },
  };
}

function validPassScore(value: unknown): number {
  const score = typeof value === 'string' ? (value.trim() === '' ? NaN : Number(value)) : value;
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0) {
    throw new PrimaryContestError('Enter a pass score of 0 or more.');
  }
  return score;
}

export async function setPrimaryContest(slug: string, passScoreInput: unknown) {
  const passScore = validPassScore(passScoreInput);
  // Uses the cached snapshot, or fetches it once if this contest was never opened.
  const detail = await getAdminContestDetail(slug, false);
  if (!detail.data) {
    throw new PrimaryContestError(detail.error?.message || 'Could not load this contest from HackerRank.', 502);
  }
  await prisma.$transaction([
    prisma.hackerRankContestSetting.updateMany({ where: { isPrimary: true, NOT: { slug } }, data: { isPrimary: false } }),
    prisma.hackerRankContestSetting.upsert({
      where: { slug },
      create: { slug, name: detail.data.contest.name, passScore, isPrimary: true },
      update: { name: detail.data.contest.name, passScore, isPrimary: true },
    }),
  ]);
  return applyPrimaryContest();
}

export async function updatePassScore(slug: string, passScoreInput: unknown) {
  const passScore = validPassScore(passScoreInput);
  const setting = await prisma.hackerRankContestSetting.findUnique({ where: { slug } });
  if (!setting) throw new PrimaryContestError('Set this contest as primary first.');
  await prisma.hackerRankContestSetting.update({ where: { slug }, data: { passScore } });
  return setting.isPrimary ? applyPrimaryContest() : null;
}

/** Stops driving the dashboard from a contest. Clears contest results from students but keeps their HackerRank links. */
export async function unsetPrimaryContest() {
  await prisma.$transaction([
    prisma.hackerRankContestSetting.updateMany({ where: { isPrimary: true }, data: { isPrimary: false } }),
    prisma.student.updateMany({ data: CLEARED_RESULT_FIELDS }),
  ]);
}

async function applyIfPrimary(slug: string) {
  const setting = await getPrimarySetting();
  return setting?.slug === slug ? applyPrimaryContest() : null;
}

export async function setResultOverride(studentId: string, slug: string, result: unknown) {
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
  if (!student) throw new PrimaryContestError('Student not found.', 404);
  if (result === 'pass' || result === 'fail') {
    await prisma.hackerRankResultOverride.upsert({
      where: { studentId_contestSlug: { studentId, contestSlug: slug } },
      create: { studentId, contestSlug: slug, result },
      update: { result },
    });
  } else if (result === null || result === 'auto') {
    await prisma.hackerRankResultOverride.deleteMany({ where: { studentId, contestSlug: slug } });
  } else {
    throw new PrimaryContestError('Result must be pass, fail or auto.');
  }
  return applyIfPrimary(slug);
}

/** Manually links a student to a HackerRank username (saved on the student, used for every contest). */
export async function linkStudent(studentId: string, usernameInput: unknown) {
  const username = typeof usernameInput === 'string' ? usernameInput.trim() : '';
  if (!/^[A-Za-z0-9_.-]{1,80}$/.test(username)) throw new PrimaryContestError('Invalid HackerRank username.');
  const [student, others] = await Promise.all([
    prisma.student.findUnique({ where: { id: studentId }, select: { id: true } }),
    prisma.student.findMany({ where: { hackerRankUsername: { not: null }, NOT: { id: studentId } }, select: { fullName: true, hackerRankUsername: true } }),
  ]);
  if (!student) throw new PrimaryContestError('Student not found.', 404);
  const owner = others.find((other) => other.hackerRankUsername?.toLowerCase() === username.toLowerCase());
  if (owner) throw new PrimaryContestError(`@${username} is already linked to ${owner.fullName}. Unlink it there first.`, 409);
  await prisma.student.update({
    where: { id: studentId },
    data: { hackerRankUsername: username, hackerRankMatchType: 'manual', hackerRankId: null },
  });
  const setting = await getPrimarySetting();
  return setting ? applyPrimaryContest() : null;
}

/** Removes a student's HackerRank link and stops automatic name matching for them. */
export async function unlinkStudent(studentId: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
  if (!student) throw new PrimaryContestError('Student not found.', 404);
  await prisma.student.update({
    where: { id: studentId },
    data: { hackerRankUsername: null, hackerRankId: null, hackerRankMatchType: 'unlinked' },
  });
  const setting = await getPrimarySetting();
  return setting ? applyPrimaryContest() : null;
}

/** Mapping + results view for one contest page (computed live, not from student rows). */
export async function getContestMappingView(slug: string, detail: ContestDetailPayload) {
  const [{ students, overrides }, setting, primary] = await Promise.all([
    loadMappingInputs(slug),
    prisma.hackerRankContestSetting.findUnique({ where: { slug } }),
    getPrimarySetting(),
  ]);
  const { outcomes, claimedBy } = computeContestOutcomes({
    students,
    participants: participantsOf(detail),
    passScore: setting?.passScore ?? null,
    overrides,
  });
  const studentsById = new Map(students.map((student) => [student.id, student]));
  const outcomeById = new Map<string, StudentOutcome>(outcomes.map((outcome) => [outcome.studentId, outcome]));

  // participant username (lowercase) -> linked student + result
  const links: Record<string, { id: string; fullName: string; matchType: string; result: string | null; resultSource: string | null; autoResult: string | null }> = {};
  claimedBy.forEach((studentId, username) => {
    const student = studentsById.get(studentId);
    const outcome = outcomeById.get(studentId);
    if (!student || !outcome || outcome.match.status !== 'matched') return;
    links[username] = {
      id: student.id,
      fullName: student.fullName,
      matchType: outcome.match.matchType,
      result: outcome.result,
      resultSource: outcome.resultSource,
      autoResult: outcome.autoResult,
    };
  });

  // Students not linked to anyone in this contest (need mapping, or absent).
  const unmatched = outcomes
    .filter((outcome) => outcome.match.status !== 'matched')
    .map((outcome) => {
      const student = studentsById.get(outcome.studentId)!;
      return {
        id: student.id,
        fullName: student.fullName,
        email: student.emailId || student.emailAddress,
        college: student.college,
        passingYear: student.passingYear,
        hackerRankUsername: student.hackerRankUsername,
        status: outcome.match.status,
        reason: outcome.match.status === 'not_found' ? outcome.match.reason : null,
        candidates: outcome.match.status === 'ambiguous' ? outcome.match.candidates : [],
        result: outcome.result,
        resultSource: outcome.resultSource,
      };
    })
    .sort((a, b) => (a.status === 'ambiguous' ? 0 : 1) - (b.status === 'ambiguous' ? 0 : 1) || a.fullName.localeCompare(b.fullName));

  return {
    setting: setting ? { passScore: setting.passScore, isPrimary: setting.isPrimary } : null,
    primary: primary ? { slug: primary.slug, name: primary.name } : null,
    links,
    unmatched,
    summary: summarizeOutcomes(outcomes),
  };
}
