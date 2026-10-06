'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { Upload, Plus, Download } from 'lucide-react';
import { AppTabs } from '@/components/layout/AppTabs';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onOpenNewStudent?: () => void;
  onExportCsv?: () => void;
  onImportFile?: (file: File) => void;
  isExporting?: boolean;
  showImport?: boolean;
}

export function Header({
  title = 'Student Dashboard',
  subtitle = 'Manage applicants, review candidate stages, and track recruitments',
  onOpenNewStudent,
  onExportCsv,
  onImportFile,
  isExporting = false,
  showImport = true,
}: HeaderProps) {
  const importInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src="/aptivators-logo.svg"
            alt="aptivators"
            className="h-10 w-auto max-w-[150px] object-contain"
          />
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {onExportCsv && (
            <button
              onClick={onExportCsv}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          )}

          {onImportFile ? (
            <>
              <input
                ref={importInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onImportFile(file);
                  event.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-xs transition-colors hover:bg-slate-50"
              >
                <Upload className="h-3.5 w-3.5 text-slate-500" />
                <span>Import CSV</span>
              </button>
            </>
          ) : showImport && (
            <Link
              href="/import"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-xs transition-colors hover:bg-slate-50"
            >
              <Upload className="h-3.5 w-3.5 text-slate-500" />
              <span>Import CSV</span>
            </Link>
          )}

          {onOpenNewStudent && (
            <button
              onClick={onOpenNewStudent}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-100"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Student</span>
            </button>
          )}
        </div>
      </div>
      <AppTabs />
    </header>
  );
}
