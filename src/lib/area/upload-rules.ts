/**
 * Upload rules shared by the server (`files.ts`) and the admin upload form.
 * Kept free of `@vercel/blob` so the browser bundle can import it and show the
 * reason for a rejection before anything is sent.
 */

export const MAX_BYTES = 15 * 1024 * 1024;

export const EXTENSIONS = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export const ALLOWED_TYPES: string[] = Object.keys(EXTENSIONS);

export type FileInfo = { type: string; size: number };

export function validateUpload(file: FileInfo): { ok: true } | { ok: false; reason: 'type' | 'size' } {
  if (!ALLOWED_TYPES.includes(file.type)) return { ok: false, reason: 'type' };
  if (!(file.size > 0) || file.size > MAX_BYTES) return { ok: false, reason: 'size' };
  return { ok: true };
}
