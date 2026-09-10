import { esc, sendEmail, siteOrigin } from '@/lib/mail';
import { adminEmails } from '@/lib/reviews/admin-session';
import { catalogUrl } from '.';
import type { NewCatalogLead } from './leads';

const SAGE = '#7B8F7A';

/**
 * Sends the catalogue to the person who asked for it.
 *
 * A link rather than an attachment: a PDF attachment costs deliverability with
 * every spam filter, and a link means the founders can replace the file later
 * without anyone needing a second email.
 */
export async function sendCatalog(lead: NewCatalogLead): Promise<boolean> {
  const origin = siteOrigin();
  const href = catalogUrl(origin);

  const copy = {
    it: {
      subject: 'Il catalogo dei nostri servizi',
      hello: lead.name ? `Ciao ${lead.name},` : 'Ciao,',
      lead: 'ecco il catalogo con tutti i nostri servizi di decluttering e home organizing.',
      button: 'Scarica il catalogo',
      after:
        'Se hai una domanda o vuoi un preventivo su misura, rispondi pure a questa email: leggiamo tutto noi.',
      quote: 'Richiedi un preventivo gratuito',
    },
    en: {
      subject: 'Our services catalogue',
      hello: lead.name ? `Hello ${lead.name},` : 'Hello,',
      lead: 'here is the catalogue with all our decluttering and home organizing services.',
      button: 'Download the catalogue',
      after:
        'If you have a question or would like a tailored quote, just reply to this email — we read them ourselves.',
      quote: 'Request a free quote',
    },
    es: {
      subject: 'El catálogo de nuestros servicios',
      hello: lead.name ? `Hola ${lead.name},` : 'Hola,',
      lead: 'aquí tienes el catálogo con todos nuestros servicios de decluttering y home organizing.',
      button: 'Descargar el catálogo',
      after:
        'Si tienes alguna duda o quieres un presupuesto a medida, responde a este email: lo leemos nosotras.',
      quote: 'Solicita un presupuesto gratuito',
    },
  }[lead.lang];

  return sendEmail({
    to: [{ email: lead.email, name: lead.name }],
    subject: copy.subject,
    html: `
      <p style="font-size:16px;">${esc(copy.hello)}</p>
      <p style="color:#444;font-size:15px;">${esc(copy.lead)}</p>

      <p style="margin:28px 0;">
        <a href="${href}" style="display:inline-block;padding:13px 24px;border-radius:6px;background:${SAGE};color:#fff;text-decoration:none;font-weight:bold;font-size:15px;">
          ${esc(copy.button)}
        </a>
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

/** Tells the founders a lead came in. */
export async function notifyCatalogLead(lead: NewCatalogLead): Promise<boolean> {
  const to = adminEmails().map((email) => ({ email }));
  if (to.length === 0) {
    console.error('ADMIN_EMAILS is not set — nobody was told about the catalogue lead.');
    return false;
  }

  return sendEmail({
    to,
    subject: `Catalogo richiesto da ${lead.email}`,
    replyTo: { email: lead.email, name: lead.name },
    html: `
      <h2 style="color:${SAGE};margin:0 0 16px;">Nuova richiesta di catalogo</h2>
      <table style="border-collapse:collapse;width:100%;">
        <tr><td style="padding:8px;font-weight:bold;width:150px;">Email:</td><td style="padding:8px;">${esc(lead.email)}</td></tr>
        ${lead.name ? `<tr><td style="padding:8px;font-weight:bold;">Nome:</td><td style="padding:8px;">${esc(lead.name)}</td></tr>` : ''}
        <tr><td style="padding:8px;font-weight:bold;">Lingua:</td><td style="padding:8px;">${esc(lead.lang)}</td></tr>
        <tr>
          <td style="padding:8px;font-weight:bold;">Marketing:</td>
          <td style="padding:8px;">
            ${
              lead.marketingConsent
                ? '<strong style="color:#5F7860;">Sì</strong> — puoi ricontattarla.'
                : '<strong style="color:#8C332B;">No</strong> — ha chiesto solo il catalogo. Non aggiungerla a nessuna lista.'
            }
          </td>
        </tr>
      </table>
      <p style="color:#888;font-size:12px;margin-top:24px;">Il catalogo le è già stato inviato.</p>
    `,
  });
}
