import { routing } from '@/i18n/routing';

/**
 * Where to send a client after they sign in: the private page they asked for.
 *
 * The value travels through a query string, an email and a cookie, so it is
 * untrusted at every hop and is checked wherever it is read. Only a path
 * inside the private area is accepted: a single leading slash, one of our
 * locales, `/area`, then plain path segments. That leaves no way to name
 * another origin (`//evil.com`, `/\\evil.com`, `https://…`) or to climb out of
 * the area (`..`).
 */

export const NEXT_MAX_LENGTH = 200;

/** Request header the proxy sets to the path being requested (see `src/proxy.ts`). */
export const PATH_HEADER = 'x-cio-path';

const LOCALES = routing.locales.join('|');
// Segments are letters, digits and `._~-`: enough for `progetti/<uuid>`.
const PATTERN = new RegExp(`^/(?:${LOCALES})/area(?:/[A-Za-z0-9._~-]+)*$`);

/** The path if it is a safe place inside the private area, otherwise null. */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > NEXT_MAX_LENGTH) return null;
  if (!PATTERN.test(value)) return null;
  // `.` and `..` match the segment pattern but mean something to a browser.
  if (value.split('/').some((segment) => segment === '.' || segment === '..')) return null;
  return value;
}

/** The sign-in page, remembering where the client was headed when that is a safe path. */
export function signInPath(locale: string, next?: string | null): string {
  const base = `/${locale}/area/accedi`;
  const safe = safeNextPath(next);
  return safe ? `${base}?next=${encodeURIComponent(safe)}` : base;
}
