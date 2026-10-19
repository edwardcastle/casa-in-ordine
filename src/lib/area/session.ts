import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * Client-area sessions.
 *
 * A client signs in with a link we send them; what they hold afterwards is an
 * HMAC-signed cookie, the same shape as the admin one (see
 * `src/lib/reviews/admin-session.ts`) and for the same reason: no session
 * table. The secret is deliberately separate from ADMIN_SESSION_SECRET, so a
 * leak of one cannot mint the other's cookies.
 *
 * The sign/verify pair is pure: the secret and the clock come in as arguments,
 * so it is tested without Next or the environment.
 */

const COOKIE = 'cio_client';
const MAX_AGE_S = 30 * 24 * 60 * 60;

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/** `<clientId>|<expiresAtMs>|<signature>`. */
export function signClientCookie(clientId: string, expiresAtMs: number, secret: string): string {
  const payload = `${clientId}|${expiresAtMs}`;
  return `${payload}|${sign(payload, secret)}`;
}

/** The client id the cookie was issued for, or null if it is forged, expired or malformed. */
export function verifyClientCookie(value: string, secret: string, nowMs: number): string | null {
  const cut = value.lastIndexOf('|');
  if (cut < 0) return null;

  const payload = value.slice(0, cut);
  const provided = Buffer.from(value.slice(cut + 1));
  const expected = Buffer.from(sign(payload, secret));

  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  const parts = payload.split('|');
  if (parts.length !== 2) return null;

  const [clientId, expiresAt] = parts;
  const expiresAtMs = Number(expiresAt);
  if (!clientId || !Number.isFinite(expiresAtMs) || expiresAtMs < nowMs) return null;

  return clientId;
}

function secret(): string {
  const value = process.env.CLIENT_SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      'CLIENT_SESSION_SECRET is missing or too short. Generate one with ' +
        '`openssl rand -base64 32`.',
    );
  }
  return value;
}

export async function startClientSession(clientId: string): Promise<void> {
  const store = await cookies();

  store.set(COOKIE, signClientCookie(clientId, Date.now() + MAX_AGE_S * 1_000, secret()), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_S,
  });
}

export async function endClientSession(): Promise<void> {
  const store = await cookies();
  store.delete({ name: COOKIE, path: '/' });
}

/**
 * The client id in the session cookie, or null.
 *
 * Only proves the cookie is ours and unexpired. Whether that client still
 * exists, or is allowed in, is the caller's question to ask on every request.
 */
export async function readClientCookie(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  return verifyClientCookie(raw, secret(), Date.now());
}
