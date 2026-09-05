#!/usr/bin/env node
/**
 * Applies pending database migrations, and is safe to call from the build.
 *
 * Wired into `build` so a deploy can never ship code against a schema that has
 * not caught up — the failure mode of remembering to migrate by hand is a
 * production 500, discovered by a client rather than by us.
 *
 * It no-ops in three situations rather than failing the build:
 *
 *   - No DATABASE_URL. The reviews feature degrades to "hidden" without one,
 *     and the rest of the site must still build and deploy.
 *   - A Vercel preview or development build. Previews share the production
 *     database, so migrating from a feature branch would apply that branch's
 *     schema to live before the branch is reviewed. Production deploys migrate;
 *     previews read whatever is already there.
 *   - `SKIP_MIGRATIONS=1`, for the rare deploy that must not touch the schema.
 *
 * The corollary of migrating before the new code goes live is that migrations
 * have to be backward compatible with the running version: add columns, do not
 * rename or drop them in the same release. Expand first, contract in a later
 * one, once nothing reads the old shape.
 */

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const url = process.env.DATABASE_URL;
const vercelEnv = process.env.VERCEL_ENV;

function skip(reason) {
  console.log(`[migrate] skipped — ${reason}`);
  process.exit(0);
}

if (process.env.SKIP_MIGRATIONS === '1') skip('SKIP_MIGRATIONS=1');
if (!url) skip('DATABASE_URL is not set; reviews will stay hidden');
if (vercelEnv && vercelEnv !== 'production') {
  skip(`this is a ${vercelEnv} deploy, and previews share the production database`);
}

console.log('[migrate] applying pending migrations…');

// Resolved rather than looked up on PATH: node_modules/.bin is only on PATH
// inside an npm/pnpm script, and this file is also run directly by `build`.
// A bare spawn there fails with ENOENT and no output at all.
// The package's `exports` map exposes "./bin/*" as "./bin/*.js", so the subpath
// carries no extension — resolving one fails.
const require = createRequire(import.meta.url);
let bin;
try {
  bin = require.resolve('node-pg-migrate/bin/node-pg-migrate');
} catch {
  console.error('[migrate] node-pg-migrate is not installed. Run `pnpm install`.');
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [bin, 'up', '--migrations-dir', 'migrations', '--migrations-table', 'schema_migrations'],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      // Managed Postgres presents a certificate for an internal hostname, which
      // strict verification rejects. Matches src/lib/reviews/db.ts.
      PGSSLMODE: /localhost|127\.0\.0\.1/.test(url) ? 'disable' : 'no-verify',
    },
  },
);

if (result.error) {
  console.error('[migrate] could not run node-pg-migrate:', result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  console.error('[migrate] FAILED — the deploy is stopping here rather than');
  console.error('[migrate] shipping code against a schema that did not apply.');
  process.exit(result.status ?? 1);
}

console.log('[migrate] up to date');
