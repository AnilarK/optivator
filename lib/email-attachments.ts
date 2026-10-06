// Attachment rules shared by the email composer (browser) and /api/email (server).

/** Gmail rejects messages over 25 MB *after* base64 encoding (~4/3 growth), so keep raw files under ~18 MB. */
export const MAX_TOTAL_ATTACHMENT_BYTES = 18 * 1024 * 1024;
export const MAX_ATTACHMENT_COUNT = 10;

/** Extensions Gmail blocks outright; rejecting them early gives a clear error instead of a failed send. */
const BLOCKED_EXTENSIONS = new Set([
  'ade', 'adp', 'apk', 'appx', 'appxbundle', 'bat', 'cab', 'chm', 'cmd', 'com', 'cpl', 'dll', 'dmg', 'ex', 'ex_', 'exe',
  'hta', 'ins', 'isp', 'iso', 'jar', 'js', 'jse', 'lib', 'lnk', 'mde', 'msc', 'msi', 'msix', 'msixbundle', 'msp', 'mst',
  'nsh', 'pif', 'ps1', 'scr', 'sct', 'shb', 'sys', 'vb', 'vbe', 'vbs', 'vxd', 'wsc', 'wsf', 'wsh',
]);

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Strips any path and control characters so the recipient sees a clean file name. */
export function safeAttachmentName(name: string): string {
  const base = name.split(/[\\/]/).pop() || '';
  const cleaned = base.replace(/[\u0000-\u001f\u007f"<>|:*?]/g, '').trim();
  return cleaned.slice(0, 180) || 'attachment';
}

/** Returns an error message, or null when the set of files is acceptable. */
export function validateAttachments(files: { name: string; size: number }[]): string | null {
  if (files.length > MAX_ATTACHMENT_COUNT) return `Attach at most ${MAX_ATTACHMENT_COUNT} files.`;
  for (const file of files) {
    const extension = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
    if (BLOCKED_EXTENSIONS.has(extension)) {
      return `"${file.name}" can't be sent: Gmail blocks .${extension} files. Share it as a link instead.`;
    }
    if (file.size === 0) return `"${file.name}" is empty.`;
  }
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_TOTAL_ATTACHMENT_BYTES) {
    return `Attachments total ${formatBytes(total)}; the limit is ${formatBytes(MAX_TOTAL_ATTACHMENT_BYTES)} (Gmail's 25 MB cap after encoding). Share large files as a link instead.`;
  }
  return null;
}
