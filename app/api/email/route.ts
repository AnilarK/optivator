import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import prisma from '@/lib/prisma';
import { safeAttachmentName, validateAttachments } from '@/lib/email-attachments';

export const dynamic = 'force-dynamic';

function sanitizeEmailHtml(value: string): string {
  let html = value
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');

  html = html
    .replace(/<\/?(?!strong\b|b\b|br\b|p\b|div\b)[^>]+>/gi, '')
    .replace(/<(strong|b|br|p|div)(?:\s[^>]*)?>/gi, '<$1>');

  return html.split(/(<[^>]+>)/g).map((part) => {
    if (part.startsWith('<')) return part;
    return part.replace(/https?:\/\/[^\s<]+/gi, (matchedUrl) => {
      const trailingCharacters = matchedUrl.match(/[.,!?;:)\]*]+$/)?.[0] || '';
      const url = matchedUrl.slice(0, matchedUrl.length - trailingCharacters.length);
      if (!url) return matchedUrl;
      try {
        const parsedUrl = new URL(url);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) return matchedUrl;
        const safeUrl = escapeHtml(parsedUrl.toString());
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>${escapeHtml(trailingCharacters)}`;
      } catch {
        return matchedUrl;
      }
    });
  }).join('');
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface EmailRequest {
  studentIds: unknown;
  subject: unknown;
  bodyHtml: unknown;
  files: File[];
}

/** Accepts multipart/form-data (with attachments) or the original JSON body. */
async function readEmailRequest(request: NextRequest): Promise<EmailRequest> {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    let studentIds: unknown = [];
    try {
      studentIds = JSON.parse(String(form.get('studentIds') || '[]'));
    } catch {
      studentIds = null;
    }
    return {
      studentIds,
      subject: form.get('subject'),
      bodyHtml: form.get('bodyHtml'),
      files: form.getAll('attachments').filter((entry): entry is File => typeof entry === 'object' && entry !== null && 'arrayBuffer' in entry),
    };
  }
  const { studentIds, subject, bodyHtml } = await request.json();
  return { studentIds, subject, bodyHtml, files: [] };
}

export async function POST(request: NextRequest) {
  try {
    const { studentIds, subject, bodyHtml, files } = await readEmailRequest(request);

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json(
        { success: false, error: 'Gmail is not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD to .env.' },
        { status: 500 }
      );
    }
    if (typeof subject !== 'string' || !subject.trim()) {
      return NextResponse.json({ success: false, error: 'Subject is required' }, { status: 400 });
    }
    if (typeof bodyHtml !== 'string' || !bodyHtml.trim()) {
      return NextResponse.json({ success: false, error: 'Message body is required' }, { status: 400 });
    }

    const attachmentError = validateAttachments(files.map((file) => ({ name: file.name, size: file.size })));
    if (attachmentError) {
      return NextResponse.json({ success: false, error: attachmentError }, { status: 400 });
    }

    const html = sanitizeEmailHtml(bodyHtml);
    const text = htmlToText(html);
    if (!text) {
      return NextResponse.json({ success: false, error: 'Message body is required' }, { status: 400 });
    }

    if (!Array.isArray(studentIds) || studentIds.length === 0 || studentIds.some((id) => typeof id !== 'string')) {
      return NextResponse.json({ success: false, error: 'Select at least one student.' }, { status: 400 });
    }
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { emailAddress: true, emailId: true },
    });
    const recipients = Array.from(new Set(
      students
        .map((student) => student.emailAddress?.trim() || student.emailId?.trim())
        .filter((email): email is string => Boolean(email && email.includes('@')))
        .map((email) => email.toLowerCase())
    ));

    if (recipients.length === 0) {
      return NextResponse.json({ success: false, error: 'No matching students have a valid email address.' }, { status: 400 });
    }
    if (recipients.length > 500) {
      return NextResponse.json({ success: false, error: 'Gmail allows at most 500 recipients per message. Narrow the filters and try again.' }, { status: 400 });
    }

    const attachments = await Promise.all(files.map(async (file) => ({
      filename: safeAttachmentName(file.name),
      content: Buffer.from(await file.arrayBuffer()),
      contentType: file.type || 'application/octet-stream',
    })));

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER,
      bcc: recipients,
      subject: subject.trim(),
      text,
      html,
      attachments,
    });

    return NextResponse.json({ success: true, sentCount: recipients.length, attachmentCount: attachments.length });
  } catch (error) {
    const smtp = error as { code?: string; responseCode?: number; response?: string; command?: string };
    // Gmail's SMTP reply (e.g. "552-5.7.0 This message was blocked…") explains refusals; it never contains credentials.
    const gmailSays = (smtp?.response || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    console.error('Error in POST /api/email:', smtp?.code, smtp?.responseCode, gmailSays || (error instanceof Error ? error.message : error));

    if (smtp?.code === 'EAUTH') {
      return NextResponse.json({ success: false, error: 'Gmail rejected the login. Check GMAIL_USER and GMAIL_APP_PASSWORD in .env.' }, { status: 500 });
    }
    // Gmail uses 552 both for oversized messages and for blocked content, so check the text first.
    if (/blocked|security|suspicious|spam|unsolicited|policy/i.test(gmailSays)) {
      return NextResponse.json({ success: false, error: `Gmail refused to send this message because it looks suspicious/spam-like to its filters. Gmail said: "${gmailSays}"` }, { status: 400 });
    }
    if (smtp?.responseCode === 552 || /size|too large/i.test(gmailSays)) {
      return NextResponse.json({ success: false, error: 'Gmail rejected the message because it is too large. Remove some attachments or share them as links.' }, { status: 413 });
    }
    if (/limit|quota|rate/i.test(gmailSays)) {
      return NextResponse.json({ success: false, error: `Gmail sending limit reached. Wait a while and try again. Gmail said: "${gmailSays}"` }, { status: 429 });
    }
    return NextResponse.json({
      success: false,
      error: gmailSays
        ? `Gmail could not send the email. Gmail said: "${gmailSays}"`
        : 'Failed to send email. Check your Gmail settings and app password.',
    }, { status: 500 });
  }
}
