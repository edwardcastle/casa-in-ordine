import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { esc, sendEmail, siteOrigin } from '@/lib/mail';
import { notifyEmails } from '@/lib/reviews/admin-session';
import { catalogFile, catalogUrl } from '.';
import { countRequestsFor, type NewCatalogLead } from './leads';

const SAGE = '#7B8F7A';

/**
 * Sends the catalogue to the person who asked for it.
 *
 * Attached, so it is in their inbox rather than one tap away on a website they
 * have already left — asking for an email and then sending them back to the
 * site is a round trip nobody wants to make. The link stays underneath as a
 * fallback for clients that strip attachments.
 *
 * The file is read from disk and base64-encoded rather than handed to Brevo as
 * a URL: it does not then depend on Brevo being able to reach the site.
 */
export async function sendCatalog(lead: NewCatalogLead): Promise<boolean> {
  const origin = siteOrigin();
  const href = catalogUrl(origin, lead.lang);

  const copy = {
    it: {
      subject: 'Il catalogo dei nostri servizi',
      hello: lead.name ? `Ciao ${lead.name},` : 'Ciao,',
      lead: 'ecco il catalogo con tutti i nostri servizi di decluttering e home organizing.',
      button: 'Scarica il catalogo',
      after:
        'Se hai una domanda o vuoi un preventivo su misura, rispondi pure a questa email: leggiamo tutto noi.',
      quote: 'Richiedi un preventivo gratuito',
      attached: 'Lo trovi allegato a questa email.',
      fallback: 'Non vedi l’allegato?',
    },
    en: {
      subject: 'Our services catalogue',
      hello: lead.name ? `Hello ${lead.name},` : 'Hello,',
      lead: 'here is the catalogue with all our decluttering and home organizing services.',
      button: 'Download the catalogue',
      after:
        'If you have a question or would like a tailored quote, just reply to this email — we read them ourselves.',
      quote: 'Request a free quote',
      attached: 'You will find it attached to this email.',
      fallback: 'Cannot see the attachment?',
    },
    es: {
      subject: 'El catálogo de nuestros servicios',
      hello: lead.name ? `Hola ${lead.name},` : 'Hola,',
      lead: 'aquí tienes el catálogo con todos nuestros servicios de decluttering y home organizing.',
      button: 'Descargar el catálogo',
      after:
        'Si tienes alguna duda o quieres un presupuesto a medida, responde a este email: lo leemos nosotras.',
      quote: 'Solicita un presupuesto gratuito',
      attached: 'Lo encontrarás adjunto a este email.',
      fallback: '¿No ves el adjunto?',
    },
  }[lead.lang];

  const file = catalogFile(lead.lang);
  let attachments;

  try {
    attachments = [
      {
        name: file,
        content: readFileSync(join(process.cwd(), 'public', 'catalogo', file)).toString('base64'),
      },
    ];
  } catch (error) {
    // The link below still works, so a missing file degrades rather than fails.
    console.error(`Could not attach ${file}; sending the link only.`, error);
  }

  return sendEmail({
    to: [{ email: lead.email, name: lead.name }],
    subject: copy.subject,
    attachments,
    html: `
      <p style="font-size:16px;">${esc(copy.hello)}</p>
      <p style="color:#444;font-size:15px;">${esc(copy.lead)}</p>

      <p style="padding:12px 16px;background:#F1F3EF;border-left:3px solid ${SAGE};border-radius:0 4px 4px 0;color:#3E5340;font-size:14px;">
        📎 ${esc(copy.attached)}
      </p>

      <p style="margin:22px 0;font-size:13px;color:#777;">
        ${esc(copy.fallback)} <a href="${href}" style="color:${SAGE};">${esc(copy.button)}</a>
      </p>

      <p style="color:#555;font-size:14px;">${esc(copy.after)}</p>

      <p style="margin-top:24px;">
        <a href="${origin}/${lead.lang}/preventivo" style="color:${SAGE};font-size:14px;">
          ${esc(copy.quote)} →
        </a>
      </p>

      <p style="color:#999;font-size:12px;margin-top:32px;">
        Casa in Ordine · <a href="${origin}" style="color:#999;">casainordine.com</a><br>
        ${
          lead.marketingConsent
            ? 'Ricevi questa email perché hai chiesto il catalogo e hai acconsentito a ricevere nostre comunicazioni. Puoi revocare il consenso in qualsiasi momento scrivendo a info@casainordine.com.'
            : 'Ricevi questa email solo perché hai chiesto il catalogo. Non ti aggiungeremo a nessuna lista.'
        }
      </p>
    `,
  });
}

