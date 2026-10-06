'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { StudentRecord } from '@/lib/types';
import { STAGES } from '@/lib/stages';

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentRecord | null;
  onSave: (data: Partial<StudentRecord>) => Promise<void>;
}

export function EditStudentModal({
  isOpen,
  onClose,
  student,
  onSave,
}: EditStudentModalProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    registrationNo: '',
    emailAddress: '',
    contactNumber: '',
    gender: '',
    dob: '',
    college: '',
    course: '',
    specialization: '',
    passingYear: '',
    class10Percentage: '',
    class12Percentage: '',
    graduationCGPA: '',
    atsScore: '',
    cfRating: '',
    leetcodeRating: '',
    codechefRating: '',
    hackerRankUsername: '',
    activeBacklogs: false,
    activeBacklogsRaw: 'No',
    resumeUrl: '',
    stage: 'New',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (student) {
      setFormData({
        fullName: student.fullName || '',
        registrationNo: student.registrationNo || '',
        emailAddress: student.emailAddress || student.emailId || '',
        contactNumber: student.contactNumber || '',
        gender: student.gender || '',
        dob: student.dob || '',
        college: student.college || '',
        course: student.course || '',
        specialization: student.specialization || '',
        passingYear: student.passingYear ? student.passingYear.toString() : '',
        class10Percentage: student.class10Percentage !== null && student.class10Percentage !== undefined ? student.class10Percentage.toString() : '',
        class12Percentage: student.class12Percentage !== null && student.class12Percentage !== undefined ? student.class12Percentage.toString() : '',
        graduationCGPA: student.graduationCGPA !== null && student.graduationCGPA !== undefined ? student.graduationCGPA.toString() : '',
        atsScore: student.atsScore !== null && student.atsScore !== undefined ? student.atsScore.toString() : '',
        cfRating: student.cfRating !== null && student.cfRating !== undefined ? student.cfRating.toString() : '',
        leetcodeRating: student.leetcodeRating !== null && student.leetcodeRating !== undefined ? student.leetcodeRating.toString() : '',
        codechefRating: student.codechefRating !== null && student.codechefRating !== undefined ? student.codechefRating.toString() : '',
        hackerRankUsername: student.hackerRankUsername || '',
        activeBacklogs: student.activeBacklogs || false,
        activeBacklogsRaw: student.activeBacklogsRaw || (student.activeBacklogs ? 'Yes' : 'No'),
        resumeUrl: student.resumeUrl || '',
        stage: student.stage || 'New',
      });
    } else {
      setFormData({
        fullName: '',
        registrationNo: '',
        emailAddress: '',
        contactNumber: '',
        gender: '',
        dob: '',
        college: '',
        course: 'B.Tech',
        specialization: '',
        passingYear: '2025',
        class10Percentage: '',
        class12Percentage: '',
        graduationCGPA: '',
        atsScore: '',
        cfRating: '',
        leetcodeRating: '',
        codechefRating: '',
        hackerRankUsername: '',
        activeBacklogs: false,
        activeBacklogsRaw: 'No',
        resumeUrl: '',
        stage: 'New',
      });
    }
    setError(null);
  }, [student, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      setError('Full Name is required');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await onSave({
        fullName: formData.fullName.trim(),
        registrationNo: formData.registrationNo.trim() || null,
        emailAddress: formData.emailAddress.trim() || null,
        emailId: formData.emailAddress.trim() || null,
        contactNumber: formData.contactNumber.trim() || null,
        gender: formData.gender.trim() || null,
        dob: formData.dob.trim() || null,
        college: formData.college.trim() || null,
        course: formData.course.trim() || null,
        specialization: formData.specialization.trim() || null,
        passingYear: formData.passingYear ? parseInt(formData.passingYear, 10) : null,
        class10Percentage: formData.class10Percentage ? parseFloat(formData.class10Percentage) : null,
        class12Percentage: formData.class12Percentage ? parseFloat(formData.class12Percentage) : null,
        graduationCGPA: formData.graduationCGPA ? parseFloat(formData.graduationCGPA) : null,
        atsScore: formData.atsScore ? parseFloat(formData.atsScore) : null,
        cfRating: formData.cfRating ? parseFloat(formData.cfRating) : null,
        leetcodeRating: formData.leetcodeRating ? parseFloat(formData.leetcodeRating) : null,
        codechefRating: formData.codechefRating ? parseFloat(formData.codechefRating) : null,
        hackerRankUsername: formData.hackerRankUsername.trim() || null,
        activeBacklogs: formData.activeBacklogs,
        activeBacklogsRaw: formData.activeBacklogsRaw,
        resumeUrl: formData.resumeUrl.trim() || null,
        stage: formData.stage,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save student details');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={student ? `Edit Student: ${student.fullName}` : 'Add New Student'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Full Name */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
              placeholder="e.g. Rahul Sharma"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">HackerRank Username</label>
            <input
              type="text"
              value={formData.hackerRankUsername}
              onChange={(e) => setFormData({ ...formData, hackerRankUsername: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
              placeholder="Used for exact contest matching"
            />
          </div>

          {/* Registration No */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Registration No.</label>
            <input
              type="text"
              value={formData.registrationNo}
              onChange={(e) => setFormData({ ...formData, registrationNo: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
              placeholder="e.g. 2021CS001"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={formData.emailAddress}
              onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
              placeholder="student@example.com"
            />
          </div>

          {/* Contact */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Contact Number</label>
            <input
              type="text"
              value={formData.contactNumber}
              onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
              placeholder="+91 9876543210"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Gender</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 bg-white"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* DOB */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Date of Birth</label>
            <input
              type="text"
              value={formData.dob}
              onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
              placeholder="YYYY-MM-DD or DD/MM/YYYY"
            />
          </div>

          {/* College */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">College / Institute</label>
            <input
              type="text"
              value={formData.college}
              onChange={(e) => setFormData({ ...formData, college: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
              placeholder="IIIT Jabalpur"
            />
          </div>

          {/* Course */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Course / Degree</label>
            <input
              type="text"
              value={formData.course}
              onChange={(e) => setFormData({ ...formData, course: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
              placeholder="B.Tech"
            />
          </div>

          {/* Specialization */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Specialization / Branch</label>
            <input
              type="text"
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
              placeholder="Computer Science"
            />
          </div>

          {/* Passing Year */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Passing Year</label>
            <input
              type="number"
              value={formData.passingYear}
              onChange={(e) => setFormData({ ...formData, passingYear: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
              placeholder="2025"
            />
          </div>

          {/* Class 10 % */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Class 10 Percentage</label>
            <input
              type="number"
              step="0.01"
              value={formData.class10Percentage}
              onChange={(e) => setFormData({ ...formData, class10Percentage: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
              placeholder="88.5"
            />
          </div>

          {/* Class 12 % */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Class 12 Percentage</label>
            <input
              type="number"
              step="0.01"
              value={formData.class12Percentage}
              onChange={(e) => setFormData({ ...formData, class12Percentage: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
              placeholder="85.0"
            />
          </div>

          {/* Graduation CGPA */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Graduation CGPA</label>
            <input
              type="number"
              step="0.01"
              max="10"
              value={formData.graduationCGPA}
              onChange={(e) => setFormData({ ...formData, graduationCGPA: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
              placeholder="8.5"
            />
          </div>

          {/* Manual Candidate Ratings */}
          <div className="sm:col-span-2 border-t border-slate-200 pt-3 mt-1">
            <p className="font-semibold text-slate-700 mb-2">Manual Resume & Coding Ratings</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">ATS Score</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.atsScore}
                  onChange={(e) => setFormData({ ...formData, atsScore: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
                  placeholder="e.g. 78"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Codeforces Rating</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.cfRating}
                  onChange={(e) => setFormData({ ...formData, cfRating: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
                  placeholder="e.g. 1200"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">LeetCode Rating</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.leetcodeRating}
                  onChange={(e) => setFormData({ ...formData, leetcodeRating: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
                  placeholder="e.g. 1600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">CodeChef Rating</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.codechefRating}
                  onChange={(e) => setFormData({ ...formData, codechefRating: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
                  placeholder="e.g. 1300"
                />
              </div>
            </div>
          </div>

          {/* Stage */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Recruitment Stage</label>
            <select
              value={formData.stage}
              onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 bg-white"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Backlogs checkbox & text */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.activeBacklogs}
              onChange={(e) => {
                const checked = e.target.checked;
                setFormData({
                  ...formData,
                  activeBacklogs: checked,
                  activeBacklogsRaw: checked ? 'Yes' : 'No',
                });
              }}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <span className="font-semibold text-slate-700">Has Active Backlogs</span>
          </label>
          {formData.activeBacklogs && (
            <div>
              <label className="block text-[11px] text-slate-500 mb-0.5">Backlogs Note / Subject</label>
              <input
                type="text"
                value={formData.activeBacklogsRaw}
                onChange={(e) => setFormData({ ...formData, activeBacklogsRaw: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900 text-xs"
                placeholder="e.g. Yes (Maths)"
              />
            </div>
          )}
        </div>

        {/* Resume URL */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Resume URL</label>
          <input
            type="url"
            value={formData.resumeUrl}
            onChange={(e) => setFormData({ ...formData, resumeUrl: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
            placeholder="https://drive.google.com/... or https://example.com/resume.pdf"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : student ? 'Save Changes' : 'Create Student'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
