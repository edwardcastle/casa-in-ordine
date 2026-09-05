import { createHash, randomBytes } from 'node:crypto';
import { db } from './db';

/**
 * Single-use links, for the approval emails and for admin sign-in.
 *
 * Only the sha256 of each token is stored, so a database leak does not hand
 * over working links. Spending a token deletes its row, which is what stops a
 * forwarded approval email being replayed by whoever it was forwarded to.
 */

export type TokenPurpose = 'signin' | 'decision';

const TTL_MS: Record<TokenPurpose, number> = {
  // Long enough that an approval email still works after a weekend.
  decision: 30 * 24 * 60 * 60 * 1_000,
  // Short: a sign-in link sitting in an inbox is a standing key to the admin.
  signin: 30 * 60 * 1_000,
};

function hash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function issueToken(purpose: TokenPurpose, subject: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + TTL_MS[purpose]);

  await db()`
    INSERT INTO auth_tokens (token_hash, purpose, subject, expires_at)
    VALUES (${hash(token)}, ${purpose}, ${subject}, ${expiresAt})
  `;

  return token;
}

/**
 * Spends a token and returns its subject, or null if it is unknown, expired or
 * already used. Deletion and lookup happen in one statement so two clicks on
 * the same link cannot both succeed.
 */
export async function consumeToken(
  purpose: TokenPurpose,
  token: string,
): Promise<string | null> {
  if (!token) return null;

  const rows = await db()<{ subject: string; expires_at: Date }[]>`
    DELETE FROM auth_tokens
     WHERE token_hash = ${hash(token)} AND purpose = ${purpose}
    RETURNING subject, expires_at
  `;

  const row = rows[0];
  if (!row) return null;
  if (row.expires_at.getTime() < Date.now()) return null;

  return row.subject;
}

/** Best-effort sweep of expired rows, so the table does not grow forever. */
export async function pruneTokens(): Promise<void> {
  await db()`DELETE FROM auth_tokens WHERE expires_at < now()`;
}

export function encodeDecision(action: 'approve' | 'reject', reviewId: string): string {
  return `${action}:${reviewId}`;
}

export function decodeDecision(
  subject: string,
): { action: 'approve' | 'reject'; reviewId: string } | null {
  const [action, reviewId] = subject.split(':');
  if ((action !== 'approve' && action !== 'reject') || !reviewId) return null;
  return { action, reviewId };
}
