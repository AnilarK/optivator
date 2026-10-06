'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, ExternalLink, Loader2, Search } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import {
  ConnectionPanel,
  ContestStatusBadge,
  ErrorBanner,
  formatDateTime,
  formatMinutes,
  formatPercent,
  Panel,
  RefreshButton,
  StatCard,
} from '@/components/contests/shared';
import { participantSolveTime, submissionCodeUrl } from '@/lib/hackerrank-admin/analytics';
import type { ContestAnalytics, ContestInfo, ParticipantRow } from '@/lib/hackerrank-admin/analytics';
import type { AdminSessionStatus } from '@/lib/hackerrank-admin/session';
import { ContestMappingView, PrimaryContestPanel, postJson, ResultBadge } from '@/components/contests/PrimaryContestPanel';
import { ResultOverrideSelect, StudentMappingPanel } from '@/components/contests/StudentMappingPanel';
import { useToast } from '@/components/ui/ToastContext';

interface DetailResponse {
  data: { contest: ContestInfo; analytics: ContestAnalytics; warnings: string[] } | null;
  fetchedAt: string | null;
  stale: boolean;
  error: { code: string; message: string } | null;
  mapping?: ContestMappingView | null;
  session?: AdminSessionStatus;
}

/** When the participant finished: latest first-accepted time across solved questions (max, not sum). */
function solveTime(row: ParticipantRow): number | null {
  return row.solveTimeMinutes !== undefined ? row.solveTimeMinutes : participantSolveTime(row.challenges);
}

type SortKey = 'rank' | 'score' | 'finish' | 'solved' | 'attempts' | `challenge:${string}`;

const CHALLENGE_COLORS = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500', 'bg-violet-500'];

