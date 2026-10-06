'use client';

import React, { useState } from 'react';
import { STAGES } from '@/lib/stages';
import { ConfirmDialog } from '@/components/ui/Modal';
import { CheckSquare, ArrowRight, Mail, X, Trash2 } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  totalOnPage: number;
  allSelected: boolean;
  onSelectAllToggle: () => void;
  onClearSelection: () => void;
  onBulkStageMove: (targetStage: string) => Promise<void>;
  onEmailSelected: () => void;
  onBulkDelete?: () => Promise<void>;
}

export function BulkActionBar({
  selectedCount,
  onClearSelection,
  onBulkStageMove,
  onEmailSelected,
  onBulkDelete,
}: BulkActionBarProps) {
  const [targetStage, setTargetStage] = useState<string>('Stage 1');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (selectedCount === 0) return null;

  const handleConfirmMove = async () => {
    try {
      setIsLoading(true);
      await onBulkStageMove(targetStage);
      setShowConfirmModal(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!onBulkDelete) return;
    try {
      setIsLoading(true);
      await onBulkDelete();
      setShowDeleteModal(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="bg-indigo-900 text-white px-4 py-2.5 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded bg-indigo-700 flex items-center justify-center text-indigo-200">
            <CheckSquare className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-indigo-50">
            {selectedCount} student{selectedCount > 1 ? 's' : ''} selected
          </span>
          <button
            type="button"
            onClick={onClearSelection}
            className="text-indigo-300 hover:text-white underline text-[11px] ml-2"
          >
            Clear selection
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-indigo-200 text-[11px]">Move to:</span>
            <select
              value={targetStage}
              onChange={(e) => setTargetStage(e.target.value)}
              className="bg-indigo-800 text-white border border-indigo-700 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-white"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-indigo-900 font-semibold rounded-lg hover:bg-indigo-50 transition-colors shadow-xs"
            >
              <span>Move</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <button
            type="button"
            onClick={onEmailSelected}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-indigo-900 font-semibold rounded-lg hover:bg-indigo-50 transition-colors shadow-xs"
          >
            <Mail className="w-3 h-3" />
            <span>Email</span>
          </button>

          {onBulkDelete && (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="p-1.5 text-indigo-300 hover:text-rose-300 hover:bg-indigo-800 rounded transition-colors ml-1"
              title="Delete selected"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onClearSelection}
            className="p-1 text-indigo-300 hover:text-white rounded"
            aria-label="Close bulk bar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmMove}
        title="Confirm Bulk Stage Update"
        message={`Are you sure you want to move all ${selectedCount} selected students to "${targetStage}"? This will update their recruitment status in SQLite immediately.`}
        confirmText={`Move ${selectedCount} Students`}
        isLoading={isLoading}
      />

      {onBulkDelete && (
        <ConfirmDialog
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleConfirmDelete}
          title="Confirm Delete Students"
          message={`Are you sure you want to permanently delete ${selectedCount} students? Their comments and data will be removed from SQLite.`}
          confirmText="Delete"
          isDestructive={true}
          isLoading={isLoading}
        />
      )}
    </>
  );
}
