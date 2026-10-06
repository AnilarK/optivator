'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StudentDetailHeader } from '@/components/students/StudentDetailHeader';
import { PersonalInfoCard } from '@/components/students/PersonalInfoCard';
import { AcademicInfoCard } from '@/components/students/AcademicInfoCard';
import { ResumeViewer } from '@/components/students/ResumeViewer';
import { CommentsSection } from '@/components/students/CommentsSection';
import { EditStudentModal } from '@/components/students/EditStudentModal';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastContext';
import { StudentRecord } from '@/lib/types';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const studentId = params?.id as string;

  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchStudent = useCallback(async () => {
    if (!studentId) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/students/${studentId}`);
      const data = await res.json();
      if (data.success) {
        setStudent(data.student);
      } else {
        setError(data.error || 'Failed to load student details');
      }
    } catch {
      setError('Network error fetching student record');
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

  // Stage change
  const handleStageChange = async (newStage: string) => {
    if (!student) return;
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });
      const data = await res.json();
      if (data.success) {
        setStudent((prev) => (prev ? { ...prev, stage: newStage } : null));
        showToast(`Candidate stage moved to ${newStage}`, 'success');
      } else {
        showToast(data.error || 'Failed to update stage', 'error');
      }
    } catch {
      showToast('Error updating stage', 'error');
    }
  };

  // Update Student
  const handleSaveStudent = async (updatedData: Partial<StudentRecord>) => {
    if (!student) return;
    const res = await fetch(`/api/students/${student.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData),
    });
    const data = await res.json();
    if (data.success) {
      setStudent(data.student);
      showToast('Candidate record updated successfully', 'success');
    } else {
      throw new Error(data.error || 'Failed to save changes');
    }
  };

  // Delete Student
  const handleDeleteStudent = async () => {
    if (!student) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Candidate ${student.fullName} deleted`, 'success');
        router.push('/');
      } else {
        showToast(data.error || 'Failed to delete student', 'error');
      }
    } catch {
      showToast('Error deleting student', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Comments Handlers
  const handleAddComment = async (commentText: string) => {
    if (!student) return;
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: student.id, comment: commentText }),
    });
    const data = await res.json();
    if (data.success) {
      showToast('Note added', 'success');
      setStudent((prev) =>
        prev
          ? {
              ...prev,
              comments: [data.comment, ...(prev.comments || [])],
            }
          : null
      );
    } else {
      showToast(data.error || 'Failed to add comment', 'error');
    }
  };

  const handleUpdateComment = async (commentId: string, newText: string) => {
    const res = await fetch(`/api/comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: newText }),
    });
    const data = await res.json();
    if (data.success) {
      showToast('Note updated', 'success');
      setStudent((prev) =>
        prev
          ? {
              ...prev,
              comments: (prev.comments || []).map((c) =>
                c.id === commentId ? { ...c, comment: newText, updatedAt: new Date().toISOString() } : c
              ),
            }
          : null
      );
    } else {
      showToast(data.error || 'Failed to update comment', 'error');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const res = await fetch(`/api/comments/${commentId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (data.success) {
      showToast('Note removed', 'success');
      setStudent((prev) =>
        prev
          ? {
              ...prev,
              comments: (prev.comments || []).filter((c) => c.id !== commentId),
            }
          : null
      );
    } else {
      showToast(data.error || 'Failed to delete comment', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Loading candidate profile...</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="flex-1 p-12 max-w-lg mx-auto text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Student Not Found</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          {error || 'The requested student record does not exist or was deleted.'}
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen pb-12">
      {/* Detail Header */}
      <StudentDetailHeader
        student={student}
        onStageChange={handleStageChange}
        onEdit={() => setIsEditOpen(true)}
        onDelete={() => setIsDeleteOpen(true)}
      />

      {/* Main Content Layout */}
      <div className="p-8 max-w-[1600px] w-full mx-auto space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Personal and Academic Info (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <PersonalInfoCard student={student} />
            <AcademicInfoCard student={student} />
            <CommentsSection
              studentId={student.id}
              comments={student.comments || []}
              onAddComment={handleAddComment}
              onUpdateComment={handleUpdateComment}
              onDeleteComment={handleDeleteComment}
            />
          </div>

          {/* Right Column: Resume & Live Preview (5 cols) */}
          <div className="lg:col-span-5">
            <ResumeViewer resumeUrl={student.resumeUrl} studentName={student.fullName} />
          </div>
        </div>
      </div>

      {/* Edit Student Modal */}
      <EditStudentModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        student={student}
        onSave={handleSaveStudent}
      />

      {/* Delete Student Modal */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteStudent}
        title="Delete Candidate"
        message={`Are you sure you want to permanently delete ${student.fullName}? This action cannot be undone.`}
        confirmText="Delete"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
}
