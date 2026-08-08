import { resolve4, resolve6, resolveMx } from 'node:dns/promises';
import { DISPOSABLE_DOMAINS } from './disposable-domains';

/**
 * Address checks, cheapest first: shape, then throwaway provider, then whether
 * the domain can actually receive mail.
 *
 * The last one is the point of the exercise. A made-up address is well formed
 * — asdf@asdfgh.com passes any regex — but its domain has no mail server, so
 * the reply would bounce and the lead is worthless.
 */

export type EmailProblem = 'format' | 'disposable' | 'no-mail-server';

export type EmailCheck =
  | { ok: true; email: string }
  | { ok: false; problem: EmailProblem };

// RFC 5321 limits: 64 octets for the local part, 254 for the whole address.
const MAX_LOCAL = 64;
const MAX_TOTAL = 254;

// Stricter than the usual one-liner: no leading, trailing or doubled dots on
// either side, and a TLD of at least two letters.
const SHAPE = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;

// A slow resolver must not hold the submission open.
const DNS_TIMEOUT_MS = 3_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise.catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/**
 * True when the domain publishes somewhere to deliver mail. Falls back to an
 * address record because RFC 5321 treats that as an implicit mail exchanger,
 * and a few small domains still rely on it.
 */
export async function domainAcceptsMail(domain: string): Promise<boolean> {
  const mx = await withTimeout(resolveMx(domain), DNS_TIMEOUT_MS);
  if (mx && mx.length > 0) return true;

  const a = await withTimeout(resolve4(domain), DNS_TIMEOUT_MS);
  if (a && a.length > 0) return true;

  const aaaa = await withTimeout(resolve6(domain), DNS_TIMEOUT_MS);
  return Boolean(aaaa && aaaa.length > 0);
}

export async function checkEmail(raw: string): Promise<EmailCheck> {
  const email = raw.trim().toLowerCase();

  if (email.length > MAX_TOTAL || !SHAPE.test(email)) {
    return { ok: false, problem: 'format' };
  }

  const [local, domain] = email.split('@');
  if (local.length > MAX_LOCAL) {
    return { ok: false, problem: 'format' };
  }

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { ok: false, problem: 'disposable' };
  }

  if (!(await domainAcceptsMail(domain))) {
    return { ok: false, problem: 'no-mail-server' };
  }

  return { ok: true, email };
}
