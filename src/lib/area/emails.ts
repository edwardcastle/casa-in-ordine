import { esc, sendEmail, siteOrigin } from '@/lib/mail';
import { issueToken } from '@/lib/reviews/tokens';
import { safeNextPath } from './next-path';
import { findActiveClient, getProject, type Client } from './queries';

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
 * on speaks the language the email did. `next`, when it is a safe path inside
 * the area, rides along so the client lands on the page they asked for.
 */
export async function sendClientSignInLink(client: Client, next?: string | null): Promise<boolean> {
  const token = await issueToken('client_signin', client.id);
  const safeNext = safeNextPath(next);
  const href =
    `${siteOrigin()}/${client.lang}/area/accedi/conferma?token=${token}` +
    (safeNext ? `&next=${encodeURIComponent(safeNext)}` : '');
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

const MATERIAL_COPY = {
  it: {
    subject: 'Nuovo materiale nella tua area',
    hello: (name: string) => `Ciao ${name},`,
    lead: (project: string) => `abbiamo aggiunto nuovo materiale al progetto «${project}».`,
    button: 'Apri il progetto',
    note: 'Il pulsante ti fa entrare direttamente nella tua area ed è valido 7 giorni. Dopo, puoi chiederci un nuovo link con la tua email.',
  },
  en: {
    subject: 'New material in your area',
    hello: (name: string) => `Hello ${name},`,
    lead: (project: string) => `we have added new material to the project “${project}”.`,
    button: 'Open the project',
    note: 'The button signs you straight into your area and works for 7 days. After that, you can ask for a new link with your email.',
  },
  es: {
    subject: 'Material nuevo en tu área',
    hello: (name: string) => `Hola ${name},`,
    lead: (project: string) => `hemos añadido material nuevo al proyecto «${project}».`,
    button: 'Abrir el proyecto',
    note: 'El botón te hace entrar directamente en tu área y vale 7 días. Después, puedes pedirnos un enlace nuevo con tu email.',
  },
} as const;

/**
 * Tells the client there is something new in a project, in their language.
 * Sent only when an organizer presses the button, never per upload: a batch
 * of ten files should be one email, not ten.
 */
export async function sendMaterialNotice(
  client: Client,
  project: { id: string; title: string },
): Promise<boolean> {
  // The button signs the client in and opens the project, so the email they
  // already have is enough: no second "send me a link" round trip.
  const token = await issueToken('client_notice', client.id);
  const next = `/${client.lang}/area/progetti/${project.id}`;
  const href =
    `${siteOrigin()}/${client.lang}/area/accedi/conferma?token=${token}` +
    `&next=${encodeURIComponent(next)}`;
  const copy = MATERIAL_COPY[client.lang];

  return sendEmail({
    to: [{ email: client.email }],
    subject: copy.subject,
    html: `
      <p style="font-size:16px;">${esc(copy.hello(client.name))}<br>${esc(copy.lead(project.title))}</p>
      <p style="margin:24px 0;"><a href="${href}" style="display:inline-block;padding:12px 22px;border-radius:6px;background:${SAGE};color:#fff;text-decoration:none;font-weight:bold;font-size:15px;">${esc(copy.button)}</a></p>
      <p style="color:#888;font-size:13px;">${esc(copy.note)}</p>
      <p style="color:#888;font-size:13px;margin-top:26px;">Casa in Ordine · casainordine.com</p>
    `,
  });
}

/**
 * Sends the "new material" email for one of the client's projects.
 *
 * Refuses (returns false) unless the client is active and the project belongs
 * to that client: the ids come from a form, and a mismatched pair must not
 * email one client a link into another's project.
 */
export async function notifyClient(clientId: string, projectId: string): Promise<boolean> {
  const client = await findActiveClient(clientId);
  if (!client) return false;

  const project = await getProject(client.id, projectId);
  if (!project) return false;

  return sendMaterialNotice(client, project);
}
