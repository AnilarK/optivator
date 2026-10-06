'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Trophy } from 'lucide-react';

const TABS = [
  { name: 'Students', href: '/', icon: Users, isActive: (pathname: string) => !pathname.startsWith('/contests') },
  { name: 'HackerRank Contests', href: '/contests', icon: Trophy, isActive: (pathname: string) => pathname.startsWith('/contests') },
];

export function AppTabs() {
  const pathname = usePathname() || '/';
  return (
    <nav className="flex items-center gap-1 -mb-5 mt-4" aria-label="Sections">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = tab.isActive(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              active
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
            {tab.name}
          </Link>
        );
      })}
    </nav>
  );
}
