'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, Search, Trophy } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import {
  ConnectionPanel,
  ContestStatusBadge,
  ErrorBanner,
  formatDateTime,
  RefreshButton,
  StatCard,
} from '@/components/contests/shared';
import type { AdminContestSummary, ContestStatus } from '@/lib/hackerrank-admin/analytics';
import type { AdminSessionStatus } from '@/lib/hackerrank-admin/session';

interface ContestsResponse {
  data: { contests: AdminContestSummary[] } | null;
  fetchedAt: string | null;
  stale: boolean;
  error: { code: string; message: string } | null;
  session: AdminSessionStatus;
}

export default function ContestsPage() {
  const [contests, setContests] = useState<AdminContestSummary[] | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; stale: boolean } | null>(null);
  const [session, setSession] = useState<AdminSessionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ContestStatus>('all');

  const load = useCallback(async (refresh: boolean) => {
    if (refresh) setRefreshing(true);
    try {
      const statusResponse = await fetch('/api/hackerrank-admin/session');
      const statusData = await statusResponse.json();
      setSession(statusData.status);
      const configured = statusData.status?.credentialsConfigured || statusData.status?.manualCookieConfigured;
      if (!configured) {
        setContests(null);
        setError(null);
        return;
      }
      const response = await fetch(`/api/hackerrank-admin/contests${refresh ? '?refresh=1' : ''}`);
      const data = (await response.json()) as ContestsResponse;
      if (data.session) setSession(data.session);
      setContests(data.data?.contests ?? null);
      setFetchedAt(data.fetchedAt);
      setError(data.error ? { message: data.error.message, stale: data.stale } : null);
    } catch {
      setError({ message: 'Could not reach the server.', stale: false });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (contests || []).filter((contest) =>
      (statusFilter === 'all' || contest.status === statusFilter) &&
      (!query || contest.name.toLowerCase().includes(query) || contest.slug.toLowerCase().includes(query) || contest.owner?.toLowerCase().includes(query)),
    );
  }, [contests, search, statusFilter]);

  const counts = useMemo(() => {
    const list = contests || [];
    return {
      total: list.length,
      live: list.filter((contest) => contest.status === 'live').length,
      upcoming: list.filter((contest) => contest.status === 'upcoming').length,
      participants: list.reduce((sum, contest) => sum + (contest.participantCount || 0), 0),
    };
  }, [contests]);

  const configured = session?.credentialsConfigured || session?.manualCookieConfigured;

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="HackerRank Contests"
        subtitle="Contests created or moderated by the connected HackerRank account"
        showImport={false}
      />

      <div className="p-8 space-y-5 max-w-[1400px] w-full mx-auto">
        <ConnectionPanel status={session} onStatusChange={(status) => { setSession(status); load(true); }} />

        {configured && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-[11px] text-slate-500">
                {fetchedAt ? `Last fetched ${formatDateTime(fetchedAt)}` : 'Not fetched yet'}
              </p>
              <RefreshButton onClick={() => load(true)} busy={refreshing} />
            </div>

            {error && <ErrorBanner message={error.message} stale={error.stale} />}

            {contests && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Contests" value={counts.total} />
                <StatCard label="Live now" value={counts.live} />
                <StatCard label="Upcoming" value={counts.upcoming} />
                <StatCard label="Participants (all contests)" value={counts.participants} />
              </div>
            )}

            <section className="bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex flex-col md:flex-row md:items-center gap-3 p-4 border-b border-slate-100">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by contest name, slug or owner…"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                  aria-label="Contest status"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="all">All statuses</option>
                  <option value="live">Live</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="ended">Ended</option>
                </select>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-xs text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                  Loading contests from HackerRank…
                </div>
              ) : !contests ? (
                <div className="py-16 text-center text-xs text-slate-500">No contest data yet. Use Refresh once the account is connected.</div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16 text-xs text-slate-500">
                  <Trophy className="h-6 w-6 text-slate-300" />
                  {contests.length === 0 ? 'This account has not created any contests.' : 'No contests match the current filters.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-3 px-4">Contest</th>
                        <th className="py-3 px-3">Owner</th>
                        <th className="py-3 px-3">Starts</th>
                        <th className="py-3 px-3">Ends</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Signups</th>
                        <th className="py-3 px-4 text-right">Participants</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.map((contest) => (
                        <tr key={contest.slug} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4">
                            <Link href={`/contests/${encodeURIComponent(contest.slug)}`} className="font-semibold text-indigo-700 hover:underline">
                              {contest.name}
                            </Link>
                            <p className="font-mono text-[11px] text-slate-400 mt-0.5">{contest.slug}{contest.archived ? ' · archived' : ''}</p>
                          </td>
                          <td className="py-3 px-3 text-slate-600">{contest.owner || '—'}</td>
                          <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{formatDateTime(contest.startTime)}</td>
                          <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{formatDateTime(contest.endTime)}</td>
                          <td className="py-3 px-3"><ContestStatusBadge status={contest.status} /></td>
                          <td className="py-3 px-3 text-right text-slate-700">{contest.signupCount ?? '—'}</td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-800">{contest.participantCount ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
