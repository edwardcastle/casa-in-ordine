'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { PROJECT_ZONES, deleteTip, setTipPublished, upsertTip } from '@/lib/area/queries';
import { getPostSlugs } from '@/lib/blog';
import { currentAdmin } from '@/lib/reviews/admin-session';
import type { ActionState } from '../clients/state';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TITLE = 200;
const MAX_BODY = 10_000;

async function requireAdmin(): Promise<string> {
  const admin = await currentAdmin();
  if (!admin) throw new Error('Not signed in.');
  return admin;
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export async function upsertTipAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const id = text(formData, 'id');
  if (id && !UUID.test(id)) return { error: 'notfound' };

  const fields = {
    titleIt: text(formData, 'titleIt'),
    bodyIt: text(formData, 'bodyIt'),
    titleEn: text(formData, 'titleEn'),
    bodyEn: text(formData, 'bodyEn'),
    titleEs: text(formData, 'titleEs'),
    bodyEs: text(formData, 'bodyEs'),
  };
  const zone = text(formData, 'zone') || null;
  const blogSlug = text(formData, 'blogSlug') || null;

  if (!fields.titleIt || !fields.bodyIt) return { error: 'required' };
  for (const [key, value] of Object.entries(fields)) {
    const isTitle = key.startsWith('title');
    if (value.length > (isTitle ? MAX_TITLE : MAX_BODY)) return { error: isTitle ? 'title' : 'body' };
  }
  if (zone && !(PROJECT_ZONES as readonly string[]).includes(zone)) return { error: 'zone' };
  if (blogSlug && !getPostSlugs().includes(blogSlug)) return { error: 'slug' };

  const result = await upsertTip({
    ...fields,
    id: id || undefined,
    zone,
    blogSlug,
    published: formData.get('published') === 'on',
  });
  if ('error' in result) return { error: result.error };

  revalidatePath('/admin/tips');
  revalidatePath('/[locale]/area', 'layout');
  if (id) redirect('/admin/tips');
  return { ok: true, message: 'Consiglio salvato' };
}

export async function setTipPublishedAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = text(formData, 'id');
  if (!UUID.test(id) || !(await setTipPublished(id, text(formData, 'published') === 'true'))) {
    return { error: 'notfound' };
  }

  revalidatePath('/admin/tips');
  revalidatePath('/[locale]/area', 'layout');
  return { ok: true };
}

export async function deleteTipAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const id = text(formData, 'id');
  if (!UUID.test(id) || !(await deleteTip(id))) return { error: 'notfound' };

  revalidatePath('/admin/tips');
  revalidatePath('/[locale]/area', 'layout');
  return { ok: true };
}
