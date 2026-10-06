'use client';

import React from 'react';
import { FilterOptions, StudentFilters } from '@/lib/types';
import { STAGES } from '@/lib/stages';
import { RotateCcw } from 'lucide-react';

interface FilterPanelProps {
  filters: StudentFilters;
  filterOptions: FilterOptions;
  onChange: (updatedFilters: Partial<StudentFilters>) => void;
  onReset: () => void;
  activeFilterCount: number;
}

export function FilterPanel({
  filters,
  filterOptions,
  onChange,
  onReset,
  activeFilterCount,
}: FilterPanelProps) {
  return (
    <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 mt-2 space-y-4 animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">Filter Records</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-full">
              {activeFilterCount} active
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Stage Filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Recruitment Stage
          </label>
          <select
            value={filters.stage || 'all'}
            onChange={(e) => onChange({ stage: e.target.value })}
            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="all">All Stages</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* College Filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            College / Institute
          </label>
          <select
            value={filters.college || 'all'}
            onChange={(e) => onChange({ college: e.target.value })}
            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 truncate"
          >
            <option value="all">All Colleges</option>
            {filterOptions.colleges.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Branch / Specialization Filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Specialization / Branch
          </label>
          <select
            value={filters.branch || 'all'}
            onChange={(e) => onChange({ branch: e.target.value })}
            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 truncate"
          >
            <option value="all">All Branches</option>
            {filterOptions.branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* Passing Year Filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Passing Year
          </label>
          <select
            value={filters.passingYear || 'all'}
            onChange={(e) => onChange({ passingYear: e.target.value })}
            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="all">All Years</option>
            {filterOptions.passingYears.map((y) => (
              <option key={y} value={y.toString()}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Backlogs Filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Active Backlogs
          </label>
          <select
            value={filters.backlogs || 'all'}
            onChange={(e) => onChange({ backlogs: e.target.value as 'all' | 'none' | 'has' })}
            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="all">All Students</option>
            <option value="none">No Backlogs</option>
            <option value="has">Has Backlogs</option>
          </select>
        </div>

        {/* Gender Filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Gender
          </label>
          <select
            value={filters.gender || 'all'}
            onChange={(e) => onChange({ gender: e.target.value })}
            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="all">All Genders</option>
            {filterOptions.genders.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        {/* CGPA Range */}
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Graduation CGPA Range
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              placeholder="Min (e.g. 7.5)"
              value={filters.minCgpa || ''}
              onChange={(e) => onChange({ minCgpa: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <span className="text-slate-400">to</span>
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              placeholder="Max (e.g. 10.0)"
              value={filters.maxCgpa || ''}
              onChange={(e) => onChange({ maxCgpa: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* ATS and Coding Rating Filters */}
        <div className="sm:col-span-2 lg:col-span-4 border-t border-slate-200 pt-3">
          <p className="text-[11px] font-semibold text-slate-600 mb-2">
            Candidate score rules: ATS must be above its threshold, and at least one coding rating must be above its threshold.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="ATS score > (e.g. 70)"
              value={filters.minAtsScore || ''}
              onChange={(e) => onChange({ minAtsScore: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Codeforces > (e.g. 1000)"
              value={filters.minCfRating || ''}
              onChange={(e) => onChange({ minCfRating: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <input
              type="number"
              min="0"
              step="1"
              placeholder="LeetCode > (e.g. 1600)"
              value={filters.minLeetcodeRating || ''}
              onChange={(e) => onChange({ minLeetcodeRating: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <input
              type="number"
              min="0"
              step="1"
              placeholder="CodeChef > (e.g. 1200)"
              value={filters.minCodechefRating || ''}
              onChange={(e) => onChange({ minCodechefRating: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="sm:col-span-2 lg:col-span-4 border-t border-slate-200 pt-3">
          <p className="text-[11px] font-semibold text-slate-600 mb-2">HackerRank Contest</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select
              value={filters.hackerRankStatus || 'all'}
              onChange={(e) => onChange({ hackerRankStatus: e.target.value as StudentFilters['hackerRankStatus'] })}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800"
              aria-label="HackerRank match status"
            >
              <option value="all">Any match status</option>
              <option value="matched">Matched</option>
              <option value="not_found">Not found</option>
              <option value="ambiguous">Ambiguous</option>
            </select>
            <select
              value={filters.hackerRankResult || 'all'}
              onChange={(e) => onChange({ hackerRankResult: e.target.value as StudentFilters['hackerRankResult'] })}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800"
              aria-label="HackerRank result"
            >
              <option value="all">Any result</option>
              <option value="pass">Passed</option>
              <option value="fail">Failed</option>
              <option value="absent">Absent (did not take it)</option>
              <option value="fail_or_absent">Failed or absent</option>
              <option value="needs_mapping">Needs HackerRank mapping</option>
            </select>
            <input
              type="number"
              min="0"
              placeholder="Minimum score"
              value={filters.hackerRankMinScore || ''}
              onChange={(e) => onChange({ hackerRankMinScore: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 placeholder-slate-400"
            />
            <input
              type="number"
              min="0"
              placeholder="Maximum score"
              value={filters.hackerRankMaxScore || ''}
              onChange={(e) => onChange({ hackerRankMaxScore: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 placeholder-slate-400"
            />
            <select
              value={filters.hackerRankSolvedCount || 'all'}
              onChange={(e) => onChange({ hackerRankSolvedCount: e.target.value as StudentFilters['hackerRankSolvedCount'] })}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800"
              aria-label="HackerRank solved question count"
            >
              <option value="all">Any solved count</option>
              <option value="0">0 questions solved</option>
              <option value="1">1 question solved</option>
              <option value="2">2 questions solved</option>
            </select>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="Q1 solved after (min)"
              value={filters.hackerRankQ1After || ''}
              onChange={(e) => onChange({ hackerRankQ1After: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 placeholder-slate-400"
            />
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="Q1 solved within (min)"
              value={filters.hackerRankQ1Within || ''}
              onChange={(e) => onChange({ hackerRankQ1Within: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 placeholder-slate-400"
            />
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="Q2 solved after (min)"
              value={filters.hackerRankQ2After || ''}
              onChange={(e) => onChange({ hackerRankQ2After: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 placeholder-slate-400"
            />
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="Q2 solved within (min)"
              value={filters.hackerRankQ2Within || ''}
              onChange={(e) => onChange({ hackerRankQ2Within: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 placeholder-slate-400"
            />
            <select
              value={filters.hackerRankCombinedTimeMode || 'all'}
              onChange={(e) => onChange({ hackerRankCombinedTimeMode: e.target.value as StudentFilters['hackerRankCombinedTimeMode'] })}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800"
              aria-label="Combined question timing rule"
            >
              <option value="all">No combined time rule</option>
              <option value="both_after">Both questions after</option>
              <option value="both_within">Both questions within</option>
              <option value="any_after">At least one after</option>
              <option value="any_within">At least one within</option>
            </select>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="Combined threshold (min)"
              value={filters.hackerRankCombinedTime || ''}
              onChange={(e) => onChange({ hackerRankCombinedTime: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 placeholder-slate-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
