import postgres from 'postgres';

/**
 * The Postgres connection.
 *
 * Reads are cached (see `queries.ts`), so a normal page render never reaches
 * this. The pool is deliberately small: serverless instances do not share one,
 * so the real ceiling is `max × instances` and Postgres counts connections, not
 * instances.
 *
 * Cached on globalThis because the dev server re-evaluates modules on every
 * edit, and a fresh pool per edit exhausts the server's connection slots within
 * a few saves.
 */

const globalForDb = globalThis as unknown as {
  cioSql?: ReturnType<typeof postgres>;
};

function connect() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    // Thrown rather than returned: every caller here is on a path that either
    // publishes or reads client testimonials, and there is no sane degraded
    // behaviour for "we lost the consent records".
    throw new Error(
      'DATABASE_URL is not set. Reviews need a Postgres connection; use the ' +
        'public connection string, since Vercel is outside the database ' +
        "provider's private network.",
    );
  }

  return postgres(url, {
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    // Managed Postgres requires TLS but presents a certificate for an internal
    // hostname, which strict verification rejects.
    ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : 'require',
  });
}

export function db() {
  globalForDb.cioSql ??= connect();
  return globalForDb.cioSql;
}

/** Whether reviews are configured at all, for callers that must not throw. */
export function isReviewsConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
