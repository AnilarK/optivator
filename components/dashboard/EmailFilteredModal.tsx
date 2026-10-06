'use client';

import React, { useRef, useState } from 'react';
import { Bold, FileText, Mail, Paperclip, X } from 'lucide-react';
import {
  formatBytes,
  MAX_ATTACHMENT_COUNT,
  MAX_TOTAL_ATTACHMENT_BYTES,
  validateAttachments,
} from '@/lib/email-attachments';

interface EmailFilteredModalProps {
  isOpen: boolean;
  selectedIds: string[];
  onClose: () => void;
  onSent: (count: number) => void;
}

export function EmailFilteredModal({ isOpen, selectedIds, onClose, onSent }: EmailFilteredModalProps) {
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const totalBytes = attachments.reduce((sum, file) => sum + file.size, 0);

  const addFiles = (incoming: FileList | File[] | null) => {
    if (!incoming || incoming.length === 0) return;
    // Skip exact duplicates (same name + size) so double-picking a file does not attach it twice.
    const existing = new Set(attachments.map((file) => `${file.name}:${file.size}`));
    const next = [...attachments, ...Array.from(incoming).filter((file) => !existing.has(`${file.name}:${file.size}`))];
    const problem = validateAttachments(next);
    if (problem) {
      setError(problem);
      return;
    }
    setAttachments(next);
    setError('');
  };

  const removeAttachment = (index: number) => {
    setAttachments((current) => current.filter((_, fileIndex) => fileIndex !== index));
    setError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const bodyText = editorRef.current?.innerText.trim() || '';
    if (!bodyText) {
      setError('Message body is required');
      return;
    }
    setIsSending(true);
    setError('');
    try {
      const problem = validateAttachments(attachments);
      if (problem) throw new Error(problem);
      const form = new FormData();
      form.append('studentIds', JSON.stringify(selectedIds));
      form.append('subject', subject);
      form.append('bodyHtml', bodyHtml);
      attachments.forEach((file) => form.append('attachments', file, file.name));
      // No Content-Type header: the browser sets the multipart boundary itself.
      const response = await fetch('/api/email', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to send email');
      onSent(data.sentCount);
      setSubject('');
      setBodyHtml('');
      setAttachments([]);
      if (editorRef.current) editorRef.current.innerHTML = '';
      onClose();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const toggleBold = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setError('Highlight the text you want to make bold first');
      return;
    }

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      setError('Highlight the text you want to make bold first');
      return;
    }

    editor.focus();
    document.execCommand('bold');
    setBodyHtml(editor.innerHTML);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true">
      <form
        onSubmit={handleSubmit}
        onDragOver={(event) => {
          if (Array.from(event.dataTransfer.types).includes('Files')) {
            event.preventDefault();
            setIsDragging(true);
          }
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
        }}
        onDrop={(event) => {
          if (event.dataTransfer.files.length) {
            event.preventDefault();
            setIsDragging(false);
            addFiles(event.dataTransfer.files);
          }
        }}
        className={`flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col rounded-xl bg-white shadow-2xl border ${isDragging ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-slate-200'}`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Email selected students</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close email composer">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <p className="text-xs text-slate-500">This will send to the {selectedIds.length} selected student{selectedIds.length === 1 ? '' : 's'}. Students without an email address will be skipped.</p>
          <div>
            <label htmlFor="email-subject" className="mb-1 block text-xs font-semibold text-slate-700">Subject</label>
            <input id="email-subject" value={subject} onChange={(event) => setSubject(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" required />
          </div>
          <div>
            <label htmlFor="email-body" className="mb-1 block text-xs font-semibold text-slate-700">Message</label>
            <div className="mb-2 flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 p-1">
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={toggleBold} className="rounded p-1.5 text-slate-600 hover:bg-white hover:text-indigo-700" title="Bold" aria-label="Bold">
                <Bold className="h-4 w-4" />
              </button>
            </div>
            <div
              id="email-body"
              ref={editorRef}
              contentEditable
              role="textbox"
              aria-multiline="true"
              onInput={(event) => setBodyHtml(event.currentTarget.innerHTML)}
              data-placeholder="Write your message..."
              className="min-h-[12rem] w-full resize-y overflow-auto rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Attachments</span>
              {attachments.length > 0 && (
                <span className={`text-[11px] ${totalBytes > MAX_TOTAL_ATTACHMENT_BYTES * 0.9 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {formatBytes(totalBytes)} of {formatBytes(MAX_TOTAL_ATTACHMENT_BYTES)}
                </span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = '';
              }}
            />
            {attachments.length > 0 && (
              <ul className="mb-2 space-y-1">
                {attachments.map((file, index) => (
                  <li key={`${file.name}:${file.size}`} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1 truncate text-slate-700" title={file.name}>{file.name}</span>
                    <span className="shrink-0 text-[11px] text-slate-400">{formatBytes(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="rounded p-0.5 text-slate-400 hover:bg-white hover:text-rose-600"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={attachments.length >= MAX_ATTACHMENT_COUNT}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-xs font-medium text-slate-600 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Paperclip className="h-3.5 w-3.5" />
              {isDragging ? 'Drop files to attach' : 'Attach files or drag them here'}
            </button>
            <p className="mt-1 text-[11px] text-slate-400">
              Up to {MAX_ATTACHMENT_COUNT} files, {formatBytes(MAX_TOTAL_ATTACHMENT_BYTES)} total. Every recipient gets the same files.
            </p>
          </div>
          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={isSending} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
            <Mail className="h-3.5 w-3.5" />
            {isSending
              ? attachments.length ? 'Uploading & sending...' : 'Sending...'
              : attachments.length ? `Send with ${attachments.length} attachment${attachments.length === 1 ? '' : 's'}` : 'Send email'}
          </button>
        </div>
      </form>
    </div>
  );
}