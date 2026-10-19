'use server';

import { headers } from 'next/headers';
import { sendClientSignInLink } from '@/lib/area/emails';
import { findClientByEmail } from '@/lib/area/queries';
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

  const client = await findClientByEmail(email);
  if (client) {
    await sendClientSignInLink(client);
  } else {
    console.warn('[area] Sign-in link requested for an address that is not an active client.');
  }

  return { status: 'sent' };
}
