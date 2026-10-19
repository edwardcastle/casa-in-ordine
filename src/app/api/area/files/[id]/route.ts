import { NextResponse, type NextRequest } from 'next/server';
import { currentClient } from '@/lib/area/session';
import { getMaterialFile } from '@/lib/area/queries';
import { createDownloadUrl } from '@/lib/area/files';

/**
 * Download of a client's file. Ownership is checked here, in the route, on
 * every request; the redirect target is a signed URL good for 5 minutes, so a
 * copied link does not outlive the visit. A material that does not exist, is
 * not a file, or belongs to someone else all answer the same 404.
 */

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = await currentClient();
  if (!client) return new NextResponse(null, { status: 401 });

  const { id } = await params;
  const file = await getMaterialFile(client.id, id);
  if (!file) return new NextResponse(null, { status: 404 });

  const url = await createDownloadUrl(file.fileKey);
  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: url,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
