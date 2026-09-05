/**
 * Transactional email through Brevo.
 *
 * The contact form and quote wizard still inline their own call to this API;
 * they predate this helper and work, so they were left alone.
 */

const SENDER = { name: 'Casa in Ordine Website', email: 'info@casainordine.com' };

export interface MailInput {
  to: { email: string; name?: string }[];
  subject: string;
  html: string;
  replyTo?: { email: string; name?: string };
}

/** Escape values that end up inside an HTML email body. */
export function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendEmail(input: MailInput): Promise<boolean> {
  const key = process.env.BREVO_API_KEY;

  if (!key) {
    console.error('BREVO_API_KEY is not set — no email was sent.');
    return false;
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': key,
      },
      body: JSON.stringify({
        sender: SENDER,
        to: input.to,
        replyTo: input.replyTo,
        subject: input.subject,
        htmlContent: input.html,
      }),
    });

    if (!response.ok) {
      console.error('Brevo API error:', await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Email send failed:', error);
    return false;
  }
}

/** Absolute origin for links inside emails. */
export function siteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://casainordine.com';
}
