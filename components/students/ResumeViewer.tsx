'use client';

import React, { useState } from 'react';
import { FileText, ExternalLink, ShieldAlert } from 'lucide-react';

interface ResumeViewerProps {
  resumeUrl?: string | null;
  studentName: string;
}

export function ResumeViewer({ resumeUrl, studentName }: ResumeViewerProps) {
  const [embedError, setEmbedError] = useState(false);

  if (!resumeUrl) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center shadow-2xs space-y-3">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <FileText className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-800">Resume Unavailable</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          No resume URL was provided for {studentName}. You can add one by editing the student record.
        </p>
      </div>
    );
  }

  // Helper to determine if URL can be previewed in iframe (Google Drive preview link or direct PDF)
  const getEmbeddableUrl = (url: string) => {
    // Google Drive share link -> preview link
    const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }
    // Direct PDF URL or standard doc viewer
    return url;
  };

  const embedUrl = getEmbeddableUrl(resumeUrl);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-800">Candidate Resume</h3>
        </div>

        <a
          href={resumeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
        >
          <span>Open Resume</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="p-4 flex-1">
        {!embedError ? (
          <div className="w-full h-[520px] rounded-lg border border-slate-200 bg-slate-100 overflow-hidden relative">
            <iframe
              src={embedUrl}
              title={`${studentName}'s Resume`}
              className="w-full h-full border-0"
              onError={() => setEmbedError(true)}
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
            <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded text-[10px] text-slate-500 border border-slate-200">
              Live web preview • Not downloaded locally
            </div>
          </div>
        ) : (
          <div className="py-12 px-6 text-center space-y-3 bg-slate-50 rounded-lg border border-dashed border-slate-300">
            <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto" />
            <h4 className="text-xs font-semibold text-slate-800">Embed preview blocked</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              The external host restricts embedding in frames. Click below to view the original resume directly.
            </p>
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <span>Open in new browser tab</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
