'use server';

import { revalidatePath } from 'next/cache';
import { currentAdmin } from '@/lib/reviews/admin-session';
import { QUOTE_STATUSES, convertQuoteToClient, setQuoteStatus, type QuoteStatus } from '@/lib/quotes/queries';
import type { ActionState } from '../clients/state';

async function requireAdmin(): Promise<string> {
  const admin = await currentAdmin();
  if (!admin) throw new Error('Not signed in.');
  return admin;
}

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

export async function setQuoteStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = field(formData, 'quoteId');
  const status = field(formData, 'status') as QuoteStatus;
  if (!QUOTE_STATUSES.includes(status)) return { error: 'status' };
  if (!(await setQuoteStatus(id, status))) return { error: 'notfound' };
  revalidatePath('/admin/quotes', 'layout');
  return { ok: true };
}

/** Creates (or finds) the client area for a request and opens it. */
export async function convertQuoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const result = await convertQuoteToClient(field(formData, 'quoteId'));
  if (!result) return { error: 'notfound' };
  revalidatePath('/admin/quotes', 'layout');
  revalidatePath('/admin/clients', 'layout');
  return { ok: true, redirectTo: `/admin/clients/${result.clientId}` };
}
