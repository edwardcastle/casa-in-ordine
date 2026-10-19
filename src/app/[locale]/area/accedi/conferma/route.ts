import { NextResponse, type NextRequest } from 'next/server';
import { hasLocale } from 'next-intl';
import { findActiveClient } from '@/lib/area/queries';
import { startClientSession } from '@/lib/area/session';
import { routing } from '@/i18n/routing';
import { consumeToken } from '@/lib/reviews/tokens';

/** Spends a client's magic link and opens the session. */

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale: requested } = await params;
  // The segment comes from the URL, and we build a redirect from it.
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const token = request.nextUrl.searchParams.get('token') ?? '';
  const clientId = await consumeToken('client_signin', token);

  // Checked after the token is spent: a link issued before a client was
  // deactivated must not still let them in.
  const client = clientId ? await findActiveClient(clientId) : null;

  if (!client) {
    const target = new URL(`/${locale}/area/accedi`, request.nextUrl.origin);
    target.searchParams.set('error', 'link');
    return NextResponse.redirect(target);
  }

  await startClientSession(client.id);
  return NextResponse.redirect(new URL(`/${locale}/area`, request.nextUrl.origin));
}
