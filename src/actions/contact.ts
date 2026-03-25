'use server';

export async function submitContactForm(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const service = formData.get('service') as string;
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
        subject: `Nuovo contatto: ${name}${service ? ` - ${service}` : ''}`,
        htmlContent: `
          <h2>Nuovo messaggio dal sito web</h2>
          <table style="border-collapse: collapse; width: 100%;">
            <tr><td style="padding: 8px; font-weight: bold;">Nome:</td><td style="padding: 8px;">${name}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">${email}</td></tr>
            ${phone ? `<tr><td style="padding: 8px; font-weight: bold;">Telefono:</td><td style="padding: 8px;">${phone}</td></tr>` : ''}
            ${service ? `<tr><td style="padding: 8px; font-weight: bold;">Servizio:</td><td style="padding: 8px;">${service}</td></tr>` : ''}
            <tr><td style="padding: 8px; font-weight: bold;">Messaggio:</td><td style="padding: 8px;">${message.replace(/\n/g, '<br>')}</td></tr>
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
