import { NextResponse, type NextRequest } from 'next/server';
import { hasLocale } from 'next-intl';
import { endClientSession } from '@/lib/area/session';
import { routing } from '@/i18n/routing';

/** Signs the client out and sends them to the home page. */

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale: requested } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  await endClientSession();
  return NextResponse.redirect(new URL(`/${locale}`, request.nextUrl.origin));
}
