'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import {
  currentAdmin,
  endSession,
  isAdminConfigured,
  isAdminEmail,
} from '@/lib/reviews/admin-session';
import { sendSignInLink } from '@/lib/reviews/emails';
import { decideReview, removeReview } from '@/lib/reviews/queries';
import { clientIp, createRateLimiter } from '@/lib/security/rate-limit';

// Sign-in links are emailed, so an unthrottled form is a way to flood an
// inbox — and to probe which addresses are admins.
const linkLimiter = createRateLimiter({ limit: 5, windowMs: 15 * 60 * 1_000 });

export async function requestSignInLink(formData: FormData) {
  const email = ((formData.get('email') as string) ?? '').trim();

  if (!isAdminConfigured()) {
    console.error('ADMIN_EMAILS / ADMIN_SESSION_SECRET are not set — admin sign-in is disabled.');
    return { sent: false as const, reason: 'unavailable' as const };
  }

  if (linkLimiter.check(clientIp(await headers()))) {
    return { sent: false as const, reason: 'rate-limited' as const };
  }

  // Always reports success. Saying "that address is not an admin" would turn
  // this form into a way to enumerate who can moderate the site.
  if (isAdminEmail(email)) {
    await sendSignInLink(email);
  } else {
    console.warn(`Sign-in link requested for a non-admin address: ${email}`);
  }

  return { sent: true as const };
}

export async function signOut() {
  await endSession();
  revalidatePath('/admin/reviews');
}

async function requireAdmin(): Promise<string> {
  const admin = await currentAdmin();
  if (!admin) throw new Error('Not signed in.');
  return admin;
}

export async function approveReview(formData: FormData) {
  const admin = await requireAdmin();
  const id = formData.get('id') as string;
  const invoiceRef = ((formData.get('invoiceRef') as string) ?? '').trim();

  await decideReview(id, 'approved', admin, invoiceRef || undefined);
  revalidatePath('/admin/reviews');
}

export async function rejectReview(formData: FormData) {
  const admin = await requireAdmin();
  await decideReview(formData.get('id') as string, 'rejected', admin);
  revalidatePath('/admin/reviews');
}

/** Withdrawal. Keeps the row and its consent record, drops the words. */
export async function withdrawReview(formData: FormData) {
  const admin = await requireAdmin();
  await removeReview(formData.get('id') as string, admin);
  revalidatePath('/admin/reviews');
}
