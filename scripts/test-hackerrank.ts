import assert from 'node:assert/strict';
import {
  buildHackerRankPerformance,
  fetchAllHackerRankPages,
  HackerRankParticipant,
  HackerRankStudent,
  HackerRankSubmission,
  matchHackerRankStudents,
} from '../lib/hackerrank';
import { buildStudentWhere } from '../lib/student-query';
import { buildHackerRankHeaders, getHackerRankAuth } from '../lib/hackerrank-sync';

const participants: HackerRankParticipant[] = [
  { hackerId: '101', username: 'student123', name: 'ALEX SMITH', rank: 1, score: 100, timeTaken: 960 },
  { hackerId: '102', username: 'alex-two', name: 'Alex Smith', rank: 2, score: 60 },
  { hackerId: '103', username: 'name-match', name: '  Jordan   Lee  ', rank: 3, score: 40 },
];

const students: HackerRankStudent[] = [
  { id: 'username', fullName: 'Unrelated Name', hackerRankUsername: 'STUDENT123' },
  { id: 'name', fullName: 'jOrDaN Lee', hackerRankUsername: null },
  { id: 'ambiguous', fullName: 'Alex Smith', hackerRankUsername: null },
  { id: 'missing', fullName: 'Nobody Here', hackerRankUsername: null },
  { id: 'username-mismatch', fullName: 'Jordan Lee', hackerRankUsername: 'wrong-handle' },
];

const matches = matchHackerRankStudents(students, participants);
const usernameMatch = matches.get('username');
assert.ok(usernameMatch && 'participant' in usernameMatch);
assert.equal(usernameMatch.participant.username, 'student123');
const nameMatch = matches.get('name');
assert.ok(nameMatch && 'participant' in nameMatch);
assert.equal(nameMatch.participant.username, 'name-match');
assert.deepEqual(matches.get('ambiguous'), { ambiguous: true });
assert.equal(matches.get('missing'), null);
assert.equal(matches.get('username-mismatch'), null);
const establishedNameMatch = matchHackerRankStudents([{
  id: 'established-name',
  fullName: 'Jordan Lee',
  hackerRankUsername: 'name-match',
  hackerRankId: '103',
  hackerRankMatchType: 'name',
}], participants).get('established-name');
assert.ok(establishedNameMatch && 'participant' in establishedNameMatch);
assert.equal(establishedNameMatch.matchType, 'name');

const submissions: HackerRankSubmission[] = [
  { id: 1, hacker_id: 101, hacker_username: 'student123', challenge_id: 11, challenge: { name: 'Castle on the Grid', slug: 'castle-on-the-grid' }, status: 'Wrong Answer', in_contest_bounds: true, time_from_start: 3 },
  { id: 2, hacker_id: 101, hacker_username: 'student123', challenge_id: 11, challenge: { name: 'Castle on the Grid', slug: 'castle-on-the-grid' }, status: 'Wrong Answer', in_contest_bounds: true, time_from_start: 7 },
  { id: 3, hacker_id: 101, hacker_username: 'student123', challenge_id: 11, challenge: { name: 'Castle on the Grid', slug: 'castle-on-the-grid' }, status: 'Accepted', in_contest_bounds: true, time_from_start: 12, score: 40 },
  { id: 4, hacker_id: 101, hacker_username: 'student123', challenge_id: 11, challenge: { name: 'Castle on the Grid', slug: 'castle-on-the-grid' }, status: 'Accepted', in_contest_bounds: true, time_from_start: 15, score: 40 },
  { id: 5, hacker_id: 101, hacker_username: 'student123', challenge_id: 12, challenge: { name: 'New Year Chaos', slug: 'new-year-chaos' }, status: 'Accepted', in_contest_bounds: true, time_from_start: 16, score: 60 },
  { id: 6, hacker_id: 101, hacker_username: 'student123', challenge_id: 12, challenge: { name: 'New Year Chaos', slug: 'new-year-chaos' }, status: 'Accepted', in_contest_bounds: true, time_from_start: 20, score: 60 },
  { id: 7, hacker_id: 101, hacker_username: 'student123', challenge_id: 12, challenge: { name: 'New Year Chaos', slug: 'new-year-chaos' }, status: 'Accepted', in_contest_bounds: false, time_from_start: 2, score: 60 },
];

