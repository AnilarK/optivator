'use client';

import React from 'react';
import Link from 'next/link';
import { StudentRecord } from '@/lib/types';
import { StageBadge } from '@/components/ui/StageBadge';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Eye,
  Edit2,
  Trash2,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';

interface StudentTableProps {
  students: StudentRecord[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  allSelected: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
  onStageChange: (studentId: string, newStage: string) => Promise<void>;
  onEditStudent: (student: StudentRecord) => void;
  onDeleteStudent: (student: StudentRecord) => void;
  onViewResume?: (student: StudentRecord) => void;
  isLoading?: boolean;
}

export function StudentTable({
  students,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allSelected,
  sortBy,
  sortOrder,
  onSort,
  onStageChange,
  onEditStudent,
  onDeleteStudent,
  isLoading = false,
}: StudentTableProps) {
  const renderSortIcon = (field: string) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 ml-1" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-indigo-600 ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-indigo-600 ml-1" />
    );
  };

  const formatDate = (dateString: string | Date) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="overflow-x-auto bg-white border border-slate-200 rounded-t-xl shadow-2xs">
      <table className="w-full text-left text-xs text-slate-600 border-collapse">
        <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[10px]">
          <tr>
            {/* Checkbox */}
            <th className="py-3 px-3.5 w-10 text-center">
              <input
                type="checkbox"
                checked={allSelected && students.length > 0}
                onChange={onToggleSelectAll}
                className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                aria-label="Select all students on this page"
              />
            </th>

            {/* Name */}
            <th
              className="py-3 px-3 cursor-pointer select-none group hover:bg-slate-100/60 transition-colors"
              onClick={() => onSort('fullName')}
            >
              <div className="flex items-center">
                <span>Name & Contact</span>
                {renderSortIcon('fullName')}
              </div>
            </th>

            {/* College */}
            <th className="py-3 px-3">College / Institute</th>

            {/* Branch */}
            <th className="py-3 px-3">Branch</th>

            {/* Graduation */}
            <th
              className="py-3 px-2.5 cursor-pointer select-none group hover:bg-slate-100/60 transition-colors"
              onClick={() => onSort('passingYear')}
            >
              <div className="flex items-center">
                <span>Batch</span>
                {renderSortIcon('passingYear')}
              </div>
            </th>

            {/* CGPA */}
            <th
              className="py-3 px-2.5 cursor-pointer select-none group hover:bg-slate-100/60 transition-colors"
              onClick={() => onSort('graduationCGPA')}
            >
              <div className="flex items-center">
                <span>CGPA</span>
                {renderSortIcon('graduationCGPA')}
              </div>
            </th>

            {/* School Scores */}
            <th className="py-3 px-2.5">10th %</th>
            <th className="py-3 px-2.5">12th %</th>

            {/* Backlogs */}
            <th className="py-3 px-2.5">Backlogs</th>

            {/* Manual Ratings */}
            <th className="py-3 px-2.5">ATS</th>
            <th className="py-3 px-2.5">CF</th>
            <th className="py-3 px-2.5">LC</th>
            <th className="py-3 px-2.5">CC</th>

            <th className="py-3 px-3">HackerRank Contest</th>

            {/* Stage */}
            <th
              className="py-3 px-3 cursor-pointer select-none group hover:bg-slate-100/60 transition-colors"
              onClick={() => onSort('stage')}
            >
              <div className="flex items-center">
                <span>Stage</span>
                {renderSortIcon('stage')}
              </div>
            </th>

            {/* Resume */}
            <th className="py-3 px-3 text-center">Resume</th>

            {/* Last Updated */}
            <th
              className="py-3 px-3 cursor-pointer select-none group hover:bg-slate-100/60 transition-colors"
              onClick={() => onSort('updatedAt')}
            >
              <div className="flex items-center">
                <span>Updated</span>
                {renderSortIcon('updatedAt')}
              </div>
            </th>

            {/* Actions */}
            <th className="py-3 px-3 text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {isLoading && students.length === 0 ? (
            <tr>
              <td colSpan={18} className="py-12 text-center text-slate-400">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mb-2" />
                <p>Loading candidate data...</p>
              </td>
            </tr>
          ) : students.length === 0 ? (
            <tr>
              <td colSpan={18} className="py-12 text-center text-slate-500">
                <div className="max-w-xs mx-auto space-y-2">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-700">No students found</p>
                  <p className="text-xs text-slate-400">
                    Try adjusting your search or filters, or import a new CSV file.
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            students.map((student) => {
              const isSelected = selectedIds.includes(student.id);
              const commentCount = student._count?.comments ?? 0;

              return (
                <tr
                  key={student.id}
                  className={`hover:bg-slate-50/70 transition-colors group ${
                    isSelected ? 'bg-indigo-50/40' : ''
                  }`}
                >
                  {/* Row Checkbox */}
                  <td className="py-3 px-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(student.id)}
                      className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                      aria-label={`Select ${student.fullName}`}
                    />
                  </td>

                  {/* Name & Email & Comments Badge */}
                  <td className="py-3 px-3">
                    <div className="flex items-start gap-1.5">
                      <div>
                        <Link
                          href={`/students/${student.id}`}
                          title={student.fullName}
                          className="font-semibold text-slate-900 hover:text-indigo-600 hover:underline transition-colors block text-xs"
                        >
                          {student.fullName}
                        </Link>
                        <div className="text-[11px] text-slate-500 truncate max-w-[190px]">
                          <span title={student.emailAddress || student.emailId || student.registrationNo || 'No email'}>
                            {student.emailAddress || student.emailId || student.registrationNo || 'No email'}
                          </span>
                        </div>
                      </div>
                      {commentCount > 0 && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 ml-1 mt-0.5"
                          title={`${commentCount} comment${commentCount > 1 ? 's' : ''}`}
                        >
                          <MessageSquare className="w-2.5 h-2.5 text-slate-400" />
                          <span>{commentCount}</span>
                        </span>
                      )}
                    </div>
                  </td>

                  {/* College */}
                  <td className="py-3 px-3" title={student.college || undefined}>
                    <div className="group/college relative max-w-[170px]">
                      <div className="truncate text-slate-700">
                        {student.college || <span className="text-slate-300">—</span>}
                      </div>
                      {student.college && (
                        <div className="pointer-events-none invisible absolute left-0 top-full z-50 mt-1 w-max max-w-[360px] rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium normal-case tracking-normal text-white opacity-0 shadow-lg transition-opacity group-hover/college:visible group-hover/college:opacity-100">
                          {student.college}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Branch */}
                  <td className="py-3 px-3">
                    <div className="max-w-[150px] truncate text-slate-700" title={student.specialization || ''}>
                      {student.specialization || <span className="text-slate-300">—</span>}
                    </div>
                  </td>

                  {/* Graduation Year */}
                  <td className="py-3 px-2.5 font-medium text-slate-700" title={student.passingYear?.toString() || ''}>
                    {student.passingYear || <span className="text-slate-300">—</span>}
                  </td>

                  {/* CGPA */}
                  <td className="py-3 px-2.5">
                    {student.graduationCGPA !== null && student.graduationCGPA !== undefined ? (
                      <span
                        title={student.graduationCGPA.toFixed(2)}
                        className={`font-semibold ${
                          student.graduationCGPA >= 8.5
                            ? 'text-emerald-700'
                            : student.graduationCGPA >= 7.0
                            ? 'text-slate-800'
                            : 'text-amber-700'
                        }`}
                      >
                        {student.graduationCGPA.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>

                  {/* School Scores */}
                  <td className="py-3 px-2.5">
                    {student.class10Percentage !== null && student.class10Percentage !== undefined
                      ? <span title={`${student.class10Percentage}%`}>{student.class10Percentage.toFixed(1)}%</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-3 px-2.5">
                    {student.class12Percentage !== null && student.class12Percentage !== undefined
                      ? <span title={`${student.class12Percentage}%`}>{student.class12Percentage.toFixed(1)}%</span>
                      : <span className="text-slate-300">—</span>}
                  </td>

                  {/* Backlogs */}
                  <td className="py-3 px-2.5">
                    {student.activeBacklogs ? (
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                        title={student.activeBacklogsRaw || 'Has active backlogs'}
                      >
                        Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        No
                      </span>
                    )}
                  </td>

                  {/* Manual Ratings */}
                  <td className="py-3 px-2.5 font-medium text-slate-700">
                    {student.atsScore ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-3 px-2.5 font-medium text-slate-700">
                    {student.cfRating ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-3 px-2.5 font-medium text-slate-700">
                    {student.leetcodeRating ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-3 px-2.5 font-medium text-slate-700">
                    {student.codechefRating ?? <span className="text-slate-300">—</span>}
                  </td>

                  <td className="py-3 px-3 min-w-[190px]">
                    {student.hackerRankResult && (
                      <span
                        className={`mb-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          student.hackerRankResult === 'pass'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : student.hackerRankResult === 'fail'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                        title={`${student.hackerRankContestName || 'HackerRank contest'}${student.hackerRankResultSource === 'manual' ? ' · set manually' : ''}`}
                      >
                        {student.hackerRankResult}
                        {student.hackerRankResultSource === 'manual' && <span className="font-normal normal-case">✎</span>}
                      </span>
                    )}
                    <div className="font-semibold text-slate-800" title={student.hackerRankUsername || undefined}>
                      {student.hackerRankMatchStatus === 'matched'
                        ? student.hackerRankUsername || 'Matched'
                        : student.hackerRankMatchStatus === 'ambiguous'
                        ? 'Needs mapping'
                        : student.hackerRankMatchStatus === 'not_found'
                        ? student.hackerRankUsername ? `@${student.hackerRankUsername} · did not take it` : 'No HackerRank account'
                        : 'Not synced'}
                    </div>
                    {student.hackerRankMatchStatus === 'matched' ? (
                      <>
                        <div className="text-[10px] text-slate-400">
                          Matched by {student.hackerRankMatchType || 'username'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Score {student.hackerRankScore ?? 0} · Rank {student.hackerRankRank ?? '—'} · {student.hackerRankQuestionsSolved ?? 0}/{student.hackerRankQuestions?.length ?? 0} solved
                        </div>
                        {(student.hackerRankQuestions || []).slice(0, 2).map((question) => (
                          <div key={question.challengeSlug} className="text-[10px] text-slate-500" title={question.challengeName}>
                            <span className="font-medium text-slate-600">{question.challengeName}:</span>{' '}
                            {question.solved ? `${question.firstAcceptedAtMinutes} min` : 'Not solved'}
                          </div>
                        ))}
                      </>
                    ) : student.hackerRankMatchStatus === 'ambiguous' ? (
                      <div className="text-[10px] text-amber-700">Same name as another participant — link on the HackerRank Contests tab</div>
                    ) : null}
                  </td>

                  {/* Stage Dropdown (Quick update) */}
                  <td className="py-3 px-3">
                    <StageBadge
                      stage={student.stage}
                      isInteractive={true}
                      onStageChange={(newStage) => onStageChange(student.id, newStage)}
                      size="sm"
                    />
                  </td>

                  {/* Resume URL */}
                  <td className="py-3 px-3 text-center">
                    {student.resumeUrl ? (
                      <a
                        href={student.resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 hover:underline px-2 py-1 rounded bg-indigo-50/60 hover:bg-indigo-50 border border-indigo-100 transition-colors"
                      >
                        <span>View</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-300 italic">Unavailable</span>
                    )}
                  </td>

                  {/* Last Updated */}
                  <td className="py-3 px-3 text-[11px] text-slate-500 whitespace-nowrap">
                    {formatDate(student.updatedAt)}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/students/${student.id}`}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 transition-colors"
                        title="View profile"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => onEditStudent(student)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                        title="Edit student"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteStudent(student)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors"
                        title="Delete student"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
