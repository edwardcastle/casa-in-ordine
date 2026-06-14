import type { CaptureLeadInput } from './prompt';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function row(label: string, value?: string): string {
  if (!value) return '';
  return `<tr><td style="padding: 8px; font-weight: bold; width: 140px;">${label}:</td><td style="padding: 8px;">${escapeHtml(
    value,
  )}</td></tr>`;
}

export interface SendLeadResult {
  success: boolean;
  error?: string;
}

/**
 * Send a chat-captured lead to the Casa in Ordine inbox via Brevo, mirroring
 * the transactional email used by the quote and contact forms.
 */
export async function sendLeadEmail(
  lead: CaptureLeadInput,
  locale: string,
): Promise<SendLeadResult> {
  if (!lead.name || !lead.email) {
    return { success: false, error: 'Missing required fields' };
  }
  if (!EMAIL_REGEX.test(lead.email)) {
    return { success: false, error: 'Invalid email address' };
  }
  if (!process.env.BREVO_API_KEY) {
    console.error('Lead email skipped: BREVO_API_KEY is not set');
    return { success: false, error: 'Email not configured' };
  }

  const htmlContent = `
    <h2>Nuovo lead dalla chat del sito</h2>
    <table style="border-collapse: collapse; width: 100%; margin-bottom: 24px;">
      ${row('Nome', lead.name)}
      ${row('Email', lead.email)}
      ${row('Telefono', lead.phone)}
      ${row('Interesse', lead.service_interest)}
      ${row('Contatto preferito', lead.preferred_contact)}
      ${row('Lingua', locale)}
    </table>
    ${
      lead.notes
        ? `<h3 style="color: #7B8F7A;">Note dalla conversazione</h3>
           <p style="padding: 12px; background: #f9f9f9; border-left: 3px solid #D98A6C; border-radius: 4px;">${escapeHtml(
             lead.notes,
           ).replace(/\n/g, '<br>')}</p>`
        : ''
    }
    <p style="color: #666; font-size: 12px; margin-top: 32px;">Inviato dall'assistente virtuale di casainordine.com</p>
  `;

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: 'Casa in Ordine Website', email: 'info@casainordine.com' },
        to: [{ email: 'info@casainordine.com', name: 'Casa in Ordine' }],
        replyTo: { email: lead.email, name: lead.name },
        subject: `Nuovo lead chat: ${lead.name}${
          lead.service_interest ? ` – ${lead.service_interest}` : ''
        }`,
        htmlContent,
      }),
    });

    if (!response.ok) {
      console.error('Brevo API error (lead):', await response.text());
      return { success: false, error: 'Failed to send email' };
    }

    return { success: true };
  } catch (error) {
    console.error('Lead email error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}
