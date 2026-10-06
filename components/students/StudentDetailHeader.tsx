'use client';

import React from 'react';
import Link from 'next/link';
import { StudentRecord } from '@/lib/types';
import { StageBadge } from '@/components/ui/StageBadge';
import { ArrowLeft, Edit2, Trash2 } from 'lucide-react';

interface StudentDetailHeaderProps {
  student: StudentRecord;
  onStageChange: (newStage: string) => Promise<void>;
  onEdit: () => void;
  onDelete: () => void;
}

export function StudentDetailHeader({
  student,
  onStageChange,
  onEdit,
  onDelete,
}: StudentDetailHeaderProps) {
  return (
    <div className="bg-white border-b border-slate-200 px-8 py-6">
      <div className="flex flex-col gap-4">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Candidates</span>
        </Link>

        {/* Profile Title and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 text-indigo-700 flex items-center justify-center font-bold text-xl border border-indigo-200/50">
              {student.fullName
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {student.fullName}
                </h1>
                <StageBadge
                  stage={student.stage}
                  isInteractive={true}
                  onStageChange={onStageChange}
                  size="md"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                {student.registrationNo && (
                  <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    {student.registrationNo}
                  </span>
                )}
                {student.college && <span>• {student.college}</span>}
                {student.specialization && <span>• {student.specialization}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit Details</span>
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
