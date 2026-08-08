import { headers } from 'next/headers';
import { checkEmail } from './email';
import { clientIp, createRateLimiter } from './rate-limit';
import { checkMessage, FIELD_LIMITS, withinLimit } from './spam';
import { verifyTurnstile } from './turnstile';

/**
 * The single gate every form submission passes through before anything is
 * emailed. Layered on purpose: each check is cheap to defeat alone, and a
 * script would have to defeat all of them at once.
 *
 * Order matters — the free checks run before the ones that cost a network
 * round trip, so obvious junk never reaches Cloudflare or a DNS resolver.
 */

// Five submissions an hour is far above what a real visitor needs and far
// below what makes a form worth automating.
const submissionLimiter = createRateLimiter({ limit: 5, windowMs: 60 * 60 * 1_000 });

// A human cannot read the form and fill it in faster than this.
const MIN_FILL_MS = 3_000;

/**
 * Why a submission was turned away. Only `email` and `message` are worth
 * showing precisely — those a real person can correct. Everything else maps
 * to one generic failure so a script learns nothing about which layer caught
 * it.
 */
export type RejectionReason =
  | 'rate-limited'
  | 'captcha'
  | 'email-format'
  | 'email-disposable'
  | 'email-unreachable'
  | 'message-too-short'
  | 'message-too-long'
  | 'message-spam'
  | 'invalid';

export type GuardResult =
  | { ok: true; email: string }
  | { ok: false; reason: RejectionReason };

export interface SubmissionInput {
  name: string;
  email: string;
  phone?: string;
  /** Free text to score. Omit for forms that have none. */
  message?: string;
  /** Turnstile token from the widget. */
  token?: string;
  /** Honeypot field: any value at all means a script filled it in. */
  trap?: string;
  /** Epoch milliseconds stamped when the form was rendered. */
  renderedAt?: number;
}

export async function guardSubmission(input: SubmissionInput): Promise<GuardResult> {
  const { name, email, phone, message, token, trap, renderedAt } = input;

  // 1. Honeypot — hidden from real users, irresistible to form-fillers.
  if (trap && trap.trim() !== '') {
    return { ok: false, reason: 'invalid' };
  }

  // 2. Submitted implausibly fast. The stamp is forgeable, which is fine:
  //    it is one layer, and forging it still leaves the rest.
  if (renderedAt && Number.isFinite(renderedAt)) {
    if (Date.now() - renderedAt < MIN_FILL_MS) {
      return { ok: false, reason: 'invalid' };
    }
  }

  // 3. Required fields and length caps, before anything expensive.
  if (!name?.trim() || !email?.trim()) {
    return { ok: false, reason: 'invalid' };
  }
  if (!withinLimit(name, FIELD_LIMITS.name) || !withinLimit(phone, FIELD_LIMITS.phone)) {
    return { ok: false, reason: 'invalid' };
  }

  // 4. Per-address throttle.
  const ip = clientIp(await headers());
  if (submissionLimiter.check(ip)) {
    return { ok: false, reason: 'rate-limited' };
  }

  // 5. Turnstile. A missing secret is a deployment mistake rather than an
  //    attack: the form keeps working on the remaining layers and says so
  //    loudly in the logs, because a contact form that rejects every real
  //    customer is worse than one running without its captcha.
  const captcha = await verifyTurnstile(token, ip);
  if (captcha === 'fail') {
    return { ok: false, reason: 'captcha' };
  }
  if (captcha === 'not-configured') {
    console.error(
      'TURNSTILE_SECRET_KEY is not set — submissions are running without captcha verification.',
    );
  }

  // 6. Message content, if the form has one.
  if (message !== undefined) {
    const content = checkMessage(name, message);
    if (!content.ok) {
      return {
        ok: false,
        reason:
          content.problem === 'too-short'
            ? 'message-too-short'
            : content.problem === 'too-long'
              ? 'message-too-long'
              : 'message-spam',
      };
    }
  }

  // 7. Address reachability last — it is the only check that waits on DNS.
  const address = await checkEmail(email);
  if (!address.ok) {
    return {
      ok: false,
      reason:
        address.problem === 'format'
          ? 'email-format'
          : address.problem === 'disposable'
            ? 'email-disposable'
            : 'email-unreachable',
    };
  }

  return { ok: true, email: address.email };
}
