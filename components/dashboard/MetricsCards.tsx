'use client';

import React from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { DashboardStats } from '@/lib/types';

interface MetricsCardsProps {
  stats: DashboardStats;
  onSelectBacklog: (backlogs: 'none' | 'has') => void;
}

export function MetricsCards({ stats, onSelectBacklog }: MetricsCardsProps) {
  const cards = [
    {
      title: 'No Backlogs',
      value: stats.noBacklogsCount,
      subtitle: `${stats.total > 0 ? Math.round((stats.noBacklogsCount / stats.total) * 100) : 0}% clean record`,
      icon: CheckCircle,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      onClick: () => onSelectBacklog('none'),
    },
    {
      title: 'Active Backlogs',
      value: stats.hasBacklogsCount,
      subtitle: 'Candidates with backlogs',
      icon: AlertTriangle,
      color: 'text-rose-600 bg-rose-50 border-rose-100',
      onClick: () => onSelectBacklog('has'),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.title}
            type="button"
            onClick={card.onClick}
            disabled={!card.onClick}
            className="bg-white rounded-xl border border-slate-200 p-3.5 flex items-center justify-between shadow-2xs"
          >
            <div>
              <p className="text-xs font-medium text-slate-500">{card.title}</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{card.value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{card.subtitle}</p>
            </div>
            <div className={`p-2.5 rounded-lg border ${card.color}`}>
              <Icon className="w-4 h-4" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