const performance = buildHackerRankPerformance({
  match: matches.get('username') || null,
  submissions,
  questionSlugs: ['castle-on-the-grid', 'new-year-chaos'],
});
assert.equal(performance.matchStatus, 'matched');
assert.equal(performance.matchType, 'username');
assert.equal(performance.score, 100);
assert.equal(performance.questionsSolved, 2);
assert.equal(performance.questions[0].firstAcceptedAtMinutes, 12);
assert.equal(performance.questions[0].firstAcceptedAtSeconds, 720);
assert.equal(performance.questions[0].score, 40);
assert.equal(performance.questions[1].firstAcceptedAtMinutes, 16);

const reverseOrder = buildHackerRankPerformance({
  match: { participant: { ...participants[0], hackerId: '201', username: 'reverse' }, matchType: 'username' },
  submissions: [
    { hacker_id: 201, hacker_username: 'reverse', challenge_id: 12, challenge: { name: 'New Year Chaos', slug: 'new-year-chaos' }, status: 'Accepted', in_contest_bounds: true, time_from_start: 9 },
    { hacker_id: 201, hacker_username: 'reverse', challenge_id: 11, challenge: { name: 'Castle on the Grid', slug: 'castle-on-the-grid' }, status: 'Accepted', in_contest_bounds: true, time_from_start: 14 },
  ],
  questionSlugs: ['castle-on-the-grid', 'new-year-chaos'],
});
assert.deepEqual(reverseOrder.questions.map((question) => question.firstAcceptedAtMinutes), [14, 9]);

const oneSolved = buildHackerRankPerformance({
  match: { participant: participants[0], matchType: 'username' },
  submissions: submissions.slice(0, 4),
  questionSlugs: ['castle-on-the-grid', 'new-year-chaos'],
});
assert.equal(oneSolved.questionsSolved, 1);
assert.equal(oneSolved.questions[1].solved, false);

const noSolved = buildHackerRankPerformance({
  match: { participant: participants[0], matchType: 'username' },
  submissions: [],
  questionSlugs: ['castle-on-the-grid', 'new-year-chaos'],
});
assert.equal(noSolved.score, 100);
assert.equal(noSolved.questionsSolved, 0);
assert.equal(noSolved.questions[0].firstAcceptedAtMinutes, null);

const ambiguousPerformance = buildHackerRankPerformance({
  match: matches.get('ambiguous') || null,
  submissions: [],
  questionSlugs: ['castle-on-the-grid', 'new-year-chaos'],
});
assert.equal(ambiguousPerformance.matchStatus, 'ambiguous');
assert.equal(ambiguousPerformance.username, null);

const missingProfilePerformance = buildHackerRankPerformance({
  match: matches.get('missing') || null,
  submissions: [],
  questionSlugs: ['castle-on-the-grid', 'new-year-chaos'],
});
assert.equal(missingProfilePerformance.matchStatus, 'not_found');

const timestampFallback = buildHackerRankPerformance({
  match: { participant: participants[0], matchType: 'username' },
  submissions: [{
    hacker_id: 101,
    challenge_id: 11,
    challenge: { name: 'Castle on the Grid', slug: 'castle-on-the-grid' },
    status: 'Accepted',
    in_contest_bounds: true,
    created_at: 1_000_720,
  }],
  questionSlugs: ['castle-on-the-grid'],
  contestStartAt: 1_000_000,
});
assert.equal(timestampFallback.questions[0].firstAcceptedAtMinutes, 12);

const acceptedWithoutTime = buildHackerRankPerformance({
  match: { participant: participants[0], matchType: 'username' },
  submissions: [{
    hacker_id: 101,
    challenge_id: 11,
    challenge: { name: 'Castle on the Grid', slug: 'castle-on-the-grid' },
    status: 'Accepted',
    in_contest_bounds: true,
  }],
  questionSlugs: ['castle-on-the-grid'],
});
assert.equal(acceptedWithoutTime.questionsSolved, 1);
assert.equal(acceptedWithoutTime.questions[0].firstAcceptedAtMinutes, null);

