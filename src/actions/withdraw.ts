'use server';

import { headers } from 'next/headers';
import { withdrawByToken } from '@/lib/reviews/queries';
import { notifyAuthorWithdrawal } from '@/lib/reviews/emails';
import { clientIp, createRateLimiter } from '@/lib/security/rate-limit';

// A 32-byte token is not guessable, but an unthrottled endpoint is still a
// free way to probe one.
const limiter = createRateLimiter({ limit: 20, windowMs: 15 * 60 * 1_000 });

export type WithdrawResult = { ok: true } | { ok: false; reason: 'gone' | 'rate-limited' };

/**
 * The author removing her own review.
 *
 * A server action rather than a link target, so nothing is deleted by a GET:
 * mail clients and link scanners prefetch, and a one-click destructive URL in
 * an email would eventually fire on its own.
 */
export async function withdrawOwnReview(formData: FormData): Promise<WithdrawResult> {
  if (limiter.check(clientIp(await headers()))) {
    return { ok: false, reason: 'rate-limited' };
  }

  const token = ((formData.get('token') as string) ?? '').trim();
  const authorName = ((formData.get('authorName') as string) ?? '').trim();

  const outcome = await withdrawByToken(token);
  if (outcome !== 'withdrawn') return { ok: false, reason: 'gone' };

  // She does not need to hear back, but the founders should know why a review
  // disappeared. Failure here must not make the removal look unsuccessful.
  try {
    await notifyAuthorWithdrawal(authorName || 'una cliente');
  } catch (error) {
    console.error('Review withdrawn, but the founders were not notified.', error);
  }

  return { ok: true };
}
