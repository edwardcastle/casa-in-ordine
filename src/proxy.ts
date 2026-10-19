import { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { PATH_HEADER } from './lib/area/next-path';

const intl = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  // A layout cannot see the URL it is rendered for, and the private area's
  // layout needs it to send a signed-out client back to the page they asked
  // for. Set (never forwarded), so a client cannot choose it; the value is
  // validated again where it is used.
  const headers = new Headers(request.headers);
  headers.set(PATH_HEADER, request.nextUrl.pathname);

  return intl(new NextRequest(request, { headers }));
}

export const config = {
  // `admin` joins the exclusions: the moderation pages are internal, have no
  // translations, and a locale prefix would only break the session cookie path.
  matcher: '/((?!api|admin|trpc|_next|_vercel|.*\\..*).*)',
};
