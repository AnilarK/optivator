'use client';

import React from 'react';
import { StudentRecord } from '@/lib/types';
import { GraduationCap, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AcademicInfoCardProps {
  student: StudentRecord;
}

export function AcademicInfoCard({ student }: AcademicInfoCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-indigo-600" />
          <span>Academic Records</span>
        </h3>
      </div>
      <div className="p-5 space-y-4 text-xs">
        {/* College & Course */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-slate-400">College / Institute</span>
            <p className="font-semibold text-slate-900 text-sm">
              {student.college || 'Not specified'}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Degree & Specialization</span>
            <p className="font-semibold text-slate-900 text-sm">
              {[student.course, student.specialization].filter(Boolean).join(' - ') || 'Not specified'}
            </p>
          </div>
        </div>

        {/* Scores & Passing Year Highlight Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          {/* CGPA */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/70">
            <span className="text-[10px] uppercase font-semibold text-slate-500">Graduation CGPA</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-slate-900">
                {student.graduationCGPA !== null && student.graduationCGPA !== undefined
                  ? student.graduationCGPA.toFixed(2)
                  : 'N/A'}
              </span>
              <span className="text-[10px] text-slate-400">/ 10</span>
            </div>
          </div>

          {/* Passing Year */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/70">
            <span className="text-[10px] uppercase font-semibold text-slate-500">Passing Year</span>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {student.passingYear || 'N/A'}
            </div>
          </div>

          {/* 12th Percentage */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/70">
            <span className="text-[10px] uppercase font-semibold text-slate-500">Class 12th</span>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {student.class12Percentage !== null && student.class12Percentage !== undefined
                ? `${student.class12Percentage.toFixed(1)}%`
                : 'N/A'}
            </div>
          </div>

          {/* 10th Percentage */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/70">
            <span className="text-[10px] uppercase font-semibold text-slate-500">Class 10th</span>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {student.class10Percentage !== null && student.class10Percentage !== undefined
                ? `${student.class10Percentage.toFixed(1)}%`
                : 'N/A'}
            </div>
          </div>
        </div>

        {/* Backlogs Status Banner */}
        <div className="pt-2">
          {student.activeBacklogs ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-rose-900 block">Active Backlogs Reported</span>
                <span className="text-rose-700 text-xs">
                  {student.activeBacklogsRaw || 'Candidate has active uncleared backlog subjects.'}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-semibold text-emerald-900">No Active Backlogs</span>
                <span className="text-emerald-700 text-xs block">
                  All semester coursework is currently cleared.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
