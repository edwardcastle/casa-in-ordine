import { esc, sendEmail, siteOrigin } from '@/lib/mail';
import { adminEmails } from './admin-session';
import { encodeDecision, issueToken } from './tokens';
import type { NewReview } from './queries';

const SAGE = '#7B8F7A';

function button(href: string, label: string, background: string): string {
  return `<a href="${href}" style="display:inline-block;padding:12px 22px;border-radius:6px;background:${background};color:#fff;text-decoration:none;font-weight:bold;font-size:15px;">${label}</a>`;
}

/**
 * Tells the founders a review is waiting, and carries the two decision links.
 *
 * Both links are single-use and expire; approving is what publishes, so the
 * email is the whole moderation interface for the common case. The admin page
 * exists for everything the email cannot cover — above all a withdrawal
 * arriving months later, when this email is long gone.
 */
export async function sendReviewNotification(
  reviewId: string,
  review: NewReview,
): Promise<boolean> {
  const to = adminEmails().map((email) => ({ email }));
  if (to.length === 0) {
    console.error('ADMIN_EMAILS is not set — nobody was told about the new review.');
    return false;
  }

  const origin = siteOrigin();
  const [approve, reject] = await Promise.all([
    issueToken('decision', encodeDecision('approve', reviewId)),
    issueToken('decision', encodeDecision('reject', reviewId)),
  ]);

  const stars = review.rating ? '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating) : '—';

  return sendEmail({
    to,
    subject: `Nuova recensione da ${review.authorName}`,
    replyTo: { email: review.authorEmail, name: review.authorName },
    html: `
      <h2 style="color:${SAGE};margin:0 0 4px;">Nuova recensione</h2>
      <p style="color:#666;margin:0 0 24px;font-size:14px;">
        Non è ancora pubblicata. Lo sarà solo quando premi Approva.
      </p>

      <table style="border-collapse:collapse;width:100%;margin-bottom:20px;">
        <tr><td style="padding:8px;font-weight:bold;width:130px;">Nome:</td><td style="padding:8px;">${esc(review.authorName)}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Email:</td><td style="padding:8px;">${esc(review.authorEmail)}</td></tr>
        ${review.city ? `<tr><td style="padding:8px;font-weight:bold;">Città:</td><td style="padding:8px;">${esc(review.city)}</td></tr>` : ''}
        <tr><td style="padding:8px;font-weight:bold;">Valutazione:</td><td style="padding:8px;color:#D98A6C;font-size:17px;">${stars}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Lingua:</td><td style="padding:8px;">${esc(review.lang)}</td></tr>
        ${review.service ? `<tr><td style="padding:8px;font-weight:bold;">Servizio:</td><td style="padding:8px;">${esc(review.service)}</td></tr>` : ''}
      </table>

      <blockquote style="margin:0 0 24px;padding:14px 18px;background:#f7f8f6;border-left:3px solid ${SAGE};border-radius:0 4px 4px 0;font-style:italic;color:#333;">
        ${esc(review.body).replace(/\n/g, '<br>')}
      </blockquote>

      <div style="padding:14px 18px;background:#fdf6e6;border-left:3px solid #B0762A;border-radius:0 4px 4px 0;margin-bottom:28px;">
        <p style="margin:0 0 6px;font-weight:bold;font-size:13px;color:#8a5d1c;">PRIMA DI APPROVARE</p>
        <p style="margin:0;font-size:14px;color:#5a4415;">
          Controlla che questo nome corrisponda a una fattura. È questa verifica
          che la frase pubblicata sul sito descrive — se non riesci a
          confermarla, premi Rifiuta.
        </p>
      </div>

      <p style="margin:0 0 10px;">
        ${button(`${origin}/api/reviews/decision?token=${approve}`, 'Approva e pubblica', SAGE)}
        &nbsp;&nbsp;
        ${button(`${origin}/api/reviews/decision?token=${reject}`, 'Rifiuta', '#8C332B')}
      </p>

      <p style="color:#888;font-size:12px;margin-top:26px;">
        Ogni link funziona una volta sola. Per rimuovere una recensione già
        pubblicata usa <a href="${origin}/admin/reviews" style="color:${SAGE};">${origin}/admin/reviews</a>.
      </p>
    `,
  });
}

/** Confirms to the client that her words are held, not published. */
export async function sendSubmissionReceipt(review: NewReview): Promise<boolean> {
  const copy = {
    it: {
      subject: 'Grazie per la tua recensione',
      lead: 'Grazie di cuore per le tue parole.',
      body: 'La leggeremo prima di pubblicarla sul sito, quindi non comparirà subito. Se cambi idea, in qualsiasi momento, scrivici a questo indirizzo e la togliamo.',
    },
    en: {
      subject: 'Thank you for your review',
      lead: 'Thank you so much for your words.',
      body: 'We read every review before it goes on the site, so it will not appear straight away. If you change your mind at any point, write to this address and we will take it down.',
    },
    es: {
      subject: 'Gracias por tu reseña',
      lead: 'Muchas gracias por tus palabras.',
      body: 'La leeremos antes de publicarla en la web, así que no aparecerá de inmediato. Si cambias de opinión en cualquier momento, escríbenos a esta dirección y la retiramos.',
    },
  }[review.lang];

  return sendEmail({
    to: [{ email: review.authorEmail, name: review.authorName }],
    subject: copy.subject,
    html: `
      <p style="font-size:16px;">${esc(copy.lead)}</p>
      <p style="color:#555;">${esc(copy.body)}</p>
      <blockquote style="margin:20px 0;padding:14px 18px;background:#f7f8f6;border-left:3px solid ${SAGE};font-style:italic;color:#333;">
        ${esc(review.body).replace(/\n/g, '<br>')}
      </blockquote>
      <p style="color:#888;font-size:13px;">Casa in Ordine · casainordine.com</p>
    `,
  });
}

/** The admin magic link. */
export async function sendSignInLink(email: string): Promise<boolean> {
  const token = await issueToken('signin', email.toLowerCase());
  const href = `${siteOrigin()}/admin/reviews/signin?token=${token}`;

  return sendEmail({
    to: [{ email }],
    subject: 'Accesso alle recensioni',
    html: `
      <p style="font-size:16px;">Ecco il link per gestire le recensioni.</p>
      <p style="margin:24px 0;">${button(href, 'Accedi', SAGE)}</p>
      <p style="color:#888;font-size:13px;">
        Vale una volta sola e scade fra 30 minuti. Se non l'hai chiesto tu,
        ignora questa email — senza il link non succede nulla.
      </p>
    `,
  });
}
