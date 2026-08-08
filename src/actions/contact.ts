'use server';

import { guardSubmission } from '@/lib/security/guard';
import { HONEYPOT_FIELD, RENDERED_AT_FIELD } from '@/lib/security/fields';

/** Escape values that end up inside the HTML email body. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** One room the visitor asked us to quote. A request can carry several. */
interface QuoteZone {
  /** Translated label of the zone. */
  zone: string;
  accumulation: string;
  subtotal: number;
  /** Question text travels with the answer: questions differ per zone. */
  answers: { question: string; answer: string }[];
}

interface QuoteRequestData {
  name: string;
  email: string;
  phone?: string;
  zones: QuoteZone[];
  subtotal: number;
  urgency: number;
  total: number;
  timing: string;
  availability?: { slot1: string; slot2: string; slot3: string };
  notes?: string;
  /** Turnstile token from the widget on the final step. */
  token?: string;
  /** Honeypot value; anything non-empty means a script filled it in. */
  trap?: string;
  /** Epoch milliseconds stamped when the wizard mounted. */
  renderedAt?: number;
}

export async function submitQuoteRequest(data: QuoteRequestData) {
  const { name, email, phone, zones, subtotal, urgency, total, timing, availability, notes } = data;

  if (zones.length === 0) {
    return { success: false as const, reason: 'invalid' as const };
  }

  const guard = await guardSubmission({
    name,
    email,
    phone,
    // Notes are optional, so they are scored for spam but exempt from the
    // minimum length a required message has to meet.
    message: notes?.trim() ? notes : undefined,
    messageOptional: true,
    token: data.token,
    trap: data.trap,
    renderedAt: data.renderedAt,
  });

  if (!guard.ok) {
    return { success: false as const, reason: guard.reason };
  }

  const zoneSections = zones
    .map(
      (z) => `
        <h4 style="color: #2D3748; margin: 20px 0 6px;">${esc(z.zone)} — €${z.subtotal}</h4>
        <p style="margin: 0 0 8px; color: #666; font-size: 13px;">Accumulo: ${esc(z.accumulation)}</p>
        <ol style="padding-left: 20px; margin: 0;">
          ${z.answers
            .filter(({ answer }) => answer)
            .map(
              ({ question, answer }) =>
                `<li style="margin-bottom: 8px;"><span style="color: #666;">${esc(question)}</span><br><strong>${esc(answer)}</strong></li>`,
            )
            .join('')}
        </ol>`,
    )
    .join('');

  const zoneRows = zones
    .map(
      (z) =>
        `<tr><td style="padding: 8px;">${esc(z.zone)}</td><td style="padding: 8px; text-align: right;">€${z.subtotal}</td></tr>`,
    )
    .join('');

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': process.env.BREVO_API_KEY!,
      },
      body: JSON.stringify({
        sender: { name: 'Casa in Ordine Website', email: 'info@casainordine.com' },
        to: [{ email: 'info@casainordine.com', name: 'Casa in Ordine' }],
        replyTo: { email, name },
        subject: `Nuovo preventivo: ${name} - ${zones.map((z) => z.zone).join(', ')} (€${total})`,
        htmlContent: `
          <h2>Nuovo preventivo dal sopralluogo digitale</h2>
          <h3 style="color: #7B8F7A;">Contatto</h3>
          <table style="border-collapse: collapse; width: 100%; margin-bottom: 24px;">
            <tr><td style="padding: 8px; font-weight: bold; width: 140px;">Nome:</td><td style="padding: 8px;">${esc(name)}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">${esc(email)}</td></tr>
            ${phone ? `<tr><td style="padding: 8px; font-weight: bold;">Telefono:</td><td style="padding: 8px;">${esc(phone)}</td></tr>` : ''}
          </table>

          <h3 style="color: #7B8F7A;">Progetto</h3>
          <table style="border-collapse: collapse; width: 100%; margin-bottom: 24px;">
            <tr><td style="padding: 8px; font-weight: bold; width: 140px;">Zone richieste:</td><td style="padding: 8px;">${zones.length}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Tempistica:</td><td style="padding: 8px;">${esc(timing)}</td></tr>
          </table>

          <h3 style="color: #7B8F7A;">Stima</h3>
          <table style="border-collapse: collapse; width: 100%; margin-bottom: 24px;">
            ${zoneRows}
            ${urgency > 0 ? `
            <tr style="border-top: 1px solid #ddd;"><td style="padding: 8px;">Subtotale</td><td style="padding: 8px; text-align: right;">€${subtotal}</td></tr>
            <tr><td style="padding: 8px;">Supplemento urgenza</td><td style="padding: 8px; text-align: right;">€${urgency}</td></tr>` : ''}
            <tr style="border-top: 2px solid #2D3748;"><td style="padding: 8px; font-weight: bold; font-size: 18px;">Totale stimato</td><td style="padding: 8px; text-align: right; font-weight: bold; font-size: 18px; color: #D98A6C;">€${total}</td></tr>
          </table>

          ${zoneSections ? `
          <h3 style="color: #7B8F7A;">Risposte del sopralluogo</h3>
          ${zoneSections}` : ''}

          ${availability && (availability.slot1 || availability.slot2 || availability.slot3) ? `
          <h3 style="color: #7B8F7A;">Disponibilità</h3>
          <ol style="padding-left: 20px;">
            ${availability.slot1 ? `<li style="margin-bottom: 4px;">${new Date(availability.slot1).toLocaleString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</li>` : ''}
            ${availability.slot2 ? `<li style="margin-bottom: 4px;">${new Date(availability.slot2).toLocaleString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</li>` : ''}
            ${availability.slot3 ? `<li style="margin-bottom: 4px;">${new Date(availability.slot3).toLocaleString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</li>` : ''}
          </ol>` : ''}

          ${notes ? `
          <h3 style="color: #7B8F7A;">Note aggiuntive</h3>
          <p style="padding: 12px; background: #f9f9f9; border-left: 3px solid #D98A6C; border-radius: 4px;">${esc(notes).replace(/\n/g, '<br>')}</p>` : ''}

          <p style="color: #666; font-size: 12px; margin-top: 32px;">Inviato dal sopralluogo digitale di casainordine.com</p>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Brevo API error:', error);
      return { success: false as const, reason: 'send-failed' as const };
    }

    return { success: true as const };
  } catch (error) {
    console.error('Quote request error:', error);
    return { success: false as const, reason: 'send-failed' as const };
  }
}

export async function submitContactForm(formData: FormData) {
  const name = ((formData.get('name') as string) ?? '').trim();
  const email = ((formData.get('email') as string) ?? '').trim();
  const phone = ((formData.get('phone') as string) ?? '').trim();
  const message = ((formData.get('message') as string) ?? '').trim();

  if (!message) {
    return { success: false as const, reason: 'invalid' as const };
  }

  const guard = await guardSubmission({
    name,
    email,
    phone,
    message,
    token: (formData.get('cf-turnstile-response') as string) ?? undefined,
    trap: (formData.get(HONEYPOT_FIELD) as string) ?? undefined,
    renderedAt: Number(formData.get(RENDERED_AT_FIELD)) || undefined,
  });

  if (!guard.ok) {
    return { success: false as const, reason: guard.reason };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': process.env.BREVO_API_KEY!,
      },
      body: JSON.stringify({
        sender: { name: 'Casa in Ordine Website', email: 'info@casainordine.com' },
        to: [{ email: 'info@casainordine.com', name: 'Casa in Ordine' }],
        replyTo: { email, name },
        subject: `Richiesta informazioni: ${name}`,
        htmlContent: `
          <h2>Richiesta informazioni dal sito web</h2>
          <table style="border-collapse: collapse; width: 100%;">
            <tr><td style="padding: 8px; font-weight: bold;">Nome:</td><td style="padding: 8px;">${esc(name)}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">${esc(email)}</td></tr>
            ${phone ? `<tr><td style="padding: 8px; font-weight: bold;">Telefono:</td><td style="padding: 8px;">${esc(phone)}</td></tr>` : ''}
            <tr><td style="padding: 8px; font-weight: bold;">Messaggio:</td><td style="padding: 8px;">${esc(message).replace(/\n/g, '<br>')}</td></tr>
          </table>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Brevo API error:', error);
      return { success: false as const, reason: 'send-failed' as const };
    }

    return { success: true as const };
  } catch (error) {
    console.error('Contact form error:', error);
    return { success: false as const, reason: 'send-failed' as const };
  }
}
