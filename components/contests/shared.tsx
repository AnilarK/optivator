'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, PlugZap, RefreshCw } from 'lucide-react';
import type { ContestStatus } from '@/lib/hackerrank-admin/analytics';
import type { AdminSessionStatus } from '@/lib/hackerrank-admin/session';
import { useToast } from '@/components/ui/ToastContext';

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatMinutes(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return `${value < 10 ? value.toFixed(1) : Math.round(value * 10) / 10} min`;
}

export function formatSeconds(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  const total = Math.round(value);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes ? `${minutes}m ${seconds.toString().padStart(2, '0')}s` : `${seconds}s`;
}

export function formatPercent(value: number | null | undefined) {
  return value === null || value === undefined ? '—' : `${Math.round(value * 100)}%`;
}

const STATUS_STYLES: Record<ContestStatus, string> = {
  live: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  upcoming: 'bg-sky-50 text-sky-700 border-sky-200',
  ended: 'bg-slate-100 text-slate-600 border-slate-200',
  unknown: 'bg-slate-50 text-slate-500 border-slate-200',
};

export function ContestStatusBadge({ status }: { status: ContestStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLES[status]}`}>
      {status === 'live' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
      {status}
    </span>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="text-xl font-bold text-slate-900 mt-0.5">{value}</p>
      {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-2xs">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function RefreshButton({ onClick, busy, label = 'Refresh from HackerRank' }: { onClick: () => void; busy: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-xs transition-colors hover:bg-slate-50 disabled:opacity-60"
    >
      <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${busy ? 'animate-spin' : ''}`} />
      {busy ? 'Refreshing…' : label}
    </button>
  );
}

export function ErrorBanner({ message, stale }: { message: string; stale?: boolean }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        {message}
        {stale && <span className="block mt-0.5 text-amber-700">Showing the last successfully fetched data.</span>}
      </span>
    </div>
  );
}

export function ConnectionPanel({
  status,
  onStatusChange,
}: {
  status: AdminSessionStatus | null;
  onStatusChange: (status: AdminSessionStatus) => void;
}) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  const reconnect = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/hackerrank-admin/session', { method: 'POST' });
      const data = await response.json();
      if (data.status) onStatusChange(data.status);
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not connect to HackerRank');
      showToast(`Connected to HackerRank as ${data.status.username}`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not connect to HackerRank', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!status) return null;
  const configured = status.credentialsConfigured || status.manualCookieConfigured;

  if (!configured) {
    return (
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 text-xs text-slate-700">
        <div className="flex items-center gap-2 font-semibold text-indigo-800">
          <KeyRound className="h-4 w-4" /> Connect a HackerRank account
        </div>
        <p className="mt-2">
          Add the admin account to the server environment — <code className="font-mono">.env</code> locally (never commit it), or the project&apos;s Environment Variables on Vercel — then restart or redeploy:
        </p>
        <pre className="mt-2 rounded-lg bg-white border border-indigo-100 p-3 font-mono text-[11px] text-slate-700 overflow-x-auto">{`HACKERRANK_ADMIN_LOGIN='your-username-or-email'
HACKERRANK_ADMIN_PASSWORD='your-password'`}</pre>
        <p className="mt-2 text-slate-500">
          Keep the single quotes. If the password contains <code className="font-mono">$</code>, write it as <code className="font-mono">\$</code> (or use <code className="font-mono">HACKERRANK_ADMIN_PASSWORD_BASE64</code>).
        </p>
        <p className="mt-2 text-slate-500">
          This account is separate from the student-sync session. The app logs in on the server, re-logs in automatically when the session expires, and never sends the password or cookies to the browser.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-2xs">
      <div className="flex items-center gap-2.5 text-xs">
        {status.connected && !status.lastError ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : status.lastError ? (
          <AlertTriangle className="h-4 w-4 text-amber-600" />
        ) : (
          <PlugZap className="h-4 w-4 text-slate-400" />
        )}
        <div>
          <p className="font-semibold text-slate-800">
            {status.connected
              ? `Connected${status.username ? ` as ${status.username}` : ''}`
              : 'Not connected yet'}
            <span className="ml-2 font-normal text-slate-400">
              {status.sessionSource === 'manual' ? 'manual session cookie' : status.login ? `login ${status.login}` : ''}
            </span>
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {status.lastError
              ? status.lastError.message
              : status.connected
                ? `Session since ${formatDateTime(status.sessionObtainedAt)} · re-login is automatic when it expires`
                : 'The app will log in automatically on the first request.'}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={reconnect}
        disabled={busy}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlugZap className="h-3.5 w-3.5 text-slate-500" />}
        {busy ? 'Connecting…' : 'Reconnect'}
      </button>
    </div>
  );
}
