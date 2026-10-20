import { randomUUID } from 'node:crypto';
import { BlobNotFoundError, del, head, issueSignedToken, presignUrl } from '@vercel/blob';
import { EXTENSIONS, MAX_BYTES, validateUpload, type FileInfo } from './upload-rules';

export { MAX_BYTES, validateUpload };

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

const UPLOAD_TTL_MS = 10 * 60_000;
const DOWNLOAD_TTL_MS = 5 * 60_000;

const UUID_SOURCE = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const UUID = new RegExp(`^${UUID_SOURCE}$`, 'i');
// The file part of a key, exactly as `createUploadUrl` issues it.
const KEY_FILE = new RegExp(`^${UUID_SOURCE}\\.(pdf|jpg|png|webp)$`, 'i');

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
 * the browser, so it is trusted only if it sits under this project's prefix and
 * has the shape we issue. A key from another project is refused without
 * touching storage.
 */
/** Whether `key` has exactly the shape createUploadUrl gives this project's files. */
export function isProjectFileKey(projectId: string, key: string): boolean {
  if (!UUID.test(projectId)) return false;
  const prefix = `area/${projectId}/`;
  return key.startsWith(prefix) && KEY_FILE.test(key.slice(prefix.length));
}

export async function confirmUpload(projectId: string, key: string): Promise<FileInfo | null> {
  if (!isProjectFileKey(projectId, key)) return null;

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
