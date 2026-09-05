import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // `admin` joins the exclusions: the moderation pages are internal, have no
  // translations, and a locale prefix would only break the session cookie path.
  matcher: '/((?!api|admin|trpc|_next|_vercel|.*\\..*).*)',
};
