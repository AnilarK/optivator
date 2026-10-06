'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: number) => void;
}

export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  if (total === 0) return null;

  const startIdx = (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 border-t border-slate-200 bg-white rounded-b-xl text-xs text-slate-600">
      <div className="flex items-center gap-3">
        <span>
          Showing <span className="font-semibold text-slate-900">{startIdx}</span> to{' '}
          <span className="font-semibold text-slate-900">{endIdx}</span> of{' '}
          <span className="font-semibold text-slate-900">{total}</span> candidates
        </span>

        <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-3">
          <span className="text-[11px] text-slate-500">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
            className="border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="px-2.5 py-1 font-medium text-slate-700">
          Page {page} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
