// Pure student <-> contest-participant mapping and Pass/Fail/Absent logic (no I/O, unit tested).
import { normalizeHackerRankName } from '@/lib/hackerrank';

export type ContestResult = 'pass' | 'fail' | 'absent';

export interface MappingStudent {
  id: string;
  fullName: string;
  hackerRankUsername: string | null;
  /** 'manual' = linked by hand, 'unlinked' = user removed the link (never auto-match again), 'name' / 'username' = automatic. */
  hackerRankMatchType: string | null;
}

export interface MappingParticipant {
  username: string;
  name: string | null;
  score: number | null;
}

export type StudentMatch =
  | { status: 'matched'; username: string; matchType: 'username' | 'name' | 'manual' }
  | { status: 'ambiguous'; candidates: string[] }
  | { status: 'not_found'; reason: 'no_account' | 'not_in_contest' | 'unlinked' };

export interface StudentOutcome {
  studentId: string;
  match: StudentMatch;
  result: ContestResult | null;
  resultSource: 'auto' | 'manual' | null;
  autoResult: ContestResult | null;
}

const key = (username: string) => username.trim().toLowerCase();

/**
 * 1. A student's saved HackerRank username always wins (manual links included).
 * 2. Otherwise exact full-name match after lowercase + whitespace normalisation, only when the name is
 *    unique on BOTH sides; duplicates become "ambiguous" and are left for manual mapping.
 * 3. Participants already claimed by a username are never offered to name matching.
 * 4. Students the user explicitly unlinked are never auto-matched again.
 */
export function mapStudentsToParticipants(students: MappingStudent[], participants: MappingParticipant[]) {
  const participantsByUsername = new Map(participants.map((participant) => [key(participant.username), participant]));
  const matches = new Map<string, StudentMatch>();
  const claimedBy = new Map<string, string>(); // participant username -> student id

  students.forEach((student) => {
    const username = student.hackerRankUsername?.trim();
    if (!username) return;
    const participant = participantsByUsername.get(key(username));
    if (participant && !claimedBy.has(key(participant.username))) {
      claimedBy.set(key(participant.username), student.id);
      const matchType = student.hackerRankMatchType === 'manual' || student.hackerRankMatchType === 'name'
        ? student.hackerRankMatchType
        : 'username';
      matches.set(student.id, { status: 'matched', username: participant.username, matchType });
    } else {
      matches.set(student.id, { status: 'not_found', reason: 'not_in_contest' });
    }
  });

  const unclaimedByName = new Map<string, MappingParticipant[]>();
  participants.forEach((participant) => {
    if (claimedBy.has(key(participant.username)) || !participant.name) return;
    const name = normalizeHackerRankName(participant.name);
    if (name) unclaimedByName.set(name, [...(unclaimedByName.get(name) || []), participant]);
  });

  const nameCandidates = students.filter((student) => !matches.has(student.id) && student.hackerRankMatchType !== 'unlinked');
  const studentsByName = new Map<string, number>();
  nameCandidates.forEach((student) => {
    const name = normalizeHackerRankName(student.fullName);
    studentsByName.set(name, (studentsByName.get(name) || 0) + 1);
  });

  nameCandidates.forEach((student) => {
    const name = normalizeHackerRankName(student.fullName);
    const candidates = name ? unclaimedByName.get(name) || [] : [];
    if (candidates.length === 1 && studentsByName.get(name) === 1) {
      claimedBy.set(key(candidates[0].username), student.id);
      matches.set(student.id, { status: 'matched', username: candidates[0].username, matchType: 'name' });
    } else if (candidates.length > 0) {
      matches.set(student.id, { status: 'ambiguous', candidates: candidates.map((candidate) => candidate.username) });
    } else {
      matches.set(student.id, { status: 'not_found', reason: 'no_account' });
    }
  });

  students.forEach((student) => {
    if (!matches.has(student.id)) matches.set(student.id, { status: 'not_found', reason: 'unlinked' });
  });

  return { matches, claimedBy };
}

export function autoResult(score: number | null, passScore: number | null): ContestResult | null {
  if (passScore === null || !Number.isFinite(passScore)) return null;
  return (score ?? 0) >= passScore ? 'pass' : 'fail';
}

/** Pass/Fail/Absent for every student. Manual overrides (pass|fail) always win. */
export function computeContestOutcomes(input: {
  students: MappingStudent[];
  participants: MappingParticipant[];
  passScore: number | null;
  overrides: Record<string, 'pass' | 'fail'>;
}): { outcomes: StudentOutcome[]; claimedBy: Map<string, string> } {
  const { matches, claimedBy } = mapStudentsToParticipants(input.students, input.participants);
  const participantsByUsername = new Map(input.participants.map((participant) => [key(participant.username), participant]));

  const outcomes = input.students.map((student) => {
    const match = matches.get(student.id) as StudentMatch;
    let auto: ContestResult | null = null;
    if (match.status === 'matched') {
      auto = autoResult(participantsByUsername.get(key(match.username))?.score ?? null, input.passScore);
    } else if (match.status === 'not_found') {
      auto = 'absent';
    }
    const override = input.overrides[student.id];
    return {
      studentId: student.id,
      match,
      autoResult: auto,
      result: override ?? auto,
      resultSource: override ? 'manual' as const : auto ? 'auto' as const : null,
    };
  });
  return { outcomes, claimedBy };
}

export function summarizeOutcomes(outcomes: StudentOutcome[]) {
  return {
    pass: outcomes.filter((outcome) => outcome.result === 'pass').length,
    fail: outcomes.filter((outcome) => outcome.result === 'fail').length,
    absent: outcomes.filter((outcome) => outcome.result === 'absent').length,
    ambiguous: outcomes.filter((outcome) => outcome.match.status === 'ambiguous').length,
    manual: outcomes.filter((outcome) => outcome.resultSource === 'manual').length,
    matched: outcomes.filter((outcome) => outcome.match.status === 'matched').length,
  };
}
