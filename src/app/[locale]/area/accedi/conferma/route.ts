import { NextResponse } from 'next/server';
import { hasLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import { safeNextPath } from '@/lib/area/next-path';
import {
  SIGNIN_NEXT_COOKIE,
  SIGNIN_TOKEN_COOKIE,
  SIGNIN_TOKEN_MAX_AGE_S,
} from '@/lib/area/signin-cookie';

/**
 * Where the emailed link lands.
 *
 * It only moves the token out of the URL. A page at this address would be
 * loaded with `?token=…` in its URL, and the analytics script on every locale
 * page records page URLs. This handler answers with a redirect instead, so no
 * page (and no script) ever loads at the tokened address: the token goes into
 * an httpOnly cookie and the browser continues to a page whose URL carries
 * nothing.
 *
 * It does not spend the token. Mail scanners and link previewers fetch URLs in
 * emails; the token is spent by the button on the next page, a POST.
 */

export const dynamic = 'force-dynamic';

// What `issueToken` produces: 32 random bytes as base64url, 43 characters.
const TOKEN = /^[\w-]{16,128}$/;

function redirectTo(location: string, token?: string, next?: string | null) {
  const response = new NextResponse(null, {
    status: 303,
    headers: {
      // Relative on purpose: the browser resolves it against the origin it
      // actually used, so proxies and previews cannot make it point elsewhere.
      Location: location,
      'Cache-Control': 'private, no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });

  const options = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SIGNIN_TOKEN_MAX_AGE_S,
  } as const;

  if (token) response.cookies.set(SIGNIN_TOKEN_COOKIE, token, options);
  // Checked here and again when it is used: it came out of an email link.
  if (token && next) response.cookies.set(SIGNIN_NEXT_COOKIE, next, options);
  return response;
}

export async function GET(request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return new NextResponse(null, { status: 404 });

  const query = new URL(request.url).searchParams;
  const token = query.get('token') ?? '';
  if (!TOKEN.test(token)) return redirectTo(`/${locale}/area/accedi?error=link`);

  return redirectTo(`/${locale}/area/accedi/continua`, token, safeNextPath(query.get('next')));
}
