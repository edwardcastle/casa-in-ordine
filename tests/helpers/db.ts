import postgres from 'postgres';

/**
 * Integration-test database access.
 *
 * Suites that touch Postgres run against TEST_DATABASE_URL and are skipped
 * without it. The refusal below is deliberate: `resetAreaTables` deletes
 * every row, and pointing it at the dev database by mistake would erase real
 * clients, so it insists the database name ends in `_test`.
 */

export function hasTestDb(): boolean {
  return Boolean(process.env.TEST_DATABASE_URL);
}

function testUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL is not set.');

  const name = new URL(url).pathname.replace(/^\//, '');
  if (!name.endsWith('_test')) {
    throw new Error(
      `Refusing to use "${name}" as the test database: its name must end in "_test".`,
    );
  }
  return url;
}

let sql: ReturnType<typeof postgres> | undefined;

/** A connection to the test database. Also points the app's `db()` at it. */
export function testDb() {
  const url = testUrl();
  // The code under test reads DATABASE_URL through `db()`; make that the test database.
  process.env.DATABASE_URL = url;
  sql ??= postgres(url, { max: 2, ssl: false, onnotice: () => {} });
  return sql;
}

/** Empties the client-area tables (and client sign-in tokens). Test database only. */
export async function resetAreaTables(): Promise<void> {
  const q = testDb();
  await q`TRUNCATE quote_requests, area_tips, project_materials, client_projects, clients CASCADE`;
  await q`DELETE FROM auth_tokens WHERE purpose = 'client_signin'`;
}

export async function closeTestDb(): Promise<void> {
  await sql?.end({ timeout: 5 });
  sql = undefined;
}
