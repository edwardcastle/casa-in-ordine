import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * Admin sessions.
 *
 * There is no password. Access is a magic link emailed to one of the addresses
 * in ADMIN_EMAILS, which means nothing to share, nothing to rotate, and
 * revoking someone is editing one environment variable. The session itself is
 * an HMAC-signed cookie — no session table, since there are three users.
 */

const COOKIE = 'cio_admin';
const MAX_AGE_S = 7 * 24 * 60 * 60;

function secret(): string {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      'ADMIN_SESSION_SECRET is missing or too short. Generate one with ' +
        '`openssl rand -base64 32`.',
    );
  }
  return value;
}

/** The addresses allowed to sign in. Compared lowercased and trimmed. */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string): boolean {
  return adminEmails().includes(email.trim().toLowerCase());
}

/**
 * Whether sign-in can work at all.
 *
 * The length test matches `secret()` deliberately: without it, a too-short
 * secret passes this check and then throws when the cookie is signed, turning
 * a configuration mistake into a 500 instead of a message.
 */
export function isAdminConfigured(): boolean {
  return (process.env.ADMIN_SESSION_SECRET ?? '').length >= 32 && adminEmails().length > 0;
}

/** Names what is wrong, for the server log. Never shown to the visitor. */
export function adminConfigProblem(): string | null {
  const value = process.env.ADMIN_SESSION_SECRET ?? '';
  if (!value) return 'ADMIN_SESSION_SECRET is not set';
  if (value.length < 32) {
    return `ADMIN_SESSION_SECRET is only ${value.length} characters; it needs at least 32`;
  }
  if (adminEmails().length === 0) return 'ADMIN_EMAILS is not set or is empty';
  return null;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export async function startSession(email: string): Promise<void> {
  const payload = `${email.toLowerCase()}|${Date.now() + MAX_AGE_S * 1_000}`;
  const store = await cookies();

  store.set(COOKIE, `${payload}|${sign(payload)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
    maxAge: MAX_AGE_S,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete({ name: COOKIE, path: '/admin' });
}

/** The signed-in admin's address, or null. */
export async function currentAdmin(): Promise<string | null> {
  if (!isAdminConfigured()) return null;

  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;

  const cut = raw.lastIndexOf('|');
  if (cut < 0) return null;

  const payload = raw.slice(0, cut);
  const provided = Buffer.from(raw.slice(cut + 1));
  const expected = Buffer.from(sign(payload));

  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  const [email, expiresAt] = payload.split('|');
  if (!email || Number(expiresAt) < Date.now()) return null;

  // Re-checked on every request, not just at sign-in: removing someone from
  // ADMIN_EMAILS must lock them out immediately, not in seven days.
  if (!isAdminEmail(email)) return null;

  return email;
}
