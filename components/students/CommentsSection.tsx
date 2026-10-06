'use client';

import React, { useState } from 'react';
import { StudentComment } from '@/lib/types';
import { ConfirmDialog } from '@/components/ui/Modal';
import { MessageSquare, Send, Edit2, Trash2, Check, Clock } from 'lucide-react';

interface CommentsSectionProps {
  studentId: string;
  comments: StudentComment[];
  onAddComment: (comment: string) => Promise<void>;
  onUpdateComment: (commentId: string, newText: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}

export function CommentsSection({
  comments,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
}: CommentsSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Deleting state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onAddComment(newComment.trim());
      setNewComment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (c: StudentComment) => {
    setEditingId(c.id);
    setEditText(c.comment);
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editText.trim() || isUpdating) return;
    try {
      setIsUpdating(true);
      await onUpdateComment(commentId, editText.trim());
      setEditingId(null);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId || isDeleting) return;
    try {
      setIsDeleting(true);
      await onDeleteComment(deleteTargetId);
      setDeleteTargetId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatTimestamp = (dateString: string | Date) => {
    const d = new Date(dateString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          <span>Evaluation Notes & Comments</span>
        </h3>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
          {comments.length}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* New Comment Input */}
        <form onSubmit={handleAdd} className="space-y-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add candidate evaluation note... (e.g. Strong DSA performance, proceed to Stage 2)"
            rows={3}
            className="w-full p-3 text-xs bg-slate-50/50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-y"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-2xs"
            >
              <Send className="w-3 h-3" />
              <span>{isSubmitting ? 'Saving...' : 'Save Comment'}</span>
            </button>
          </div>
        </form>

        {/* Comments List */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          {comments.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-6">
              No evaluation notes recorded yet. Add the first comment above.
            </p>
          ) : (
            comments.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-2 text-xs"
              >
                {editingId === c.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={2}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        disabled={isUpdating}
                        className="px-2.5 py-1 text-[11px] font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(c.id)}
                        disabled={!editText.trim() || isUpdating}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <Check className="w-3 h-3" />
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {c.comment}
                    </p>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/40 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{formatTimestamp(c.createdAt)}</span>
                        {c.updatedAt !== c.createdAt && <span className="italic">(edited)</span>}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(c)}
                          className="hover:text-indigo-600 transition-colors"
                          title="Edit comment"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTargetId(c.id)}
                          className="hover:text-rose-600 transition-colors"
                          title="Delete comment"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Comment"
        message="Are you sure you want to delete this evaluation comment? This cannot be undone."
        confirmText="Delete Comment"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
}
