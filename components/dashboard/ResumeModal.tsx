'use client';

import React, { useState, useEffect } from 'react';
import { StudentRecord } from '@/lib/types';
import { StageBadge } from '@/components/ui/StageBadge';
import {
  X,
  ExternalLink,
  FileText,
  ShieldAlert,
  Send,
  MessageSquare,
} from 'lucide-react';

interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentRecord | null;
  onStageChange: (studentId: string, newStage: string) => Promise<void>;
  onAddComment?: (studentId: string, comment: string) => Promise<void>;
}

export function ResumeModal({
  isOpen,
  onClose,
  student,
  onStageChange,
  onAddComment,
}: ResumeModalProps) {
  const [embedError, setEmbedError] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [commentsList, setCommentsList] = useState(student?.comments || []);

  useEffect(() => {
    if (student) {
      setCommentsList(student.comments || []);
      setEmbedError(false);
      setNewNote('');
    }
  }, [student]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !student) return null;

  const getEmbeddableUrl = (url: string) => {
    // Google Drive share link -> preview link
    const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }
    return url;
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || isSavingNote || !onAddComment) return;

    try {
      setIsSavingNote(true);
      await onAddComment(student.id, newNote.trim());
      setCommentsList((prev) => [
        {
          id: Math.random().toString(),
          studentId: student.id,
          comment: newNote.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setNewNote('');
    } finally {
      setIsSavingNote(false);
    }
  };

  const resumeUrl = student.resumeUrl;
  const embedUrl = resumeUrl ? getEmbeddableUrl(resumeUrl) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {student.fullName
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-slate-900">{student.fullName}</h3>
                <StageBadge
                  stage={student.stage}
                  isInteractive={true}
                  onStageChange={(newStage) => onStageChange(student.id, newStage)}
                  size="sm"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                {student.registrationNo && (
                  <span className="font-mono bg-white border border-slate-200 px-1.5 py-0.2 rounded text-[11px] text-slate-700">
                    {student.registrationNo}
                  </span>
                )}
                <span>• {student.college || 'College not specified'}</span>
                {student.specialization && <span>• {student.specialization}</span>}
                {student.graduationCGPA !== null && student.graduationCGPA !== undefined && (
                  <span className="font-semibold text-slate-700">
                    • CGPA: {student.graduationCGPA.toFixed(2)}
                  </span>
                )}
                {student.activeBacklogs ? (
                  <span className="text-rose-600 font-semibold">• Has Backlogs</span>
                ) : (
                  <span className="text-emerald-600 font-medium">• No Backlogs</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {resumeUrl && (
              <a
                href={resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                title="Open resume in external tab"
              >
                <span>Open in New Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
              aria-label="Close resume popup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Split Layout (Resume on left, Candidate Notes on right) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-[500px]">
          {/* Left: Resume View */}
          <div className="flex-1 bg-slate-100 p-3 sm:p-4 flex flex-col overflow-hidden relative">
            {!resumeUrl ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white rounded-xl border border-slate-200">
                <FileText className="w-12 h-12 text-slate-300 mb-2" />
                <h4 className="text-sm font-semibold text-slate-700">Resume Link Unavailable</h4>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  No resume URL was provided for this candidate in the uploaded CSV.
                </p>
              </div>
            ) : !embedError ? (
              <div className="flex-1 w-full h-full min-h-[480px] rounded-xl border border-slate-300 bg-white overflow-hidden shadow-inner relative flex flex-col">
                <iframe
                  src={embedUrl || resumeUrl}
                  title={`${student.fullName} Resume`}
                  className="w-full flex-1 border-0"
                  onError={() => setEmbedError(true)}
                  sandbox="allow-scripts allow-same-origin allow-popups"
                />
                <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                  <span>In-popup live viewer</span>
                  <a
                    href={resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>Having trouble previewing? Open in new tab</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white rounded-xl border border-dashed border-slate-300 space-y-3">
                <ShieldAlert className="w-10 h-10 text-amber-500" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Preview Restricted by Provider</h4>
                  <p className="text-xs text-slate-500 max-w-md mt-1">
                    The external host restricts frame embedding. You can view the resume directly in a new tab:
                  </p>
                </div>
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  <span>Open Resume in New Browser Tab</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>

          {/* Right: Quick Candidate Review Panel */}
          <div className="w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col p-4 overflow-y-auto">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
              <span>Review & Notes</span>
            </h4>

            {/* Quick Candidate Summary */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 mb-4">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Degree & Year:</span>
                <span className="font-semibold text-slate-800">
                  {student.course || 'B.Tech'} ({student.passingYear || 'N/A'})
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">CGPA:</span>
                <span className="font-bold text-slate-900">
                  {student.graduationCGPA !== null && student.graduationCGPA !== undefined
                    ? `${student.graduationCGPA.toFixed(2)} / 10`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">10th / 12th:</span>
                <span className="font-semibold text-slate-800">
                  {student.class10Percentage ? `${student.class10Percentage}%` : '—'} /{' '}
                  {student.class12Percentage ? `${student.class12Percentage}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Backlogs:</span>
                <span className={`font-semibold ${student.activeBacklogs ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {student.activeBacklogs ? student.activeBacklogsRaw || 'Yes' : 'None'}
                </span>
              </div>
            </div>

            {/* Quick Note Form */}
            {onAddComment && (
              <form onSubmit={handleSaveNote} className="space-y-2 mb-4">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Add Evaluation Note:
                </label>
                <textarea
                  rows={2}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="e.g. Good DSA performance, move to Stage 2..."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
                <button
                  type="submit"
                  disabled={!newNote.trim() || isSavingNote}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-2xs"
                >
                  <Send className="w-3 h-3" />
                  <span>{isSavingNote ? 'Saving note...' : 'Add Note'}</span>
                </button>
              </form>
            )}

            {/* Existing Notes List */}
            <div className="flex-1 space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 block">
                Recorded Notes ({commentsList.length})
              </span>
              {commentsList.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-3 text-center">
                  No notes recorded yet.
                </p>
              ) : (
                commentsList.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs space-y-1"
                  >
                    <p className="text-slate-800 whitespace-pre-wrap">{c.comment}</p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(c.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