/**
 * Tells the founders a lead came in, and what to do about it.
 *
 * The first version restated the form fields and said the catalogue had been
 * sent, which they could neither act on nor doubt. What actually decides the
 * next move is whether this person may be contacted at all, and whether they
 * have asked before — a second request is someone still deciding, and worth a
 * personal reply the same day.
 */
export async function notifyCatalogLead(lead: NewCatalogLead): Promise<boolean> {
  const to = notifyEmails().map((email) => ({ email }));
  if (to.length === 0) {
    console.error('Neither NOTIFY_EMAILS nor ADMIN_EMAILS is set — nobody was told about the catalogue lead.');
    return false;
  }

  const origin = siteOrigin();
  let previous = 0;
  try {
    // The row for this request is already committed, so anything above one is
    // an earlier ask.
    previous = Math.max(0, (await countRequestsFor(lead.email)) - 1);
  } catch {
    // A count is not worth failing the notification over.
  }

  const who = lead.name ? `${lead.name} (${lead.email})` : lead.email;

  const action = lead.marketingConsent
    ? `<p style="margin:0 0 6px;font-weight:bold;color:#3E5340;">Puoi ricontattarla.</p>
       <p style="margin:0;color:#4A544E;">Ha acconsentito a ricevere vostre comunicazioni. Rispondi a questa email per scriverle direttamente: la risposta le arriva.</p>`
    : `<p style="margin:0 0 6px;font-weight:bold;color:#8C332B;">Ha chiesto solo il catalogo.</p>
       <p style="margin:0;color:#4A544E;">Non ha acconsentito al marketing: non aggiungerla a nessuna lista e non scriverle per vendere. Se ti scrive lei, puoi ovviamente rispondere.</p>`;

  const repeat =
    previous > 0
      ? `<p style="padding:12px 16px;background:#FDF6E6;border-left:3px solid #B0762A;border-radius:0 4px 4px 0;color:#5A4415;font-size:14px;margin:0 0 20px;">
           <strong>Lo ha già chiesto ${previous} ${previous === 1 ? 'volta' : 'volte'}.</strong>
           Sta ancora decidendo — vale una risposta personale, oggi.
         </p>`
      : '';

  return sendEmail({
    to,
    subject: `Catalogo richiesto da ${lead.email}${previous > 0 ? ' (di nuovo)' : ''}`,
    replyTo: { email: lead.email, name: lead.name },
    html: `
      <h2 style="color:${SAGE};margin:0 0 4px;">${esc(who)}</h2>
      <p style="color:#888;margin:0 0 20px;font-size:13px;">
        Ha scaricato il catalogo dal sito · lingua ${esc(lead.lang)}
      </p>

      ${repeat}

      <div style="padding:14px 18px;background:#F1F3EF;border-left:3px solid ${SAGE};border-radius:0 4px 4px 0;margin-bottom:24px;">
        ${action}
      </div>

      <p style="margin:0 0 24px;">
        <a href="${origin}/admin/leads" style="display:inline-block;padding:11px 20px;border-radius:6px;background:${SAGE};color:#fff;text-decoration:none;font-weight:bold;font-size:14px;">
          Vedi tutte le richieste
        </a>
      </p>

      <p style="color:#999;font-size:12px;">
        Il catalogo le è già partito in automatico: non serve rimandarlo.
      </p>
    `,
  });
}
