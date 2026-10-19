import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeTestDb, hasTestDb, resetAreaTables, testDb } from '../helpers/db';

const SECRET = 's'.repeat(32);
const SIGNED = 'https://blob.example/signed?sig=abc';

vi.mock('@vercel/blob', () => ({
  head: vi.fn(),
  del: vi.fn(),
  issueSignedToken: vi.fn(async () => ({
    delegationToken: 'd',
    clientSigningToken: 's',
    validUntil: 0,
  })),
  presignUrl: vi.fn(async () => ({ presignedUrl: SIGNED })),
  BlobNotFoundError: class BlobNotFoundError extends Error {},
}));

let cookieValue: string | undefined;
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === 'cio_client' && cookieValue ? { name, value: cookieValue } : undefined,
  }),
}));

import { GET } from '@/app/api/area/files/[id]/route';
import { signClientCookie } from '@/lib/area/session';

async function insertClientWithFile(email: string) {
  const sql = testDb();
  const [client] = await sql<{ id: string }[]>`
    INSERT INTO clients (email, name) VALUES (${email}, ${email}) RETURNING id`;
  const [project] = await sql<{ id: string }[]>`
    INSERT INTO client_projects (client_id, title, zone, status, summary)
    VALUES (${client.id}, 'P', 'cucina', 'in_progress', 'S') RETURNING id`;
  const [file] = await sql<{ id: string }[]>`
    INSERT INTO project_materials (project_id, kind, title, file_key, file_type, file_size)
    VALUES (${project.id}, 'file', 'Plan', ${`area/${project.id}/x.pdf`}, 'application/pdf', 10)
    RETURNING id`;
  return { clientId: client.id, materialId: file.id };
}

function call(id: string) {
  return GET(new Request(`http://localhost/api/area/files/${id}`) as never, {
    params: Promise.resolve({ id }),
  });
}

describe.skipIf(!hasTestDb())('file download route', () => {
  let a: { clientId: string; materialId: string };
  let b: { clientId: string; materialId: string };

  beforeEach(async () => {
    process.env.CLIENT_SESSION_SECRET = SECRET;
    cookieValue = undefined;
    await resetAreaTables();
    a = await insertClientWithFile('a@example.com');
    b = await insertClientWithFile('b@example.com');
  });

  afterAll(closeTestDb);

  it('answers 401 when signed out', async () => {
    const res = await call(a.materialId);
    expect(res.status).toBe(401);
    expect(res.headers.get('location')).toBeNull();
  });

  it("answers 404 for another client's material", async () => {
    cookieValue = signClientCookie(a.clientId, Date.now() + 60_000, SECRET);
    const res = await call(b.materialId);
    expect(res.status).toBe(404);
    expect(res.headers.get('location')).toBeNull();
  });

  it('answers 404 for a malformed id, same as a foreign one', async () => {
    cookieValue = signClientCookie(a.clientId, Date.now() + 60_000, SECRET);
    const res = await call('not-a-uuid');
    expect(res.status).toBe(404);
  });

  it('redirects the owner to the signed URL, uncached', async () => {
    cookieValue = signClientCookie(a.clientId, Date.now() + 60_000, SECRET);
    const res = await call(a.materialId);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(SIGNED);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });
});
