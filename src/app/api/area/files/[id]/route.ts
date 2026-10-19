import { NextResponse, type NextRequest } from 'next/server';
import { currentClient } from '@/lib/area/session';
import { getMaterialFile } from '@/lib/area/queries';
import { createDownloadUrl } from '@/lib/area/files';
import { bestLocale } from '@/lib/area/locale';

/**
 * Download of a client's file. Ownership is checked here, in the route, on
 * every request; the redirect target is a signed URL good for 5 minutes, so a
 * copied link does not outlive the visit. A material that does not exist, is
 * not a file, or belongs to someone else all answer the same 404. Signed out,
 * the answer is a redirect to the sign-in page.
 */

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = await currentClient();
  if (!client) {
    // A signed-out client got here from a link in a page or an email; send
    // them to sign in, in their browser's language, rather than to a blank 401.
    const lang = bestLocale(request.headers.get('accept-language'));
    return new NextResponse(null, {
      status: 303,
      headers: { Location: `/${lang}/area/accedi`, ...NO_STORE },
    });
  }

  const { id } = await params;
  const file = await getMaterialFile(client.id, id);
  if (!file) return new NextResponse(null, { status: 404, headers: NO_STORE });

  const url = await createDownloadUrl(file.fileKey);
  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: url,
      ...NO_STORE,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
