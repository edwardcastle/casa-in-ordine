'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { hasLocale } from 'next-intl';
import { sendClientSignInLink } from '@/lib/area/emails';
import { findActiveClient, findClientByEmail } from '@/lib/area/queries';
import { endClientSession, startClientSession } from '@/lib/area/session';
import { SIGNIN_TOKEN_COOKIE } from '@/lib/area/signin-cookie';
import { routing } from '@/i18n/routing';
import { consumeToken } from '@/lib/reviews/tokens';
import { clientIp, createRateLimiter } from '@/lib/security/rate-limit';
import { verifyTurnstile } from '@/lib/security/turnstile';

export type SignInState = {
  status: 'idle' | 'sent' | 'invalid' | 'limited' | 'unavailable';
};

// Same ceiling as the admin form, for the same reasons: each request can send
// an email, and the form would otherwise be a way to probe who the clients are.
const linkLimiter = createRateLimiter({ limit: 5, windowMs: 15 * 60 * 1_000 });

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX = 254;

/**
 * Emails a client a one-use sign-in link.
 *
 * `'sent'` is the answer for every well-formed address, known or not, active
 * or not. Saying "we do not know that address" would turn this form into a way
 * to list who our clients are; the client who typed the wrong one learns
 * nothing from "sent" except to check their inbox, which is the right advice
 * either way.
 */
export async function requestClientSignIn(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  if ((process.env.CLIENT_SESSION_SECRET ?? '').length < 32) {
    // Without the secret the link would sign nobody in. Better to say so than
    // to send an email that cannot work.
    console.error('[area] Client sign-in is disabled: CLIENT_SESSION_SECRET is missing or shorter than 32 characters.');
    return { status: 'unavailable' };
  }

  const ip = clientIp(await headers());
  if (linkLimiter.check(ip)) return { status: 'limited' };

  const email = ((formData.get('email') as string | null) ?? '').trim().toLowerCase();
  if (!email || email.length > EMAIL_MAX || !EMAIL.test(email)) return { status: 'invalid' };

  // Not configured counts as a pass, so local development works without a
  // Cloudflare account; in production the secret is set and a script that
  // skips the widget is turned away here.
  const captcha = await verifyTurnstile(
    (formData.get('cf-turnstile-response') as string | null) ?? undefined,
    ip,
  );
  if (captcha === 'fail') return { status: 'invalid' };

  // The lookup and the send happen after the response. A known address would
  // otherwise take longer to answer (a database write and a call to the mail
  // API) than an unknown one, and the delay alone would say who our clients are.
  after(async () => {
    try {
      const client = await findClientByEmail(email);
      if (client) {
        await sendClientSignInLink(client);
      } else {
        console.warn('[area] Sign-in link requested for an address that is not an active client.');
      }
    } catch (error) {
      console.error('[area] Could not send a sign-in link', error);
    }
  });

  return { status: 'sent' };
}

/** The locale field comes from a form, so it is checked before it builds a URL. */
function localeFrom(formData: FormData): (typeof routing.locales)[number] {
  const value = formData.get('locale');
  return typeof value === 'string' && hasLocale(routing.locales, value)
    ? value
    : routing.defaultLocale;
}

/**
 * Spends a sign-in link and opens the session.
 *
 * This runs only from the button on the confirm page, never from opening the
 * link: mail scanners and link previewers fetch URLs in emails, and a GET that
 * spent the token would leave the client with a dead link. The token comes from
 * the cookie the link's route set, not from the form, so it never appears in a
 * URL or in the page's HTML.
 */
export async function confirmClientSignIn(formData: FormData): Promise<void> {
  const locale = localeFrom(formData);
  const store = await cookies();
  const token = store.get(SIGNIN_TOKEN_COOKIE)?.value ?? '';
  // Gone whatever happens next: a spent or refused token is no use to keep.
  store.delete({ name: SIGNIN_TOKEN_COOKIE, path: '/' });

  const clientId = await consumeToken('client_signin', token);

  // Checked after the token is spent: a link issued before a client was
  // deactivated must not still let them in.
  const client = clientId ? await findActiveClient(clientId) : null;
  if (!client) redirect(`/${locale}/area/accedi?error=link`);

  await startClientSession(client.id);
  redirect(`/${locale}/area`);
}

/** Ends the session. A POST, so a prefetched or hotlinked URL cannot sign anyone out. */
export async function signOutClient(formData: FormData): Promise<void> {
  const locale = localeFrom(formData);

  await endClientSession();
  redirect(`/${locale}`);
}
