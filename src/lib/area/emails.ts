import { esc, sendEmail, siteOrigin } from '@/lib/mail';
import { issueToken } from '@/lib/reviews/tokens';
import type { Client } from './queries';

const SAGE = '#7B8F7A';

const COPY = {
  it: {
    subject: 'Il tuo accesso a Casa in Ordine',
    hello: (name: string) => `Ciao ${name},`,
    lead: 'ecco il link per entrare nella tua area riservata.',
    button: 'Accedi',
    note: "Vale una volta sola e scade fra 30 minuti. Se non l'hai chiesto tu, ignora questa email: senza il link non succede nulla.",
  },
  en: {
    subject: 'Your Casa in Ordine sign-in link',
    hello: (name: string) => `Hello ${name},`,
    lead: 'here is the link to your private area.',
    button: 'Sign in',
    note: 'It works once and expires in 30 minutes. If you did not ask for it, ignore this email: nothing happens without the link.',
  },
  es: {
    subject: 'Tu acceso a Casa in Ordine',
    hello: (name: string) => `Hola ${name},`,
    lead: 'aquí tienes el enlace a tu área privada.',
    button: 'Acceder',
    note: 'Sirve una sola vez y caduca en 30 minutos. Si no lo has pedido tú, ignora este email: sin el enlace no pasa nada.',
  },
} as const;

/**
 * The client's magic link, in the language stored on their record.
 *
 * The link lands on the same locale's confirm route, so the page they arrive
 * on speaks the language the email did.
 */
export async function sendClientSignInLink(client: Client): Promise<boolean> {
  const token = await issueToken('client_signin', client.id);
  const href = `${siteOrigin()}/${client.lang}/area/accedi/conferma?token=${token}`;
  const copy = COPY[client.lang];

  return sendEmail({
    to: [{ email: client.email }],
    subject: copy.subject,
    html: `
      <p style="font-size:16px;">${esc(copy.hello(client.name))}<br>${esc(copy.lead)}</p>
      <p style="margin:24px 0;"><a href="${href}" style="display:inline-block;padding:12px 22px;border-radius:6px;background:${SAGE};color:#fff;text-decoration:none;font-weight:bold;font-size:15px;">${esc(copy.button)}</a></p>
      <p style="color:#888;font-size:13px;">${esc(copy.note)}</p>
      <p style="color:#888;font-size:13px;margin-top:26px;">Casa in Ordine · casainordine.com</p>
    `,
  });
}
