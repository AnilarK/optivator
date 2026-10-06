'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Database, GraduationCap } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    {
      name: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      active: pathname === '/',
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-slate-900 leading-tight text-base tracking-tight">Student Tracker</h1>
          <p className="text-[11px] font-medium text-slate-400">Recruitment & Evaluation</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Main Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                item.active
                  ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  item.active ? 'text-indigo-600' : 'text-slate-400'
                }`}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Local Database Status Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-semibold text-slate-800">Local SQLite</span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-auto" />
        </div>
        <p className="text-[11px] text-slate-500 mt-1 font-mono truncate">
          ./data/students.db
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          Persistent offline storage
        </p>
      </div>
    </aside>
  );
}
