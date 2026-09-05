import { NextResponse, type NextRequest } from 'next/server';
import { consumeToken } from '@/lib/reviews/tokens';
import { isAdminEmail, startSession } from '@/lib/reviews/admin-session';

/** Spends a magic link and opens the session. */

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? '';
  const email = await consumeToken('signin', token);

  const target = new URL('/admin/reviews', request.nextUrl.origin);

  // Re-checked after the token is spent: a link issued before someone was
  // removed from ADMIN_EMAILS must not still let them in.
  if (!email || !isAdminEmail(email)) {
    target.searchParams.set('error', 'link');
    return NextResponse.redirect(target);
  }

  await startSession(email);
  return NextResponse.redirect(target);
}