async function testPagination() {
  const offsets: number[] = [];
  const allRecords = await fetchAllHackerRankPages(
    async (offset, limit) => {
      offsets.push(offset);
      assert.equal(limit, 2);
      const pages: Record<number, { models: { id: number }[]; total: number }> = {
        0: { models: [{ id: 1 }, { id: 2 }], total: 4 },
        2: { models: [{ id: 2 }, { id: 3 }], total: 4 },
        4: { models: [{ id: 4 }], total: 4 },
      };
      return pages[offset];
    },
    2,
    (record) => record.id,
  );
  assert.deepEqual(offsets, [0, 2, 4]);
  assert.deepEqual(allRecords.map((record) => record.id), [1, 2, 3, 4]);

  await assert.rejects(() => fetchAllHackerRankPages(
    async () => ({ models: [{ id: 1 }], total: 2 }),
    1,
    (record) => record.id,
    1,
  ), /pagination ended/);
  await assert.rejects(() => fetchAllHackerRankPages(
    async () => { throw new Error('mock API failure'); },
    1,
    (record: { id: number }) => record.id,
  ), /mock API failure/);
}

function testDashboardFilters() {
  const scoreWhere = buildStudentWhere(new URLSearchParams('hackerRankMinScore=60&hackerRankMaxScore=100'));
  assert.deepEqual(scoreWhere.hackerRankScore, { gte: 60, lte: 100 });

  const statusWhere = buildStudentWhere(new URLSearchParams('hackerRankStatus=ambiguous'));
  assert.equal(statusWhere.hackerRankMatchStatus, 'ambiguous');

  const q1Where = buildStudentWhere(new URLSearchParams('hackerRankQ1After=20'));
  assert.deepEqual(q1Where.AND, [{ hackerRankQuestion1Minutes: { not: null, gt: 20 } }]);

  const q2Where = buildStudentWhere(new URLSearchParams('hackerRankQ2Within=20'));
  assert.deepEqual(q2Where.AND, [{ hackerRankQuestion2Minutes: { not: null, lte: 20 } }]);

  const bothAfterWhere = buildStudentWhere(new URLSearchParams('hackerRankCombinedTimeMode=both_after&hackerRankCombinedTime=20'));
  assert.equal((bothAfterWhere.AND as unknown[]).length, 2);

  const bothWithinWhere = buildStudentWhere(new URLSearchParams('hackerRankCombinedTimeMode=both_within&hackerRankCombinedTime=20'));
  assert.equal((bothWithinWhere.AND as unknown[]).length, 2);

  const atLeastOneWhere = buildStudentWhere(new URLSearchParams('hackerRankCombinedTimeMode=any_after&hackerRankCombinedTime=20'));
  assert.ok('OR' in (atLeastOneWhere.AND as Record<string, unknown>[])[0]);

  const solvedCountWhere = buildStudentWhere(new URLSearchParams('hackerRankSolvedCount=2'));
  assert.equal(solvedCountWhere.hackerRankQuestionsSolved, 2);
}

function testAuthConfiguration() {
  const original = { ...process.env };
  process.env.HACKERRANK_SESSION_COOKIE = '  "Cookie: _hrank_session=abc; hackerrank_mixpanel_token=xyz"\n';
  process.env.HACKERRANK_CSRF_TOKEN = "'x-csrf-token: token123'";
  assert.deepEqual(getHackerRankAuth(), {
    cookie: '_hrank_session=abc; hackerrank_mixpanel_token=xyz',
    csrfToken: 'token123',
  });
  const headers = buildHackerRankHeaders('https://www.hackerrank.com', 'optus-sde-hiring-assessment-2026');
  assert.equal(headers.get('Cookie'), '_hrank_session=abc; hackerrank_mixpanel_token=xyz');
  assert.equal(headers.get('X-CSRF-Token'), 'token123');
  assert.ok(headers.get('User-Agent'));

  process.env.HACKERRANK_SESSION_COOKIE = '';
  process.env.HACKERRANK_CSRF_TOKEN = '  ';
  const anonymous = buildHackerRankHeaders('https://www.hackerrank.com', 'contest');
  assert.equal(anonymous.has('Cookie'), false);
  assert.equal(anonymous.has('X-CSRF-Token'), false);
  process.env = original;
}

testDashboardFilters();
testAuthConfiguration();
testPagination().then(() => {
  console.log('HackerRank integration tests passed.');
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});