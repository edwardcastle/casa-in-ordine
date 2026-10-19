import { beforeEach, describe, expect, it, vi } from 'vitest';

const blob = vi.hoisted(() => ({
  head: vi.fn(),
  del: vi.fn(),
  issueSignedToken: vi.fn(),
  presignUrl: vi.fn(),
  BlobNotFoundError: class BlobNotFoundError extends Error {},
}));

vi.mock('@vercel/blob', () => blob);

import {
  confirmUpload,
  createDownloadUrl,
  createUploadUrl,
  deleteFiles,
  validateUpload,
} from '@/lib/area/files';

const MB = 1024 * 1024;
const PROJECT = '3f1c2a52-8f6e-4d49-9a6b-0d3b1f0c7a11';
const KEY = `area/${PROJECT}/9b2f1c64-1a2b-4c3d-8e4f-5a6b7c8d9e0f.pdf`;
const TOKEN = { delegationToken: 'delegation', clientSigningToken: 'secret', validUntil: 0 };

beforeEach(() => {
  vi.resetAllMocks();
  blob.issueSignedToken.mockResolvedValue(TOKEN);
  blob.presignUrl.mockResolvedValue({ presignedUrl: 'https://blob.example/signed' });
});

describe('validateUpload', () => {
  it('accepts a 1 MB PDF', () => {
    expect(validateUpload({ type: 'application/pdf', size: MB })).toEqual({ ok: true });
  });

  it('accepts a JPEG of exactly 15 MB', () => {
    expect(validateUpload({ type: 'image/jpeg', size: 15 * MB })).toEqual({ ok: true });
  });

  it('accepts PNG and WebP', () => {
    expect(validateUpload({ type: 'image/png', size: 10 })).toEqual({ ok: true });
    expect(validateUpload({ type: 'image/webp', size: 10 })).toEqual({ ok: true });
  });

  it('rejects 15 MB + 1 byte as size', () => {
    expect(validateUpload({ type: 'image/jpeg', size: 15 * MB + 1 })).toEqual({
      ok: false,
      reason: 'size',
    });
  });

  it('rejects an empty file as size', () => {
    expect(validateUpload({ type: 'application/pdf', size: 0 })).toEqual({
      ok: false,
      reason: 'size',
    });
  });

  it('rejects video/mp4 as type', () => {
    expect(validateUpload({ type: 'video/mp4', size: MB })).toEqual({ ok: false, reason: 'type' });
  });

  it('rejects a Word document as type', () => {
    expect(
      validateUpload({
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: MB,
      }),
    ).toEqual({ ok: false, reason: 'type' });
  });

  it('reports type before size when both are wrong', () => {
    expect(validateUpload({ type: 'text/html', size: 20 * MB })).toEqual({
      ok: false,
      reason: 'type',
    });
  });
});

describe('confirmUpload', () => {
  it('returns null when the object is missing', async () => {
    blob.head.mockRejectedValue(new blob.BlobNotFoundError('missing'));
    expect(await confirmUpload(KEY)).toBeNull();
  });

  it('returns null for a stored object of 20 MB', async () => {
    blob.head.mockResolvedValue({ contentType: 'application/pdf', size: 20 * MB });
    expect(await confirmUpload(KEY)).toBeNull();
  });

  it('returns null for stored text/html', async () => {
    blob.head.mockResolvedValue({ contentType: 'text/html', size: 100 });
    expect(await confirmUpload(KEY)).toBeNull();
  });

  it('returns type and size for a valid PDF', async () => {
    blob.head.mockResolvedValue({ contentType: 'application/pdf', size: 12 * MB });
    expect(await confirmUpload(KEY)).toEqual({ type: 'application/pdf', size: 12 * MB });
    expect(blob.head).toHaveBeenCalledWith(KEY);
  });

  it('lets unexpected storage errors through instead of calling the file missing', async () => {
    blob.head.mockRejectedValue(new Error('storage down'));
    await expect(confirmUpload(KEY)).rejects.toThrow('storage down');
  });

  it('returns null for a key this module would never have issued', async () => {
    expect(await confirmUpload('area/other/evil.pdf')).toBeNull();
    expect(await confirmUpload('../etc/passwd')).toBeNull();
    expect(blob.head).not.toHaveBeenCalled();
  });
});

