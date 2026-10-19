import { randomUUID } from 'node:crypto';
import { BlobNotFoundError, del, head, issueSignedToken, presignUrl } from '@vercel/blob';

/**
 * Private client files.
 *
 * Vercel caps a function request body at 4.5 MB (and server actions at 1 MB by
 * default), so a 12 MB floor plan cannot travel through this site. The browser
 * uploads straight to private Blob storage with a short-lived signed URL, and
 * downloads work the same way: the route checks ownership, then redirects to a
 * signed URL that expires in minutes. The bytes never touch our functions.
 *
 * This is the only module that imports `@vercel/blob`.
 *
 * Every URL gets its own delegation token scoped to a single pathname and
 * operation, so a leaked URL opens one file for a few minutes and nothing else.
 * Issuing a token is a network call to the Blob control API; that is cheap
 * next to the upload or download it fronts, and caching a wider token would
 * trade away that scoping.
 */

export const MAX_BYTES = 15 * 1024 * 1024;

const EXTENSIONS = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

const ALLOWED_TYPES = Object.keys(EXTENSIONS);

const UPLOAD_TTL_MS = 10 * 60_000;
const DOWNLOAD_TTL_MS = 5 * 60_000;

const UUID_SOURCE = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const UUID = new RegExp(`^${UUID_SOURCE}$`, 'i');
// Exactly the shape `createUploadUrl` issues; anything else is not ours.
const KEY = new RegExp(`^area/${UUID_SOURCE}/${UUID_SOURCE}\\.(pdf|jpg|png|webp)$`, 'i');

type FileInfo = { type: string; size: number };

export function validateUpload(file: FileInfo): { ok: true } | { ok: false; reason: 'type' | 'size' } {
  if (!ALLOWED_TYPES.includes(file.type)) return { ok: false, reason: 'type' };
  if (!(file.size > 0) || file.size > MAX_BYTES) return { ok: false, reason: 'size' };
  return { ok: true };
}

/**
 * A signed PUT URL for one new file in the project, and the key it will be
 * stored under. The CDN enforces the content type and size cap when the
 * browser uploads; `confirmUpload` re-checks what actually landed.
 */
export async function createUploadUrl(
  projectId: string,
  file: FileInfo,
): Promise<{ uploadUrl: string; key: string }> {
  if (!UUID.test(projectId)) throw new Error('Invalid project id');

  const check = validateUpload(file);
  if (!check.ok) throw new Error(`Upload rejected: ${check.reason}`);

  // The extension comes from the validated content type, never from the
  // user's filename.
  const ext = EXTENSIONS[file.type as keyof typeof EXTENSIONS];
  const key = `area/${projectId}/${randomUUID()}.${ext}`;
  const validUntil = Date.now() + UPLOAD_TTL_MS;

  const token = await issueSignedToken({
    pathname: key,
    operations: ['put'],
    validUntil,
    allowedContentTypes: [file.type],
    maximumSizeInBytes: MAX_BYTES,
  });
  const { presignedUrl } = await presignUrl(token, {
    operation: 'put',
    pathname: key,
    access: 'private',
    validUntil,
    allowedContentTypes: [file.type],
    maximumSizeInBytes: MAX_BYTES,
    addRandomSuffix: false,
    allowOverwrite: false,
  });

  return { uploadUrl: presignedUrl, key };
}

/**
 * The stored object's type and size, or null if it is missing or would not have
 * passed `validateUpload`. This is the completion check: the key arrives from
 * the browser, so it is trusted only if it has the shape we issue.
 */
export async function confirmUpload(key: string): Promise<FileInfo | null> {
  if (!KEY.test(key)) return null;

  let stored;
  try {
    stored = await head(key);
  } catch (error) {
    if (error instanceof BlobNotFoundError) return null;
    throw error;
  }

  const file = { type: stored.contentType, size: stored.size };
  return validateUpload(file).ok ? file : null;
}

/** A signed GET URL for a stored file, valid for 5 minutes. */
export async function createDownloadUrl(key: string): Promise<string> {
  const validUntil = Date.now() + DOWNLOAD_TTL_MS;

  const token = await issueSignedToken({ pathname: key, operations: ['get'], validUntil });
  const { presignedUrl } = await presignUrl(token, {
    operation: 'get',
    pathname: key,
    access: 'private',
    validUntil,
  });

  return presignedUrl;
}

/** Remove stored files, for when a material or a client is deleted. */
export async function deleteFiles(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await del(keys);
}
