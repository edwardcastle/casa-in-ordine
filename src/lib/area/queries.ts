import { db } from '@/lib/reviews/db';

export type Client = {
  id: string;
  email: string;
  name: string;
  lang: 'it' | 'en' | 'es';
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The client with this id, if they exist and have not been deactivated.
 *
 * An id that is not a uuid is "no such client", not an error: the id comes out
 * of a cookie we signed, but Postgres would reject a malformed one with an
 * exception, and a lookup that can throw turns a stale cookie into a 500.
 */
export async function findActiveClient(id: string): Promise<Client | null> {
  if (!UUID.test(id)) return null;

  const rows = await db()<Client[]>`
    SELECT id, email, name, lang
    FROM clients
    WHERE id = ${id} AND active
  `;
  return rows[0] ?? null;
}

/**
 * Records that the client was here, at most once an hour.
 *
 * The condition lives in the UPDATE, so a busy page does not write on every
 * request and two concurrent requests cannot both pass a read-then-write check.
 */
export async function touchClient(id: string): Promise<void> {
  await db()`
    UPDATE clients
    SET last_seen_at = now()
    WHERE id = ${id}
      AND (last_seen_at IS NULL OR last_seen_at < now() - interval '1 hour')
  `;
}
