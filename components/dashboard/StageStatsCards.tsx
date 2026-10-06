'use client';

import React from 'react';
import { STAGES, getStageConfig } from '@/lib/stages';
import { ArrowUpRight, Users } from 'lucide-react';

interface StageStatsCardsProps {
  total: number;
  stageCounts: Record<string, number>;
  activeStage?: string;
  onSelectStage: (stage: string) => void;
}

export function StageStatsCards({
  total,
  stageCounts,
  activeStage,
  onSelectStage,
}: StageStatsCardsProps) {
  const isTotalActive = !activeStage || activeStage === 'all';

  const renderStageCard = (stage: (typeof STAGES)[number]) => {
    const config = getStageConfig(stage);
    const count = stageCounts[stage] || 0;
    const isActive = activeStage === stage;
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

    return (
      <button
        key={stage}
        type="button"
        onClick={() => onSelectStage(isActive ? 'all' : stage)}
        aria-pressed={isActive}
        className={`group relative min-h-[132px] overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 cursor-pointer ${
          isActive
            ? `border-current ${config.textLight} bg-white ring-2 ring-current/10 shadow-md`
            : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md'
        }`}
      >
        <span className={`absolute inset-x-0 top-0 h-1 ${config.dotColor}`} />
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold">{stage}</span>
          <span className={`h-2 w-2 shrink-0 rounded-full ${config.dotColor} ${isActive ? 'ring-4 ring-slate-100' : ''}`} />
        </div>
        <div className="mt-5 flex items-end justify-between gap-2">
          <div>
            <div className="text-2xl font-bold tracking-tight">{count}</div>
            <span className="text-[11px] text-slate-400">{percentage}% of pipeline</span>
          </div>
          <ArrowUpRight className="h-4 w-4 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {/* Total Card */}
      <button
        type="button"
        onClick={() => onSelectStage('all')}
        aria-pressed={isTotalActive}
        className={`group relative col-span-2 min-h-[132px] overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 cursor-pointer ${
          isTotalActive
            ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-200/60 ring-2 ring-indigo-600/15'
            : 'border-slate-200 bg-white text-slate-800 shadow-sm hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md'
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-[0.16em] ${isTotalActive ? 'text-indigo-100' : 'text-slate-400'}`}>
              Pipeline
            </span>
            <p className={`mt-1 text-sm font-semibold ${isTotalActive ? 'text-white' : 'text-slate-800'}`}>
              All candidates
            </p>
          </div>
          <span className={`rounded-lg p-2 ${isTotalActive ? 'bg-white/15 text-indigo-100' : 'bg-indigo-50 text-indigo-600'}`}>
            <Users className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <div className="text-3xl font-bold tracking-tight">{total}</div>
            <span className={`text-[11px] ${isTotalActive ? 'text-indigo-100' : 'text-slate-400'}`}>students in database</span>
          </div>
          <ArrowUpRight className={`h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${isTotalActive ? 'text-indigo-200' : 'text-slate-400'}`} />
        </div>
      </button>

      {STAGES.slice(0, 4).map(renderStageCard)}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Results</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
        {STAGES.slice(4).map(renderStageCard)}
      </div>
    </div>
  );
}
