'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Star, StarOff } from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

export interface MappingSummary {
  pass: number;
  fail: number;
  absent: number;
  ambiguous: number;
  manual: number;
  matched: number;
}

export interface ContestMappingView {
  setting: { passScore: number | null; isPrimary: boolean } | null;
  primary: { slug: string; name: string } | null;
  links: Record<string, {
    id: string;
    fullName: string;
    matchType: string;
    result: string | null;
    resultSource: string | null;
    autoResult: string | null;
  }>;
  unmatched: {
    id: string;
    fullName: string;
    email: string | null;
    college: string | null;
    passingYear: number | null;
    hackerRankUsername: string | null;
    status: 'ambiguous' | 'not_found';
    reason: 'no_account' | 'not_in_contest' | 'unlinked' | null;
    candidates: string[];
    result: string | null;
    resultSource: string | null;
  }[];
  summary: MappingSummary;
}

export async function postJson(url: string, method: string, body: unknown) {
  const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || 'Request failed');
  return data;
}

export function ResultBadge({ result, source }: { result: string | null; source?: string | null }) {
  const styles: Record<string, string> = {
    pass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    fail: 'bg-rose-50 text-rose-700 border-rose-200',
    absent: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  if (!result) return <span className="text-[11px] text-slate-400">—</span>;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${styles[result] || styles.absent}`}>
      {result}
      {source === 'manual' && <span className="font-normal opacity-70" title="Set manually">✎</span>}
    </span>
  );
}

export function PrimaryContestPanel({
  slug,
  contestName,
  maxScore,
  mapping,
  onChanged,
}: {
  slug: string;
  contestName: string;
  maxScore: number | null;
  mapping: ContestMappingView | null;
  onChanged: () => void;
}) {
  const { showToast } = useToast();
  const isPrimary = Boolean(mapping?.setting?.isPrimary);
  const suggested = mapping?.setting?.passScore ?? (maxScore ? Math.round(maxScore * 0.6) : 60);
  const [passScore, setPassScore] = useState(String(suggested));
  const [busy, setBusy] = useState<'set' | 'save' | 'unset' | null>(null);

  useEffect(() => {
    setPassScore(String(mapping?.setting?.passScore ?? (maxScore ? Math.round(maxScore * 0.6) : 60)));
  }, [mapping?.setting?.passScore, maxScore]);

  const run = async (kind: 'set' | 'save' | 'unset') => {
    if (kind === 'set' && mapping?.primary && mapping.primary.slug !== slug &&
      !window.confirm(`"${mapping.primary.name}" is the current primary contest. Replace it with "${contestName}" on the dashboard?`)) {
      return;
    }
    if (kind === 'unset' && !window.confirm('Stop using this contest on the dashboard? Pass/Fail and scores will be cleared from students (their HackerRank links are kept).')) {
      return;
    }
    setBusy(kind);
    try {
      if (kind === 'unset') {
        await postJson('/api/hackerrank-admin/primary', 'DELETE', {});
        showToast('Primary contest removed from the dashboard', 'success');
      } else {
        const data = await postJson('/api/hackerrank-admin/primary', kind === 'set' ? 'PUT' : 'PATCH', { slug, passScore });
        const summary = data.summary as MappingSummary | null;
        showToast(summary
          ? `Dashboard updated: ${summary.pass} pass · ${summary.fail} fail · ${summary.absent} absent${summary.ambiguous ? ` · ${summary.ambiguous} need mapping` : ''}`
          : 'Saved', 'success');
      }
      onChanged();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not update', 'error');
    } finally {
      setBusy(null);
    }
  };

  const summary = mapping?.summary;
  const cutoffChanged = isPrimary && Number(passScore) !== mapping?.setting?.passScore;

  return (
    <section className={`rounded-xl border p-4 shadow-2xs ${isPrimary ? 'border-indigo-200 bg-indigo-50/50' : 'border-slate-200 bg-white'}`}>
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="text-xs">
          <p className="flex items-center gap-1.5 font-semibold text-slate-800">
            <Star className={`h-4 w-4 ${isPrimary ? 'fill-indigo-500 text-indigo-500' : 'text-slate-400'}`} />
            {isPrimary ? 'Primary contest — drives the Students dashboard' : 'Not the primary contest'}
          </p>
          <p className="mt-1 text-slate-500">
            {isPrimary
              ? <>Pass / Fail / Absent, score and question times from this contest are shown and filterable on the <Link href="/" className="text-indigo-700 underline">Students dashboard</Link>.</>
              : mapping?.primary
                ? <>The dashboard currently uses <Link href={`/contests/${encodeURIComponent(mapping.primary.slug)}`} className="text-indigo-700 underline">{mapping.primary.name}</Link>.</>
                : 'No contest is primary yet. Make this one primary to get Pass/Fail on the dashboard.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            Pass if score ≥
            <input
              type="number"
              min={0}
              step="any"
              value={passScore}
              onChange={(event) => setPassScore(event.target.value)}
              className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
              aria-label="Pass score cutoff"
            />
            {maxScore !== null && <span className="text-slate-400">/ {maxScore}</span>}
          </label>
          {isPrimary ? (
            <>
              <button
                type="button"
                onClick={() => run('save')}
                disabled={!cutoffChanged || busy !== null}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy === 'save' && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save cutoff
              </button>
              <button
                type="button"
                onClick={() => run('unset')}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {busy === 'unset' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <StarOff className="h-3.5 w-3.5 text-slate-500" />} Remove primary
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => run('set')}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {busy === 'set' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5" />} Make primary
            </button>
          )}
        </div>
      </div>

      {isPrimary && summary && (
        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800">{summary.pass} pass</span>
          <span className="rounded-full bg-rose-100 px-2.5 py-1 font-semibold text-rose-800">{summary.fail} fail</span>
          <span className="rounded-full bg-slate-200 px-2.5 py-1 font-semibold text-slate-700">{summary.absent} absent</span>
          {summary.ambiguous > 0 && <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800">{summary.ambiguous} need mapping</span>}
          {summary.manual > 0 && <span className="rounded-full bg-white px-2.5 py-1 text-slate-600 border border-slate-200">{summary.manual} set manually ✎</span>}
        </div>
      )}
    </section>
  );
}
