'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { useToast } from '@/components/ui/ToastContext';
import { ImportPreviewResult, ImportCommitResult } from '@/lib/types';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Download,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

export default function ImportPage() {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Preview & Result states
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [commitResult, setCommitResult] = useState<ImportCommitResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && !file.name.endsWith('.txt')) {
      showToast('Please upload a valid CSV file (.csv)', 'error');
      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);
    setCommitResult(null);

    // Call API with action=preview
    try {
      setIsPreviewing(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'preview');

      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setPreviewResult(data);
      } else {
        setErrorMessage(data.error || 'Failed to parse CSV file');
        setPreviewResult(null);
      }
    } catch {
      setErrorMessage('Network error communicating with the local server');
      setPreviewResult(null);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedFile) return;

    try {
      setIsImporting(true);
      setErrorMessage(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('action', 'commit');

      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setCommitResult(data);
        showToast(
          `Imported ${data.newCount} new, updated ${data.updatedCount} existing`,
          'success'
        );
      } else {
        setErrorMessage(data.error || 'Failed to complete import');
      }
    } catch {
      setErrorMessage('Network error during import');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewResult(null);
    setCommitResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadSample = () => {
    const sampleCsv = `Timestamp,Full Name,Email Address,Contact Number,Gender,DOB,Registration No.,College/ Institute Name:,Course/ Degree:,Passing Year,Specialization / Branch:,Class 10 Percentage,Class 12 Percentage,Current Graduation CGPA,Do you have any active backlogs ?,Resume URL
2024-03-01 10:00:00,Aarav Singhania,aarav.singhania@example.com,+91 9876543230,Male,2002-04-15,REG-2024-101,IIIT Delhi,B.Tech,2025,Computer Science,94.5,92.0,8.85,No,https://example.com/resumes/aarav.pdf
2024-03-01 11:30:00,Riya Sen,riya.sen@example.com,+91 9876543231,Female,2003-01-20,REG-2024-102,NIT Warangal,B.Tech,2025,Information Technology,96.2,93.5,9.20,No,https://example.com/resumes/riya.pdf
2024-03-01 14:15:00,Aditya Roy,aditya.roy@example.com,+91 9876543232,Male,2002-09-12,REG-2024-103,BITS Pilani,B.E.,2025,Electronics,88.0,84.5,7.95,Yes (1 active backlog),https://example.com/resumes/aditya.pdf
`;
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_students_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Import Students"
        subtitle="Upload a CSV/Excel export from Google Forms or spreadsheets to import and update candidates"
      />

      <div className="p-8 max-w-5xl w-full mx-auto space-y-6 flex-1">
        {/* Sample Download Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">Need a CSV template?</p>
              <p className="text-[11px] text-slate-500">
                Download our sample CSV with standard columns (Timestamp, Name, Reg No, CGPA, etc.)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadSample}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors w-fit"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Download Sample CSV</span>
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold">Import Notice</p>
              <p className="text-xs mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Successful Completion Summary (Section 23) */}
        {commitResult && (
          <div className="bg-white p-6 rounded-xl border border-emerald-200 shadow-sm space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-emerald-700">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">✓ Import Completed</h3>
                <p className="text-xs text-slate-500">
                  Data was successfully verified and committed to SQLite (`./data/students.db`).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-semibold text-slate-500">Total Processed</span>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{commitResult.total}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="text-[10px] uppercase font-semibold text-emerald-700">New Students</span>
                <p className="text-xl font-bold text-emerald-800 mt-0.5">{commitResult.newCount}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-[10px] uppercase font-semibold text-blue-700">
                  Updated Existing
                </span>
                <p className="text-xl font-bold text-blue-800 mt-0.5">{commitResult.updatedCount}</p>
                <span className="text-[10px] text-blue-600">Stages & comments preserved</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <span className="text-[10px] uppercase font-semibold text-amber-700">Invalid / Skipped</span>
                <p className="text-xl font-bold text-amber-800 mt-0.5">{commitResult.invalidCount}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Upload Another File</span>
              </button>

              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Dropzone (When not committed) */}
        {!commitResult && !previewResult && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all bg-white ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/50 shadow-md scale-[0.99]'
                : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
                <UploadCloud className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">
                  Drop CSV file here, or click to browse
                </p>
                <p className="text-xs text-slate-500">
                  Supports comma-separated values exported from Google Forms, Excel, or ATS
                </p>
              </div>
              <div className="inline-block px-3 py-1.5 bg-slate-100 text-slate-600 rounded-md text-[11px] font-mono">
                students.csv
              </div>
            </div>
          </div>
        )}

        {/* Loading Indicator during preview */}
        {isPreviewing && (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            <p className="text-xs font-semibold text-slate-700">
              Parsing and cross-checking candidate records against SQLite...
            </p>
          </div>
        )}

        {/* Verification Preview (Section 2 & 23) */}
        {previewResult && !commitResult && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden space-y-5 p-6 animate-in fade-in duration-150">
            {/* Summary Badge Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedFile?.name}</h3>
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-800">{previewResult.total}</span> records found in file
                  </p>
                </div>
              </div>

              {/* Status Counters */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{previewResult.newCount} New Students</span>
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>{previewResult.updatedCount} Existing (Updates)</span>
                </span>
                {previewResult.invalidCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>{previewResult.invalidCount} Invalid</span>
                  </span>
                )}
              </div>
            </div>

            {/* Note on duplicate protection */}
            <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg text-xs text-indigo-950 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Safe Import Guarantee: </span>
                <span>
                  For existing students matched by Registration No. or Email, their academic and contact info will update,
                  while their <strong>recruitment stage</strong> and <strong>evaluation notes</strong> will remain intact.
                </span>
              </div>
            </div>

            {/* Preview Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                First {previewResult.previewRows.length} Records Preview
              </h4>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[10px] font-semibold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Full Name</th>
                      <th className="py-2.5 px-3">Registration No.</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">College</th>
                      <th className="py-2.5 px-2.5">CGPA</th>
                      <th className="py-2.5 px-2.5">Backlogs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewResult.previewRows.map((row) => (
                      <tr key={row.rowNumber} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3">
                          {!row.isValid ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              Invalid
                            </span>
                          ) : row.existsInDb ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              Update ({row.existingStage})
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              New
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {row.data.fullName || <span className="text-rose-500 italic">Missing name</span>}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          {row.data.registrationNo || <span className="text-slate-400">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {row.data.emailAddress || row.data.emailId || <span className="text-slate-400">—</span>}
                        </td>
                        <td className="py-2.5 px-3 truncate max-w-[160px]">
                          {row.data.college || <span className="text-slate-400">—</span>}
                        </td>
                        <td className="py-2.5 px-2.5 font-semibold text-slate-900">
                          {row.data.graduationCGPA !== undefined ? row.data.graduationCGPA.toFixed(2) : '—'}
                        </td>
                        <td className="py-2.5 px-2.5">
                          {row.data.activeBacklogs ? (
                            <span className="text-rose-600 font-medium">Yes</span>
                          ) : (
                            <span className="text-emerald-600 font-medium">No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleReset}
                disabled={isImporting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel & Select Another
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isImporting || previewResult.total === 0}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Importing into SQLite...</span>
                  </>
                ) : (
                  <>
                    <span>Import {previewResult.total} Students</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
