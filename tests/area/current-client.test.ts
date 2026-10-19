import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeTestDb, hasTestDb, resetAreaTables, testDb } from '../helpers/db';
import { currentClient, signClientCookie } from '@/lib/area/session';
import { findActiveClient } from '@/lib/area/queries';

const SECRET = 's'.repeat(32);

let cookieValue: string | undefined;
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === 'cio_client' && cookieValue ? { name, value: cookieValue } : undefined,
  }),
}));

function cookieFor(id: string, expiresAtMs = Date.now() + 60_000) {
  return signClientCookie(id, expiresAtMs, SECRET);
}

async function insertClient(overrides: { active?: boolean; lang?: string } = {}) {
  const sql = testDb();
  const [row] = await sql<{ id: string }[]>`
    INSERT INTO clients (email, name, lang, active)
    VALUES ('anna@example.com', 'Anna', ${overrides.lang ?? 'it'}, ${overrides.active ?? true})
    RETURNING id`;
  return row.id;
}

describe.skipIf(!hasTestDb())('current client', () => {
  beforeEach(async () => {
    process.env.CLIENT_SESSION_SECRET = SECRET;
    cookieValue = undefined;
    await resetAreaTables();
  });

  afterAll(closeTestDb);

  it('returns the client for a valid cookie', async () => {
    const id = await insertClient({ lang: 'es' });
    cookieValue = cookieFor(id);

    expect(await currentClient()).toEqual({
      id,
      email: 'anna@example.com',
      name: 'Anna',
      lang: 'es',
    });
  });

  it('returns null for a deactivated client with a valid cookie', async () => {
    const id = await insertClient({ active: false });
    cookieValue = cookieFor(id);

    expect(await currentClient()).toBeNull();
  });

  it('returns null when the client row was deleted', async () => {
    const id = await insertClient();
    cookieValue = cookieFor(id);
    await testDb()`DELETE FROM clients WHERE id = ${id}`;

    expect(await currentClient()).toBeNull();
  });

  it('returns null without a cookie, or with an expired or forged one', async () => {
    const id = await insertClient();

    expect(await currentClient()).toBeNull();

    cookieValue = cookieFor(id, Date.now() - 1);
    expect(await currentClient()).toBeNull();

    cookieValue = signClientCookie(id, Date.now() + 60_000, 'x'.repeat(32));
    expect(await currentClient()).toBeNull();
  });

  it('returns null, not an error, when the secret is missing or too short', async () => {
    const id = await insertClient();
    cookieValue = cookieFor(id);

    delete process.env.CLIENT_SESSION_SECRET;
    expect(await currentClient()).toBeNull();

    process.env.CLIENT_SESSION_SECRET = 'short';
    expect(await currentClient()).toBeNull();
  });

  it('finds an active client by id', async () => {
    const id = await insertClient();
    expect(await findActiveClient(id)).toMatchObject({ id, name: 'Anna', lang: 'it' });
  });

  it('returns null for an id that is not a uuid', async () => {
    expect(await findActiveClient('not-a-uuid')).toBeNull();
    expect(await findActiveClient('')).toBeNull();
  });

  it('updates last_seen_at at most once an hour', async () => {
    const id = await insertClient();
    cookieValue = cookieFor(id);
    const sql = testDb();
    const seen = async () =>
      (await sql<{ t: Date | null }[]>`SELECT last_seen_at AS t FROM clients WHERE id = ${id}`)[0].t;

    expect(await seen()).toBeNull();

    await currentClient();
    const first = await seen();
    expect(first).not.toBeNull();

    await currentClient();
    expect(await seen()).toEqual(first);

    await sql`UPDATE clients SET last_seen_at = now() - interval '2 hours' WHERE id = ${id}`;
    await currentClient();
    expect((await seen())!.getTime()).toBeGreaterThan(Date.now() - 60_000);
  });
});
