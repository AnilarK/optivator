'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Link2, Loader2, Search } from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';
import { ContestMappingView, postJson, ResultBadge } from '@/components/contests/PrimaryContestPanel';

interface AvailableParticipant {
  username: string;
  name: string | null;
  score: number | null;
}

const REASON_LABEL: Record<string, string> = {
  ambiguous: 'Same name as another student / participant',
  no_account: 'No HackerRank account linked',
  unlinked: 'Unlinked manually',
  not_in_contest: 'Linked, but did not take this contest',
};

export function ResultOverrideSelect({
  studentId,
  slug,
  source,
  onChanged,
}: {
  studentId: string;
  slug: string;
  source: string | null;
  result: string | null;
  onChanged: () => void;
}) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <select
      value={source === 'manual' ? 'manual' : 'auto'}
      disabled={busy}
      aria-label="Override result"
      title="Override the automatic result"
      onChange={async (event) => {
        const value = event.target.value;
        if (value === 'manual') return;
        setBusy(true);
        try {
          await postJson('/api/hackerrank-admin/overrides', 'POST', { studentId, contestSlug: slug, result: value });
          onChanged();
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Could not save result', 'error');
        } finally {
          setBusy(false);
        }
      }}
      className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-600 focus:border-indigo-500 focus:outline-none"
    >
      <option value="auto">Auto</option>
      {source === 'manual' && <option value="manual" disabled>Manual</option>}
      <option value="pass">Mark pass</option>
      <option value="fail">Mark fail</option>
    </select>
  );
}

function AssignControl({
  studentId,
  candidates,
  available,
  onChanged,
}: {
  studentId: string;
  candidates: string[];
  available: AvailableParticipant[];
  onChanged: () => void;
}) {
  const { showToast } = useToast();
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const candidateSet = new Set(candidates.map((candidate) => candidate.toLowerCase()));
  const suggested = available.filter((participant) => candidateSet.has(participant.username.toLowerCase()));
  const others = available.filter((participant) => !candidateSet.has(participant.username.toLowerCase()));
  const label = (participant: AvailableParticipant) =>
    `${participant.name || participant.username} · @${participant.username} · score ${participant.score ?? '—'}`;

  const assign = async () => {
    if (!username) return;
    setBusy(true);
    try {
      await postJson('/api/hackerrank-admin/mapping', 'POST', { studentId, username });
      showToast(`Linked to @${username}`, 'success');
      setUsername('');
      onChanged();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not link', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        aria-label="HackerRank participant"
        className="w-64 max-w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 focus:border-indigo-500 focus:outline-none"
      >
        <option value="">{available.length ? 'Choose participant…' : 'No unlinked participants left'}</option>
        {suggested.length > 0 && (
          <optgroup label="Same name">
            {suggested.map((participant) => <option key={participant.username} value={participant.username}>{label(participant)}</option>)}
          </optgroup>
        )}
        <optgroup label="Unlinked participants">
          {others.map((participant) => <option key={participant.username} value={participant.username}>{label(participant)}</option>)}
        </optgroup>
      </select>
      <button
        type="button"
        onClick={assign}
        disabled={!username || busy}
        className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />} Link
      </button>
    </div>
  );
}

export function StudentMappingPanel({
  slug,
  mapping,
  available,
  onChanged,
}: {
  slug: string;
  mapping: ContestMappingView;
  available: AvailableParticipant[];
  onChanged: () => void;
}) {
  const isPrimary = Boolean(mapping.setting?.isPrimary);
  const [view, setView] = useState<'needs' | 'absent'>('needs');
  const [search, setSearch] = useState('');

  const needs = mapping.unmatched.filter((student) => student.reason !== 'not_in_contest');
  const absentLinked = mapping.unmatched.filter((student) => student.reason === 'not_in_contest');
  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (view === 'needs' ? needs : absentLinked).filter((student) =>
      !query || [student.fullName, student.email, student.college, student.hackerRankUsername].some((value) => value?.toLowerCase().includes(query)),
    );
  }, [view, needs, absentLinked, search]);

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-2xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 border-b border-slate-100">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Student mapping</h3>
          <p className="mt-1 text-[11px] text-slate-500">
            Students are matched by saved HackerRank username, then by exact full name (case-insensitive).
            Link the rest by hand — links are saved on the student and reused for every contest.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-[11px] font-medium">
            <button type="button" onClick={() => setView('needs')} className={`rounded-md px-2.5 py-1.5 ${view === 'needs' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500'}`}>
              Not linked ({needs.length})
            </button>
            <button type="button" onClick={() => setView('absent')} className={`rounded-md px-2.5 py-1.5 ${view === 'absent' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500'}`}>
              Linked but absent ({absentLinked.length})
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search students…"
              className="w-full sm:w-52 rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="py-2.5 px-4">Student</th>
              <th className="py-2.5 px-3">Why</th>
              <th className="py-2.5 px-3">Link to participant</th>
              {isPrimary && <th className="py-2.5 px-4">Result</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((student) => (
              <tr key={student.id} className={student.status === 'ambiguous' ? 'bg-amber-50/40' : undefined}>
                <td className="py-2.5 px-4">
                  <Link href={`/students/${student.id}`} className="font-semibold text-slate-800 hover:text-indigo-700">{student.fullName}</Link>
                  <p className="text-[11px] text-slate-400">{[student.email, student.college, student.passingYear].filter(Boolean).join(' · ')}</p>
                </td>
                <td className="py-2.5 px-3 text-[11px] text-slate-500">
                  {REASON_LABEL[student.status === 'ambiguous' ? 'ambiguous' : student.reason || 'no_account']}
                  {student.hackerRankUsername && <span className="block font-mono text-slate-400">@{student.hackerRankUsername}</span>}
                </td>
                <td className="py-2.5 px-3">
                  <AssignControl studentId={student.id} candidates={student.candidates} available={available} onChanged={onChanged} />
                </td>
                {isPrimary && (
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <ResultBadge result={student.result} source={student.resultSource} />
                      <ResultOverrideSelect studentId={student.id} slug={slug} source={student.resultSource} result={student.result} onChanged={onChanged} />
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={isPrimary ? 4 : 3} className="py-8 text-center text-slate-400">
                  {view === 'needs' ? 'Every student is linked to a HackerRank account.' : 'No linked students are missing from this contest.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-2.5 border-t border-slate-100 text-[11px] text-slate-400">
        {available.length} contest participant{available.length === 1 ? ' is' : 's are'} not linked to any student.
      </p>
    </section>
  );
}
