'use server';

import { headers } from 'next/headers';
import { guardSubmission } from '@/lib/security/guard';
import { HONEYPOT_FIELD, RENDERED_AT_FIELD } from '@/lib/security/fields';
import { clientIp } from '@/lib/security/rate-limit';
import { insertPendingReview, type NewReview } from '@/lib/reviews/queries';
import { sendReviewNotification, sendSubmissionReceipt } from '@/lib/reviews/emails';
import { isReviewsConfigured } from '@/lib/reviews/db';
import { isReviewLang, isReviewService } from '@/lib/reviews/types';

export type ReviewSubmitResult =
  | { success: true }
  | { success: false; reason: string };

const BODY_MIN = 40;
const BODY_MAX = 1_500;

/**
 * Takes a review from a client and files it as `pending`.
 *
 * It runs through the same guard as the contact form — honeypot, fill-time
 * floor, rate limits, Turnstile, address reachability, spam and gibberish
 * scoring, and the AI screener. That stack answers "is a human writing
 * sincerely?", which is the right question for a contact form and only half the
 * question here: none of those layers can tell a real client from a stranger or
 * a competitor. That is why nothing published here is automatic. A founder
 * matches the name to an invoice and approves; until then the review exists
 * only in the database and in their inbox.
 */
export async function submitReview(formData: FormData): Promise<ReviewSubmitResult> {
  if (!isReviewsConfigured()) {
    console.error('DATABASE_URL is not set — the review form cannot store anything.');
    return { success: false, reason: 'unavailable' };
  }

  const authorName = ((formData.get('name') as string) ?? '').trim();
  const authorEmail = ((formData.get('email') as string) ?? '').trim();
  const city = ((formData.get('city') as string) ?? '').trim();
  const body = ((formData.get('body') as string) ?? '').trim();
  const ratingRaw = Number(formData.get('rating'));
  const lang = (formData.get('lang') as string) ?? 'it';
  const service = (formData.get('service') as string) ?? '';
  const consentText = ((formData.get('consentText') as string) ?? '').trim();

  if (!body) return { success: false, reason: 'invalid' };
  if (body.length < BODY_MIN) return { success: false, reason: 'message-too-short' };
  if (body.length > BODY_MAX) return { success: false, reason: 'message-too-long' };

  // Consent is not a formality here: it is the lawful basis for publishing a
  // named person's words, and the record the site's verification sentence
  // rests on. An unticked box is a hard stop, never a default.
  if (formData.get('consent') !== 'on' || !consentText) {
    return { success: false, reason: 'consent-required' };
  }

  if (!isReviewLang(lang)) return { success: false, reason: 'invalid' };

  const rating = Number.isInteger(ratingRaw) && ratingRaw >= 1 && ratingRaw <= 5
    ? ratingRaw
    : undefined;

  const guard = await guardSubmission({
    name: authorName,
    email: authorEmail,
    message: body,
    token: (formData.get('cf-turnstile-response') as string) ?? undefined,
    trap: (formData.get(HONEYPOT_FIELD) as string) ?? undefined,
    renderedAt: Number(formData.get(RENDERED_AT_FIELD)) || undefined,
  });

  if (!guard.ok) {
    return { success: false, reason: guard.reason };
  }

  const review: NewReview = {
    authorName,
    authorEmail: guard.email,
    city: city || undefined,
    rating,
    body,
    lang,
    service: isReviewService(service) ? service : undefined,
    consentText,
    consentIp: clientIp(await headers()),
  };

  try {
    const id = await insertPendingReview(review);

    // The review is safely stored before either email is attempted, so a Brevo
    // outage loses the notification, never the client's words.
    const notified = await sendReviewNotification(id, review);
    if (!notified) {
      console.error(`Review ${id} was stored but no notification was sent.`);
    }

    await sendSubmissionReceipt(review);

    return { success: true };
  } catch (error) {
    console.error('Review submission failed:', error);
    return { success: false, reason: 'send-failed' };
  }
}