function Bar({ value, max, color = 'bg-indigo-500' }: { value: number; max: number; color?: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${max > 0 ? Math.max(2, (value / max) * 100) : 0}%` }} />
    </div>
  );
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export default function ContestDetailPage({ params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params.slug);
  const [detail, setDetail] = useState<DetailResponse['data']>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; stale: boolean } | null>(null);
  const [session, setSession] = useState<AdminSessionStatus | null>(null);
  const [mapping, setMapping] = useState<ContestMappingView | null>(null);
  const [show, setShow] = useState<'all' | 'students' | 'unlinked' | 'pass' | 'fail'>('all');
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('rank');

  const load = useCallback(async (refresh: boolean) => {
    if (refresh) setRefreshing(true);
    try {
      const response = await fetch(`/api/hackerrank-admin/contests/${encodeURIComponent(slug)}${refresh ? '?refresh=1' : ''}`);
      const data = (await response.json()) as DetailResponse;
      if (data.session) setSession(data.session);
      setDetail(data.data);
      setMapping(data.mapping || null);
      setFetchedAt(data.fetchedAt);
      setError(data.error ? { message: data.error.message, stale: data.stale } : null);
    } catch {
      setError({ message: 'Could not reach the server.', stale: false });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [slug]);

  useEffect(() => {
    load(false);
  }, [load]);

  const analytics = detail?.analytics;
  const contest = detail?.contest;
  const challenges = analytics?.challenges ?? [];
  const students = useMemo(() => mapping?.links ?? {}, [mapping]);
  const isPrimary = Boolean(mapping?.setting?.isPrimary);
  const reload = useCallback(() => load(false), [load]);
  const available = useMemo(
    () => (analytics?.participants ?? [])
      .filter((row) => !students[row.username.toLowerCase()])
      .map((row) => ({ username: row.username, name: row.name ?? null, score: row.score }))
      .sort((a, b) => (a.name || a.username).localeCompare(b.name || b.username)),
    [analytics, students],
  );

  const unlink = async (studentId: string, fullName: string, username: string) => {
    if (!window.confirm(`Unlink @${username} from ${fullName}? They will not be matched automatically again until you link them.`)) return;
    try {
      await postJson('/api/hackerrank-admin/mapping', 'POST', { studentId, username: null });
      showToast(`Unlinked ${fullName}`, 'success');
      reload();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not unlink', 'error');
    }
  };

  const participants = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = (analytics?.participants ?? []).filter((row) => {
      const link = students[row.username.toLowerCase()];
      if (show === 'students' && !link) return false;
      if (show === 'unlinked' && link) return false;
      if ((show === 'pass' || show === 'fail') && link?.result !== show) return false;
      return true;
    }).filter((row) =>
      !query ||
      [row.username, row.name, students[row.username.toLowerCase()]?.fullName, row.country, row.school]
        .some((value) => value?.toLowerCase().includes(query)),
    );
    const inf = Number.POSITIVE_INFINITY;
    const compare: Record<string, (a: ParticipantRow, b: ParticipantRow) => number> = {
      rank: (a, b) => (a.rank ?? inf) - (b.rank ?? inf),
      score: (a, b) => (b.score ?? -1) - (a.score ?? -1) || (solveTime(a) ?? inf) - (solveTime(b) ?? inf),
      finish: (a, b) => b.solvedCount - a.solvedCount || (solveTime(a) ?? inf) - (solveTime(b) ?? inf),
      solved: (a, b) => b.solvedCount - a.solvedCount || (a.rank ?? inf) - (b.rank ?? inf),
      attempts: (a, b) => b.attempts - a.attempts,
    };
    const sorter = sortKey.startsWith('challenge:')
      ? (a: ParticipantRow, b: ParticipantRow) => {
          const key = sortKey.slice('challenge:'.length);
          return (a.challenges[key]?.firstAcceptedMinutes ?? inf) - (b.challenges[key]?.firstAcceptedMinutes ?? inf);
        }
      : compare[sortKey];
    return [...rows].sort(sorter);
  }, [analytics, search, sortKey, students, show]);

  const exportCsv = () => {
    if (!analytics || !contest) return;
    const header = ['Rank', 'Name', 'Username', 'Student in tracker', ...(isPrimary ? ['Result'] : []), 'Score', 'Solved', 'Time taken (min, last question solved)', 'Attempts', ...challenges.flatMap((c) => [`${c.name} first accepted (min)`, `${c.name} attempts`]), 'Languages', 'Country', 'School'];
    const lines = analytics.participants.map((row) => [
      row.rank, row.name || students[row.username.toLowerCase()]?.fullName, row.username, students[row.username.toLowerCase()]?.fullName, ...(isPrimary ? [students[row.username.toLowerCase()]?.result ?? ''] : []), row.score, `${row.solvedCount}/${challenges.length}`, solveTime(row), row.attempts,
      ...challenges.flatMap((c) => [row.challenges[c.slug]?.firstAcceptedMinutes ?? '', row.challenges[c.slug]?.attempts ?? 0]),
      row.languages.join(' '), row.country, row.school,
    ].map(csvCell).join(','));
    const blob = new Blob([[header.map(csvCell).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${contest.slug}-leaderboard.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const maxDistribution = Math.max(0, ...(analytics?.scoreDistribution ?? []).map((entry) => entry.count));
  const maxStatus = Math.max(0, ...(analytics?.statusBreakdown ?? []).map((entry) => entry.count));
  const maxLanguage = Math.max(0, ...(analytics?.languageBreakdown ?? []).map((entry) => entry.submissions));
  const timelineMax = Math.max(0, ...(analytics?.solveTimeline.buckets ?? []).map((bucket) => Object.values(bucket.counts).reduce((sum, count) => sum + count, 0)));

  return (
    <div className="flex-1 flex flex-col">
      <Header title={contest?.name || slug} subtitle="HackerRank contest analytics" showImport={false} />

      <div className="p-8 space-y-5 max-w-[1400px] w-full mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <Link href="/contests" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-indigo-700">
            <ArrowLeft className="h-3.5 w-3.5" /> All contests
          </Link>
          <div className="flex items-center gap-3">
            <p className="text-[11px] text-slate-500">{fetchedAt ? `Last fetched ${formatDateTime(fetchedAt)}` : ''}</p>
            <RefreshButton onClick={() => load(true)} busy={refreshing} />
          </div>
        </div>

        {session && (session.lastError || !session.connected) && (
          <ConnectionPanel status={session} onStatusChange={(status) => { setSession(status); load(true); }} />
        )}
        {error && <ErrorBanner message={error.message} stale={error.stale} />}
        {detail?.warnings?.map((warning) => <ErrorBanner key={warning} message={warning} />)}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-24 text-xs text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            Loading contest, leaderboard and every submission page…
          </div>
        ) : !contest || !analytics ? (
          <div className="py-24 text-center text-xs text-slate-500">No data for this contest yet.</div>
        ) : (
          <>
            {/* Contest info */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">{contest.name}</h2>
                    <ContestStatusBadge status={contest.status} />
                  </div>
                  <p className="font-mono text-[11px] text-slate-400">{contest.slug}</p>
                  <p className="text-xs text-slate-600">
                    {formatDateTime(contest.startTime)} → {formatDateTime(contest.endTime)}
                    {contest.durationMinutes !== null && <span className="text-slate-400"> · {contest.durationMinutes} min</span>}
                    {contest.isPublic !== null && <span className="text-slate-400"> · {contest.isPublic ? 'public' : 'private'}</span>}
                  </p>
                  {contest.description && <p className="text-xs text-slate-500 max-w-3xl whitespace-pre-line line-clamp-3">{contest.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <a href={contest.contestUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    Contest page <ExternalLink className="h-3 w-3" />
                  </a>
                  {contest.adminUrl && (
                    <a href={contest.adminUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      Manage on HackerRank <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </section>

            <PrimaryContestPanel
              slug={contest.slug}
              contestName={contest.name}
              maxScore={analytics.overview.maxPossibleScore ?? analytics.overview.highestScore}
              mapping={mapping}
              onChanged={reload}
            />

            {/* Overview */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              <StatCard label="Participants" value={analytics.overview.participants} hint={`${analytics.overview.submitters} submitted code`} />
              <StatCard label="Submissions" value={analytics.overview.inContestSubmissions} hint={`${analytics.overview.acceptedSubmissions} accepted · ${analytics.overview.practiceSubmissions} practice`} />
              <StatCard label="Average score" value={analytics.overview.averageScore ?? '—'} hint={`median ${analytics.overview.medianScore ?? '—'} · max ${analytics.overview.maxPossibleScore ?? analytics.overview.highestScore ?? '—'}`} />
              <StatCard label="Perfect scores" value={analytics.overview.perfectScores} hint={formatPercent(analytics.overview.participants ? analytics.overview.perfectScores / analytics.overview.participants : null)} />
              <StatCard label={`Solved all ${challenges.length}`} value={analytics.overview.solvedAll} />
              <StatCard label="Zero score" value={analytics.overview.zeroScores} />
            </div>

            {/* Challenges */}
            <Panel title="Questions">
              <div className="overflow-x-auto -m-4">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-2.5 px-4">Question</th>
                      <th className="py-2.5 px-3 text-right">Max score</th>
                      <th className="py-2.5 px-3 text-right">Attempted</th>
                      <th className="py-2.5 px-3 text-right">Solved</th>
                      <th className="py-2.5 px-3 text-right">Solve rate</th>
                      <th className="py-2.5 px-3 text-right">Submissions</th>
                      <th className="py-2.5 px-3 text-right">Acceptance</th>
                      <th className="py-2.5 px-3 text-right">Median solve</th>
                      <th className="py-2.5 px-3 text-right">Avg tries</th>
                      <th className="py-2.5 px-4">Fastest</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {challenges.map((challenge, index) => (
                      <tr key={challenge.slug}>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${CHALLENGE_COLORS[index % CHALLENGE_COLORS.length]}`} />
                            <span className="font-semibold text-slate-800">{challenge.name}</span>
                            {challenge.difficulty && <span className="text-[10px] text-slate-400">{challenge.difficulty}</span>}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right">{challenge.maxScore ?? '—'}</td>
                        <td className="py-2.5 px-3 text-right">{challenge.attempted}</td>
                        <td className="py-2.5 px-3 text-right font-semibold">{challenge.solved}</td>
                        <td className="py-2.5 px-3 text-right">{formatPercent(challenge.solveRate)}</td>
                        <td className="py-2.5 px-3 text-right">{challenge.submissions}</td>
                        <td className="py-2.5 px-3 text-right">{formatPercent(challenge.acceptanceRate)}</td>
                        <td className="py-2.5 px-3 text-right">{formatMinutes(challenge.medianFirstAcceptedMinutes)}</td>
                        <td className="py-2.5 px-3 text-right">{challenge.averageAttemptsToSolve ?? '—'}</td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {challenge.fastestSolve ? `${challenge.fastestSolve.username} · ${formatMinutes(challenge.fastestSolve.minutes)}` : '—'}
                        </td>
                      </tr>
                    ))}
                    {challenges.length === 0 && (
                      <tr><td colSpan={10} className="py-6 text-center text-slate-400">No question data available.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <Panel title="Score distribution">
                <div className="space-y-2">
                  {analytics.scoreDistribution.map((entry) => (
                    <div key={entry.score} className="grid grid-cols-[3rem_1fr_2rem] items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-700">{entry.score}</span>
                      <Bar value={entry.count} max={maxDistribution} />
                      <span className="text-right text-slate-500">{entry.count}</span>
                    </div>
                  ))}
                  {analytics.scoreDistribution.length === 0 && <p className="text-xs text-slate-400">No scores yet.</p>}
                </div>
              </Panel>
              <Panel title="Submission results">
                <div className="space-y-2">
                  {analytics.statusBreakdown.map((entry) => (
                    <div key={entry.status} className="grid grid-cols-[8rem_1fr_2rem] items-center gap-2 text-xs">
                      <span className="truncate text-slate-700">{entry.status}</span>
                      <Bar value={entry.count} max={maxStatus} color={entry.status === 'Accepted' ? 'bg-emerald-500' : 'bg-rose-400'} />
                      <span className="text-right text-slate-500">{entry.count}</span>
                    </div>
                  ))}
                  {analytics.statusBreakdown.length === 0 && <p className="text-xs text-slate-400">No submissions.</p>}
                </div>
              </Panel>
              <Panel title="Languages">
                <div className="space-y-2">
                  {analytics.languageBreakdown.map((entry) => (
                    <div key={entry.language} className="grid grid-cols-[6rem_1fr_4.5rem] items-center gap-2 text-xs">
                      <span className="truncate font-mono text-slate-700">{entry.language}</span>
                      <Bar value={entry.submissions} max={maxLanguage} color="bg-sky-500" />
                      <span className="text-right text-slate-500">{entry.submissions} · {entry.participants}p</span>
                    </div>
                  ))}
                  {analytics.languageBreakdown.length === 0 && <p className="text-xs text-slate-400">No submissions.</p>}
                </div>
              </Panel>
            </div>

            {timelineMax > 0 && (
              <Panel
                title={`First solves over time (${analytics.solveTimeline.bucketMinutes}-minute buckets)`}
                action={
                  <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
                    {challenges.map((challenge, index) => (
                      <span key={challenge.slug} className="inline-flex items-center gap-1">
                        <span className={`h-2 w-2 rounded-full ${CHALLENGE_COLORS[index % CHALLENGE_COLORS.length]}`} />{challenge.name}
                      </span>
                    ))}
                  </div>
                }
              >
                <div className="flex items-end gap-1 h-40">
                  {analytics.solveTimeline.buckets.map((bucket) => {
                    const total = Object.values(bucket.counts).reduce((sum, count) => sum + count, 0);
                    return (
                      <div key={bucket.startMinute} className="flex-1 flex flex-col items-center gap-1 h-full justify-end" title={`${bucket.startMinute}–${bucket.startMinute + analytics.solveTimeline.bucketMinutes} min: ${total} solves`}>
                        <div className="w-full flex flex-col-reverse rounded-t overflow-hidden" style={{ height: `${(total / timelineMax) * 100}%` }}>
                          {challenges.map((challenge, index) => (
                            <div key={challenge.slug} className={CHALLENGE_COLORS[index % CHALLENGE_COLORS.length]} style={{ flexGrow: bucket.counts[challenge.slug] || 0 }} />
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400">{bucket.startMinute}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-slate-400">Minutes after contest start at which each question was first accepted.</p>
              </Panel>
            )}

            {/* Leaderboard */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 border-b border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Leaderboard <span className="font-normal normal-case text-slate-400">· {participants.length} of {analytics.participants.length}</span>
                </h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search name, username, country…"
                      className="w-full sm:w-64 rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <select
                    value={show}
                    onChange={(event) => setShow(event.target.value as typeof show)}
                    aria-label="Show participants"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="all">Show: everyone</option>
                    <option value="students">Show: my students only</option>
                    <option value="unlinked">Show: not linked to a student</option>
                    {isPrimary && <option value="pass">Show: students who passed</option>}
                    {isPrimary && <option value="fail">Show: students who failed</option>}
                  </select>
                  <select
                    value={sortKey}
                    onChange={(event) => setSortKey(event.target.value as SortKey)}
                    aria-label="Sort leaderboard"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="rank">Sort: rank</option>
                    <option value="score">Sort: score, then time taken</option>
                    <option value="finish">Sort: most solved, then fastest finish</option>
                    <option value="solved">Sort: questions solved</option>
                    <option value="attempts">Sort: most attempts</option>
                    {challenges.map((challenge) => (
                      <option key={challenge.slug} value={`challenge:${challenge.slug}`}>Sort: fastest {challenge.name}</option>
                    ))}
                  </select>
                  <button type="button" onClick={exportCsv} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    <Download className="h-3.5 w-3.5 text-slate-500" /> Export CSV
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-2.5 px-4">Rank</th>
                      <th className="py-2.5 px-3">Hacker</th>
                      {isPrimary && <th className="py-2.5 px-3">Result</th>}
                      <th className="py-2.5 px-3 text-right">Score</th>
                      <th className="py-2.5 px-3 text-center">Solved</th>
                      {challenges.map((challenge) => (
                        <th key={challenge.slug} className="py-2.5 px-3 whitespace-nowrap">{challenge.name}</th>
                      ))}
                      <th className="py-2.5 px-3 text-right" title="Minutes after contest start when the last solved question was first accepted (the max across questions, not the sum)">Time taken</th>
                      <th className="py-2.5 px-3 text-right">Attempts</th>
                      <th className="py-2.5 px-4">Languages</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {participants.map((row) => (
                      <tr key={row.key} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-semibold text-slate-700">{row.rank ?? '—'}</td>
                        <td className="py-2.5 px-3">
                          {(() => {
                            const student = students[row.username.toLowerCase()];
                            const displayName = row.name || student?.fullName;
                            return (
                              <>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-slate-800">{displayName || row.username}</span>
                                  {student && (
                                    <Link
                                      href={`/students/${student.id}`}
                                      title={`In student tracker as ${student.fullName} (matched by ${student.matchType})`}
                                      className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100"
                                    >
                                      Student
                                    </Link>
                                  )}
                                  {student && (
                                    <button
                                      type="button"
                                      onClick={() => unlink(student.id, student.fullName, row.username)}
                                      title={`Unlink from ${student.fullName}`}
                                      aria-label={`Unlink from ${student.fullName}`}
                                      className="rounded-full px-1 text-[11px] leading-none text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400">
                                  <a href={`https://www.hackerrank.com/profile/${encodeURIComponent(row.username)}`} target="_blank" rel="noreferrer" className="font-mono hover:text-indigo-700">
                                    @{row.username}
                                  </a>
                                  {[row.country, row.school].filter(Boolean).map((value) => ` · ${value}`).join('')}
                                  {!row.onLeaderboard && ' · not on leaderboard'}
                                </p>
                              </>
                            );
                          })()}
                        </td>
                        {isPrimary && (
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {(() => {
                              const link = students[row.username.toLowerCase()];
                              return link ? (
                                <div className="flex items-center gap-1.5">
                                  <ResultBadge result={link.result} source={link.resultSource} />
                                  <ResultOverrideSelect studentId={link.id} slug={contest.slug} source={link.resultSource} result={link.result} onChanged={reload} />
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-300" title="Link this participant to a student in Student mapping below">not a student</span>
                              );
                            })()}
                          </td>
                        )}
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-800">{row.score ?? '—'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            challenges.length && row.solvedCount === challenges.length
                              ? 'bg-emerald-50 text-emerald-700'
                              : row.solvedCount > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {row.solvedCount}/{challenges.length}
                          </span>
                        </td>
                        {challenges.map((challenge) => {
                          const result = row.challenges[challenge.slug];
                          return (
                            <td key={challenge.slug} className="py-2.5 px-3 whitespace-nowrap">
                              {result?.solved ? (
                                <span className="text-slate-800">
                                  {(() => {
                                    const codeUrl = submissionCodeUrl(contest.contestUrl, challenge.slug, result.firstAcceptedSubmissionId);
                                    return codeUrl ? (
                                      <a
                                        href={codeUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        title={`Open ${row.name || row.username}'s accepted ${challenge.name} code on HackerRank`}
                                        className="font-medium text-indigo-700 underline decoration-indigo-200 underline-offset-2 hover:decoration-indigo-600"
                                      >
                                        {formatMinutes(result.firstAcceptedMinutes)}
                                      </a>
                                    ) : (
                                      <span title="Refresh from HackerRank to enable the code link">{formatMinutes(result.firstAcceptedMinutes)}</span>
                                    );
                                  })()}
                                  {result.wrongBeforeAccept ? <span className="ml-1 text-[10px] text-rose-500">+{result.wrongBeforeAccept} wrong</span> : null}
                                </span>
                              ) : result ? (
                                <span className="text-slate-400">Not solved · {result.attempts} tries</span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2.5 px-3 text-right text-slate-600">{formatMinutes(solveTime(row))}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600">{row.attempts}</td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">{row.languages.join(', ') || '—'}</td>
                      </tr>
                    ))}
                    {participants.length === 0 && (
                      <tr><td colSpan={(isPrimary ? 8 : 7) + challenges.length} className="py-8 text-center text-slate-400">No participants match.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {mapping && <StudentMappingPanel slug={contest.slug} mapping={mapping} available={available} onChanged={reload} />}
          </>
        )}
      </div>
    </div>
  );
}
