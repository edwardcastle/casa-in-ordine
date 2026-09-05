import { NextResponse, type NextRequest } from 'next/server';
import { consumeToken, decodeDecision } from '@/lib/reviews/tokens';
import { decideReview, getReview } from '@/lib/reviews/queries';
import { isReviewsConfigured } from '@/lib/reviews/db';

/**
 * The Approve / Reject links in the notification email.
 *
 * GET rather than POST because it is a link in an email client, which cannot
 * post. That is safe here only because the token is single-use and unguessable:
 * a prefetching mail client spends the token, but the outcome is the one the
 * founder was going to choose anyway, and a second click changes nothing.
 */

export const dynamic = 'force-dynamic';

function page(title: string, message: string, tone: 'ok' | 'warn' | 'bad') {
  const colour = tone === 'ok' ? '#5F7860' : tone === 'warn' ? '#9A6516' : '#8C332B';

  return new NextResponse(
    `<!doctype html><html lang="it"><head><meta charset="utf-8">
     <meta name="viewport" content="width=device-width,initial-scale=1">
     <meta name="robots" content="noindex,nofollow">
     <title>${title}</title></head>
     <body style="margin:0;font-family:system-ui,-apple-system,sans-serif;background:#F1F3EF;color:#16211E;">
       <div style="max-width:34rem;margin:0 auto;padding:4rem 1.25rem;">
         <h1 style="font-size:1.5rem;margin:0 0 .6rem;color:${colour};">${title}</h1>
         <p style="color:#4C5A55;line-height:1.6;margin:0 0 2rem;">${message}</p>
         <a href="/admin/reviews" style="color:#3E5340;font-size:.9rem;">Gestisci tutte le recensioni →</a>
       </div>
     </body></html>`,
    { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } },
  );
}

export async function GET(request: NextRequest) {
  if (!isReviewsConfigured()) {
    return page('Non disponibile', 'Il database delle recensioni non è configurato.', 'bad');
  }

  const token = request.nextUrl.searchParams.get('token') ?? '';
  const subject = await consumeToken('decision', token);

  if (!subject) {
    return page(
      'Link non valido',
      'Questo link è già stato usato, è scaduto, oppure non è corretto. ' +
        'Apri la pagina delle recensioni per decidere da lì.',
      'warn',
    );
  }

  const decoded = decodeDecision(subject);
  if (!decoded) {
    return page('Link non valido', 'Non è stato possibile leggere questo link.', 'bad');
  }

  const review = await getReview(decoded.reviewId);
  if (!review) {
    return page('Recensione non trovata', 'Questa recensione non esiste più.', 'warn');
  }

  const outcome = await decideReview(
    decoded.reviewId,
    decoded.action === 'approve' ? 'approved' : 'rejected',
    'email-link',
  );

  if (outcome === 'already-decided') {
    return page(
      'Già decisa',
      `Questa recensione di ${review.authorName} era già stata gestita. Non è cambiato nulla.`,
      'warn',
    );
  }

  if (outcome === 'not-found') {
    return page('Recensione non trovata', 'Questa recensione non esiste più.', 'warn');
  }

  return decoded.action === 'approve'
    ? page(
        'Pubblicata',
        `La recensione di ${review.authorName} è ora sul sito. ` +
          'Comparirà entro pochi secondi.',
        'ok',
      )
    : page(
        'Rifiutata',
        `La recensione di ${review.authorName} non sarà pubblicata e il testo è ` +
          'stato cancellato.',
        'ok',
      );
}
