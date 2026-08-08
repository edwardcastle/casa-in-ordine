'use server';

/** Escape values that end up inside the HTML email body. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface QuoteRequestData {
  name: string;
  email: string;
  phone?: string;
  /** Translated label of the chosen zone. */
  zone: string;
  total: number;
  breakdown: { project: number; urgency: number };
  /** Question text travels with the answer: questions differ per zone. */
  answers: { question: string; answer: string }[];
  accumulation: string;
  timing: string;
  availability?: { slot1: string; slot2: string; slot3: string };
  notes?: string;
}

export async function submitQuoteRequest(data: QuoteRequestData) {
  const { name, email, phone, zone, total, breakdown, answers, accumulation, timing, availability, notes } = data;

  if (!name || !email || !zone) {
    return { success: false, error: 'Missing required fields' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: 'Invalid email address' };
  }

  const answerRows = answers
    .filter(({ answer }) => answer)
    .map(({ question, answer }) => `<li style="margin-bottom: 8px;"><span style="color: #666;">${esc(question)}</span><br><strong>${esc(answer)}</strong></li>`)
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
        subject: `Nuovo preventivo: ${name} - ${zone} (€${total})`,
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
            <tr><td style="padding: 8px; font-weight: bold; width: 140px;">Zona:</td><td style="padding: 8px;">${esc(zone)}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Accumulo:</td><td style="padding: 8px;">${esc(accumulation)}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Tempistica:</td><td style="padding: 8px;">${esc(timing)}</td></tr>
          </table>

          <h3 style="color: #7B8F7A;">Stima</h3>
          <table style="border-collapse: collapse; width: 100%; margin-bottom: 24px;">
            <tr><td style="padding: 8px;">Intervento</td><td style="padding: 8px; text-align: right;">€${breakdown.project}</td></tr>
            ${breakdown.urgency > 0 ? `<tr><td style="padding: 8px;">Supplemento urgenza</td><td style="padding: 8px; text-align: right;">€${breakdown.urgency}</td></tr>` : ''}
            <tr style="border-top: 2px solid #2D3748;"><td style="padding: 8px; font-weight: bold; font-size: 18px;">Totale stimato</td><td style="padding: 8px; text-align: right; font-weight: bold; font-size: 18px; color: #D98A6C;">€${total}</td></tr>
          </table>

          ${answerRows ? `
          <h3 style="color: #7B8F7A;">Risposte del sopralluogo</h3>
          <ol style="padding-left: 20px;">
            ${answerRows}
          </ol>` : ''}

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
      return { success: false, error: 'Failed to send email' };
    }

    return { success: true };
  } catch (error) {
    console.error('Quote request error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

export async function submitContactForm(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const message = formData.get('message') as string;

  if (!name || !email || !message) {
    return { success: false, error: 'Missing required fields' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: 'Invalid email address' };
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
      return { success: false, error: 'Failed to send email' };
    }

    return { success: true };
  } catch (error) {
    console.error('Contact form error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}
