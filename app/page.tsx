'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { StageStatsCards } from '@/components/dashboard/StageStatsCards';
import { SearchBar } from '@/components/dashboard/SearchBar';
import { FilterPanel } from '@/components/dashboard/FilterPanel';
import { StudentTable } from '@/components/dashboard/StudentTable';
import { BulkActionBar } from '@/components/dashboard/BulkActionBar';
import { EmailFilteredModal } from '@/components/dashboard/EmailFilteredModal';
import { Pagination } from '@/components/dashboard/Pagination';
import { EditStudentModal } from '@/components/students/EditStudentModal';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastContext';
import {
  StudentRecord,
  StudentFilters,
  DashboardStats,
  FilterOptions,
} from '@/lib/types';
import { Filter, RefreshCw } from 'lucide-react';

function DashboardContent() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  // Primary Data States
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isHackerRankSyncing, setIsHackerRankSyncing] = useState(false);
  // Primary HackerRank contest (chosen on the HackerRank Contests tab) drives the HackerRank column + filters.
  const [primaryContest, setPrimaryContest] = useState<{
    slug: string;
    name: string;
    passScore: number | null;
    fetchedAt: string | null;
  } | null>(null);
  const [primaryCounts, setPrimaryCounts] = useState<{ pass: number; fail: number; absent: number; ambiguous: number } | null>(null);
  const [hackerRankSyncError, setHackerRankSyncError] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Statistics & Filter Options
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    stageCounts: {},
    noBacklogsCount: 0,
    hasBacklogsCount: 0,
  });

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    colleges: [],
    branches: [],
    passingYears: [],
    genders: [],
  });

  // Filter & Search States
  const initialStage = searchParams.get('stage') || 'all';
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<StudentFilters>({
    stage: initialStage,
    college: 'all',
    branch: 'all',
    passingYear: 'all',
    gender: 'all',
    backlogs: 'all',
    minCgpa: '',
    maxCgpa: '',
    minAtsScore: '',
    minCfRating: '',
    minLeetcodeRating: '',
    minCodechefRating: '',
    hackerRankStatus: 'all',
    hackerRankResult: 'all',
    hackerRankMinScore: '',
    hackerRankMaxScore: '',
    hackerRankQ1After: '',
    hackerRankQ1Within: '',
    hackerRankQ2After: '',
    hackerRankQ2Within: '',
    hackerRankCombinedTimeMode: 'all',
    hackerRankCombinedTime: '',
    hackerRankSolvedCount: 'all',
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    page: 1,
    pageSize: 25,
  });

  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Pagination State
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pageSize: 25,
    totalPages: 1,
  });

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<StudentRecord | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<StudentRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Compute number of active filters
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.stage && filters.stage !== 'all') count++;
    if (filters.college && filters.college !== 'all') count++;
    if (filters.branch && filters.branch !== 'all') count++;
    if (filters.passingYear && filters.passingYear !== 'all') count++;
    if (filters.gender && filters.gender !== 'all') count++;
    if (filters.backlogs && filters.backlogs !== 'all') count++;
    if (filters.minCgpa) count++;
    if (filters.maxCgpa) count++;
    if (filters.minAtsScore) count++;
    if (filters.minCfRating) count++;
    if (filters.minLeetcodeRating) count++;
    if (filters.minCodechefRating) count++;
    if (filters.hackerRankStatus && filters.hackerRankStatus !== 'all') count++;
    if (filters.hackerRankResult && filters.hackerRankResult !== 'all') count++;
    if (filters.hackerRankMinScore) count++;
    if (filters.hackerRankMaxScore) count++;
    if (filters.hackerRankQ1After) count++;
    if (filters.hackerRankQ1Within) count++;
    if (filters.hackerRankQ2After) count++;
    if (filters.hackerRankQ2Within) count++;
    if (filters.hackerRankCombinedTimeMode && filters.hackerRankCombinedTimeMode !== 'all' && filters.hackerRankCombinedTime) count++;
    if (filters.hackerRankSolvedCount && filters.hackerRankSolvedCount !== 'all') count++;
    return count;
  };

  // Fetch Students Function
  const fetchStudents = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();

      if (search) params.set('search', search);
      if (filters.stage && filters.stage !== 'all') params.set('stage', filters.stage);
      if (filters.college && filters.college !== 'all') params.set('college', filters.college);
      if (filters.branch && filters.branch !== 'all') params.set('branch', filters.branch);
      if (filters.passingYear && filters.passingYear !== 'all') params.set('passingYear', filters.passingYear);
      if (filters.gender && filters.gender !== 'all') params.set('gender', filters.gender);
      if (filters.backlogs && filters.backlogs !== 'all') params.set('backlogs', filters.backlogs);
      if (filters.minCgpa) params.set('minCgpa', filters.minCgpa);
      if (filters.maxCgpa) params.set('maxCgpa', filters.maxCgpa);
      if (filters.minAtsScore) params.set('minAtsScore', filters.minAtsScore);
      if (filters.minCfRating) params.set('minCfRating', filters.minCfRating);
      if (filters.minLeetcodeRating) params.set('minLeetcodeRating', filters.minLeetcodeRating);
      if (filters.minCodechefRating) params.set('minCodechefRating', filters.minCodechefRating);
      if (filters.hackerRankStatus && filters.hackerRankStatus !== 'all') params.set('hackerRankStatus', filters.hackerRankStatus);
      if (filters.hackerRankResult && filters.hackerRankResult !== 'all') params.set('hackerRankResult', filters.hackerRankResult);
      if (filters.hackerRankMinScore) params.set('hackerRankMinScore', filters.hackerRankMinScore);
      if (filters.hackerRankMaxScore) params.set('hackerRankMaxScore', filters.hackerRankMaxScore);
      if (filters.hackerRankQ1After) params.set('hackerRankQ1After', filters.hackerRankQ1After);
      if (filters.hackerRankQ1Within) params.set('hackerRankQ1Within', filters.hackerRankQ1Within);
      if (filters.hackerRankQ2After) params.set('hackerRankQ2After', filters.hackerRankQ2After);
      if (filters.hackerRankQ2Within) params.set('hackerRankQ2Within', filters.hackerRankQ2Within);
      if (filters.hackerRankCombinedTimeMode && filters.hackerRankCombinedTimeMode !== 'all' && filters.hackerRankCombinedTime) {
        params.set('hackerRankCombinedTimeMode', filters.hackerRankCombinedTimeMode);
        params.set('hackerRankCombinedTime', filters.hackerRankCombinedTime);
      }
      if (filters.hackerRankSolvedCount && filters.hackerRankSolvedCount !== 'all') params.set('hackerRankSolvedCount', filters.hackerRankSolvedCount);
      if (filters.sortBy) params.set('sortBy', filters.sortBy);
      if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
      if (filters.page) params.set('page', filters.page.toString());
      if (filters.pageSize) params.set('pageSize', filters.pageSize.toString());

      const res = await fetch(`/api/students?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setStudents(data.students);
        setPagination(data.pagination);
        setStats(data.stats);
        setFilterOptions(data.filterOptions);
      } else {
        showToast(data.error || 'Failed to fetch students', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error fetching candidates', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [filters, search, showToast]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    fetch('/api/hackerrank-admin/primary')
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setPrimaryContest(data.primary);
          setPrimaryCounts(data.counts);
        }
      })
      .catch(() => undefined);
  }, []);

  const handleHackerRankSync = async () => {
    try {
      setIsHackerRankSyncing(true);
      const response = await fetch('/api/hackerrank-admin/primary/refresh', { method: 'POST' });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'HackerRank refresh failed');
      }
      setPrimaryContest(data.primary);
      setPrimaryCounts(data.counts);
      setHackerRankSyncError(data.warning || null);
      showToast(
        data.warning ||
          `HackerRank refreshed: ${data.counts.pass} pass · ${data.counts.fail} fail · ${data.counts.absent} absent`,
        data.warning ? 'error' : 'success',
      );
      fetchStudents();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'HackerRank synchronization failed';
      setHackerRankSyncError(message);
      showToast(message, 'error');
    } finally {
      setIsHackerRankSyncing(false);
    }
  };

  // Stage Selection from top cards
  const handleSelectStageCard = (stageName: string) => {
    setFilters((prev) => ({
      ...prev,
      stage: stageName,
      page: 1, // reset to page 1 on filter change
    }));
    setSelectedIds([]);
  };

  // Sorting
  const handleSort = (field: string) => {
    setFilters((prev) => {
      const isSameField = prev.sortBy === field;
      const nextOrder = isSameField && prev.sortOrder === 'asc' ? 'desc' : 'asc';
      return {
        ...prev,
        sortBy: field as StudentFilters['sortBy'],
        sortOrder: nextOrder,
        page: 1,
      };
    });
  };

  // Quick Stage Update on table row
  const handleQuickStageChange = async (studentId: string, newStage: string) => {
    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Stage updated to ${newStage}`, 'success');
        // Update local state for immediate responsiveness and refresh stats
        setStudents((prev) =>
          prev.map((s) => (s.id === studentId ? { ...s, stage: newStage } : s))
        );
        fetchStudents();
      } else {
        showToast(data.error || 'Failed to update stage', 'error');
      }
    } catch {
      showToast('Failed to update stage', 'error');
    }
  };

  // Bulk Actions
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === students.length && students.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(students.map((s) => s.id));
    }
  };

  const handleBulkStageMove = async (targetStage: string) => {
    try {
      const res = await fetch('/api/students/bulk-stage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: selectedIds, stage: targetStage }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Moved ${data.count} students to ${targetStage}`, 'success');
        setSelectedIds([]);
        fetchStudents();
      } else {
        showToast(data.error || 'Bulk move failed', 'error');
      }
    } catch {
      showToast('Bulk update error', 'error');
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const id of selectedIds) {
        await fetch(`/api/students/${id}`, { method: 'DELETE' });
      }
      showToast(`Deleted ${selectedIds.length} students`, 'success');
      setSelectedIds([]);
      fetchStudents();
    } catch {
      showToast('Error during bulk deletion', 'error');
    }
  };

  // Single Student Edit / Add
  const handleSaveStudent = async (studentData: Partial<StudentRecord>) => {
    if (studentToEdit) {
      // Update
      const res = await fetch(`/api/students/${studentToEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Student details updated', 'success');
        fetchStudents();
      } else {
        throw new Error(data.error || 'Failed to update student');
      }
    } else {
      // Create new
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Student created successfully', 'success');
        fetchStudents();
      } else {
        throw new Error(data.error || 'Failed to create student');
      }
    }
  };

  // Single Student Delete
  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/students/${studentToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Deleted student: ${studentToDelete.fullName}`, 'success');
        setDeleteModalOpen(false);
        setStudentToDelete(null);
        fetchStudents();
      } else {
        showToast(data.error || 'Failed to delete student', 'error');
      }
    } catch {
      showToast('Error deleting student', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Export CSV
  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filters.stage && filters.stage !== 'all') params.set('stage', filters.stage);
      if (filters.college && filters.college !== 'all') params.set('college', filters.college);
      if (filters.branch && filters.branch !== 'all') params.set('branch', filters.branch);
      if (filters.passingYear && filters.passingYear !== 'all') params.set('passingYear', filters.passingYear);
      if (filters.gender && filters.gender !== 'all') params.set('gender', filters.gender);
      if (filters.backlogs && filters.backlogs !== 'all') params.set('backlogs', filters.backlogs);
      if (filters.minCgpa) params.set('minCgpa', filters.minCgpa);
      if (filters.maxCgpa) params.set('maxCgpa', filters.maxCgpa);
      if (filters.minAtsScore) params.set('minAtsScore', filters.minAtsScore);
      if (filters.minCfRating) params.set('minCfRating', filters.minCfRating);
      if (filters.minLeetcodeRating) params.set('minLeetcodeRating', filters.minLeetcodeRating);
      if (filters.minCodechefRating) params.set('minCodechefRating', filters.minCodechefRating);
      if (filters.hackerRankStatus && filters.hackerRankStatus !== 'all') params.set('hackerRankStatus', filters.hackerRankStatus);
      if (filters.hackerRankResult && filters.hackerRankResult !== 'all') params.set('hackerRankResult', filters.hackerRankResult);
      if (filters.hackerRankMinScore) params.set('hackerRankMinScore', filters.hackerRankMinScore);
      if (filters.hackerRankMaxScore) params.set('hackerRankMaxScore', filters.hackerRankMaxScore);
      if (filters.hackerRankQ1After) params.set('hackerRankQ1After', filters.hackerRankQ1After);
      if (filters.hackerRankQ1Within) params.set('hackerRankQ1Within', filters.hackerRankQ1Within);
      if (filters.hackerRankQ2After) params.set('hackerRankQ2After', filters.hackerRankQ2After);
      if (filters.hackerRankQ2Within) params.set('hackerRankQ2Within', filters.hackerRankQ2Within);
      if (filters.hackerRankCombinedTimeMode && filters.hackerRankCombinedTimeMode !== 'all' && filters.hackerRankCombinedTime) {
        params.set('hackerRankCombinedTimeMode', filters.hackerRankCombinedTimeMode);
        params.set('hackerRankCombinedTime', filters.hackerRankCombinedTime);
      }
      if (filters.hackerRankSolvedCount && filters.hackerRankSolvedCount !== 'all') params.set('hackerRankSolvedCount', filters.hackerRankSolvedCount);
      if (filters.sortBy) params.set('sortBy', filters.sortBy);
      if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);

      const res = await fetch(`/api/export?${params.toString()}`);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `students_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('CSV export downloaded', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to export CSV', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      showToast('Please select a CSV file', 'error');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'commit');

      const res = await fetch('/api/import', { method: 'POST', body: formData });
      const data = await res.json();

      if (!data.success) {
        showToast(data.error || 'Failed to import CSV', 'error');
        return;
      }

      showToast(`Imported ${data.newCount} new, updated ${data.updatedCount} existing`, 'success');
      fetchStudents();
    } catch {
      showToast('Network error during CSV import', 'error');
    }
  };

  const handleResetFilters = () => {
    setFilters({
      stage: 'all',
      college: 'all',
      branch: 'all',
      passingYear: 'all',
      gender: 'all',
      backlogs: 'all',
      minCgpa: '',
      maxCgpa: '',
      minAtsScore: '',
      minCfRating: '',
      minLeetcodeRating: '',
      minCodechefRating: '',
      hackerRankStatus: 'all',
      hackerRankResult: 'all',
      hackerRankMinScore: '',
      hackerRankMaxScore: '',
      hackerRankQ1After: '',
      hackerRankQ1Within: '',
      hackerRankQ2After: '',
      hackerRankQ2Within: '',
      hackerRankCombinedTimeMode: 'all',
      hackerRankCombinedTime: '',
      hackerRankSolvedCount: 'all',
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      page: 1,
      pageSize: 25,
    });
    setSearch('');
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Student Tracker Dashboard"
        subtitle="Manage applicants, filter across cohorts, and track candidates through stages"
        onOpenNewStudent={() => {
          setStudentToEdit(null);
          setEditModalOpen(true);
        }}
        onExportCsv={handleExportCsv}
        onImportFile={handleImportFile}
        isExporting={isExporting}
      />

      <div className="p-8 space-y-6 flex-1 max-w-[1600px] w-full mx-auto">
        {/* Top Summary Stage Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Recruitment Pipeline Overview
            </h3>
            <span className="text-[11px] text-slate-400">Click a stage card to filter</span>
          </div>
          <StageStatsCards
            total={stats.total}
            stageCounts={stats.stageCounts}
            activeStage={filters.stage}
            onSelectStage={handleSelectStageCard}
          />
        </div>

        {/* Toolbar & Filter Controls */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Bar */}
            <div className="w-full sm:max-w-md">
              <SearchBar
                value={search}
                onChange={(val) => {
                  setSearch(val);
                  setFilters((prev) => ({ ...prev, page: 1 }));
                }}
              />
            </div>

            {/* Filter Toggle & Refresh Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setShowFilterDrawer(!showFilterDrawer)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                  showFilterDrawer || activeFilterCount > 0
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => fetchStudents()}
                className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
                title="Refresh table data"
                aria-label="Refresh data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={handleHackerRankSync}
                disabled={isHackerRankSyncing || !primaryContest}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                title={primaryContest ? `Re-fetch ${primaryContest.name} from HackerRank` : 'Choose a primary contest on the HackerRank Contests tab'}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isHackerRankSyncing ? 'animate-spin' : ''}`} />
                <span>{isHackerRankSyncing ? 'Syncing...' : 'Refresh HackerRank'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[11px] text-slate-400">
            {primaryContest ? (
              <>
                <span>
                  HackerRank:{' '}
                  <Link href={`/contests/${encodeURIComponent(primaryContest.slug)}`} className="font-semibold text-indigo-700 hover:underline">
                    {primaryContest.name}
                  </Link>
                  {primaryContest.passScore !== null && <> · pass ≥ {primaryContest.passScore}</>}
                  {primaryContest.fetchedAt && <> · synced {new Date(primaryContest.fetchedAt).toLocaleString()}</>}
                </span>
                {primaryCounts && (
                  <span className="flex items-center gap-1.5">
                    {([
                      ['pass', primaryCounts.pass, 'text-emerald-700 bg-emerald-50'],
                      ['fail', primaryCounts.fail, 'text-rose-700 bg-rose-50'],
                      ['absent', primaryCounts.absent, 'text-slate-600 bg-slate-100'],
                    ] as const).map(([result, count, color]) => (
                      <button
                        key={result}
                        type="button"
                        onClick={() => setFilters((prev) => ({ ...prev, hackerRankResult: prev.hackerRankResult === result ? 'all' : result, page: 1 }))}
                        className={`rounded-full px-2 py-0.5 font-semibold capitalize ${color} ${filters.hackerRankResult === result ? 'ring-1 ring-current' : ''}`}
                        title={`Show students who are ${result}`}
                      >
                        {count} {result}
                      </button>
                    ))}
                  </span>
                )}
              </>
            ) : (
              <span>
                No primary HackerRank contest.{' '}
                <Link href="/contests" className="text-indigo-700 hover:underline">Choose one on the HackerRank Contests tab</Link>
              </span>
            )}
            {hackerRankSyncError && <span className="text-rose-600">{hackerRankSyncError}</span>}
          </div>

          {/* Expandable Filter Drawer */}
          {showFilterDrawer && (
            <FilterPanel
              filters={filters}
              filterOptions={filterOptions}
              onChange={(updated) => setFilters((prev) => ({ ...prev, ...updated, page: 1 }))}
              onReset={handleResetFilters}
              activeFilterCount={activeFilterCount}
            />
          )}
        </div>

        {/* Bulk Action Bar (Visible when rows selected) */}
        <BulkActionBar
          selectedCount={selectedIds.length}
          totalOnPage={students.length}
          allSelected={selectedIds.length === students.length && students.length > 0}
          onSelectAllToggle={handleToggleSelectAll}
          onClearSelection={() => setSelectedIds([])}
          onBulkStageMove={handleBulkStageMove}
          onEmailSelected={() => setShowEmailModal(true)}
          onBulkDelete={handleBulkDelete}
        />

        {/* Students Table */}
        <div>
          <StudentTable
            students={students}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            allSelected={selectedIds.length === students.length && students.length > 0}
            sortBy={filters.sortBy || 'updatedAt'}
            sortOrder={filters.sortOrder || 'desc'}
            onSort={handleSort}
            onStageChange={handleQuickStageChange}
            onEditStudent={(s) => {
              setStudentToEdit(s);
              setEditModalOpen(true);
            }}
            onDeleteStudent={(s) => {
              setStudentToDelete(s);
              setDeleteModalOpen(true);
            }}
            isLoading={isLoading}
          />

          {/* Pagination */}
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={(newPage) => setFilters((prev) => ({ ...prev, page: newPage }))}
            onPageSizeChange={(newSize) => setFilters((prev) => ({ ...prev, pageSize: newSize, page: 1 }))}
          />
        </div>
      </div>

      {/* Edit / Add Modal */}
      <EditStudentModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setStudentToEdit(null);
        }}
        student={studentToEdit}
        onSave={handleSaveStudent}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setStudentToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Candidate"
        message={`Are you sure you want to delete ${studentToDelete?.fullName}? All associated evaluation notes and profile data will be permanently removed from SQLite.`}
        confirmText="Delete Candidate"
        isDestructive={true}
        isLoading={isDeleting}
      />

      <EmailFilteredModal
        isOpen={showEmailModal}
        selectedIds={selectedIds}
        onClose={() => setShowEmailModal(false)}
        onSent={(count) => showToast(`Email sent to ${count} students`, 'success')}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