describe('createUploadUrl', () => {
  it('signs a private, constrained, 10 minute PUT under the project prefix', async () => {
    const before = Date.now();
    const { uploadUrl, key } = await createUploadUrl(PROJECT, { type: 'image/jpeg', size: MB });

    expect(uploadUrl).toBe('https://blob.example/signed');
    expect(key).toMatch(new RegExp(`^area/${PROJECT}/[0-9a-f-]{36}\\.jpg$`));

    const issued = blob.issueSignedToken.mock.calls[0][0];
    expect(issued.pathname).toBe(key);
    expect(issued.operations).toEqual(['put']);
    expect(issued.allowedContentTypes).toEqual(['image/jpeg']);
    expect(issued.maximumSizeInBytes).toBe(15 * MB);
    expect(issued.validUntil).toBeGreaterThanOrEqual(before + 10 * 60_000);
    expect(issued.validUntil).toBeLessThanOrEqual(Date.now() + 10 * 60_000);

    expect(blob.presignUrl).toHaveBeenCalledTimes(1);
    const [token, options] = blob.presignUrl.mock.calls[0];
    expect(token).toBe(TOKEN);
    expect(options).toMatchObject({
      operation: 'put',
      pathname: key,
      access: 'private',
      allowedContentTypes: ['image/jpeg'],
      maximumSizeInBytes: 15 * MB,
      addRandomSuffix: false,
      allowOverwrite: false,
    });
    expect(options.validUntil).toBe(issued.validUntil);
  });

  it.each([
    ['application/pdf', 'pdf'],
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
  ])('derives the extension for %s from the content type', async (type, ext) => {
    const { key } = await createUploadUrl(PROJECT, { type, size: 10 });
    expect(key.endsWith(`.${ext}`)).toBe(true);
  });

  it('gives each upload its own key', async () => {
    const a = await createUploadUrl(PROJECT, { type: 'application/pdf', size: 10 });
    const b = await createUploadUrl(PROJECT, { type: 'application/pdf', size: 10 });
    expect(a.key).not.toBe(b.key);
  });

  it('throws, and signs nothing, for a disallowed type', async () => {
    await expect(createUploadUrl(PROJECT, { type: 'video/mp4', size: 10 })).rejects.toThrow();
    expect(blob.issueSignedToken).not.toHaveBeenCalled();
  });

  it('throws, and signs nothing, for an oversized file', async () => {
    await expect(
      createUploadUrl(PROJECT, { type: 'application/pdf', size: 15 * MB + 1 }),
    ).rejects.toThrow();
    expect(blob.issueSignedToken).not.toHaveBeenCalled();
  });

  it('throws for a project id that is not a uuid', async () => {
    await expect(
      createUploadUrl('../../x', { type: 'application/pdf', size: 10 }),
    ).rejects.toThrow();
    expect(blob.issueSignedToken).not.toHaveBeenCalled();
  });
});

describe('createDownloadUrl', () => {
  it('signs a private GET for that key, valid 5 minutes', async () => {
    const before = Date.now();
    expect(await createDownloadUrl(KEY)).toBe('https://blob.example/signed');

    const issued = blob.issueSignedToken.mock.calls[0][0];
    expect(issued.pathname).toBe(KEY);
    expect(issued.operations).toEqual(['get']);
    expect(issued.validUntil).toBeGreaterThanOrEqual(before + 5 * 60_000);
    expect(issued.validUntil).toBeLessThanOrEqual(Date.now() + 5 * 60_000);

    const [token, options] = blob.presignUrl.mock.calls[0];
    expect(token).toBe(TOKEN);
    expect(options).toEqual({
      operation: 'get',
      pathname: KEY,
      access: 'private',
      validUntil: issued.validUntil,
    });
  });
});

describe('deleteFiles', () => {
  it('does nothing for an empty list', async () => {
    await deleteFiles([]);
    expect(blob.del).not.toHaveBeenCalled();
  });

  it('deletes the given keys in one call', async () => {
    await deleteFiles([KEY, 'area/x/y.png']);
    expect(blob.del).toHaveBeenCalledWith([KEY, 'area/x/y.png']);
  });
});
