'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { notifyClient } from '@/lib/area/emails';
import { confirmUpload, createUploadUrl, deleteFiles, validateUpload } from '@/lib/area/files';
import {
  PROJECT_STATUSES,
  PROJECT_ZONES,
  addMaterial,
  createClient,
  createProject,
  deleteClient,
  deleteMaterial,
  setClientActive,
  updateProjectStatus,
} from '@/lib/area/queries';
import { currentAdmin } from '@/lib/reviews/admin-session';
import type { ActionState } from './state';

/**
 * Admin actions for the client area.
 *
 * A server action is a public POST endpoint whatever page renders it, so each
 * one starts with `requireAdmin()` and treats every id and field as untrusted.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LANGS = ['it', 'en', 'es'] as const;
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

function uuid(value: string): string | null {
  return UUID.test(value) ? value : null;
}

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function refresh(clientId?: string) {
  revalidatePath('/admin/clients');
  if (clientId) revalidatePath(`/admin/clients/${clientId}`);
  else revalidatePath('/admin/clients/[id]', 'page');
}

/** Removes stored blobs. The database is the record, so a failure is logged, not raised. */
async function removeBlobs(keys: string[]) {
  try {
    await deleteFiles(keys);
  } catch (error) {
    console.error('Could not delete stored files:', keys, error);
  }
}

export async function createClientAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const name = text(formData, 'name');
  const email = text(formData, 'email').toLowerCase();
  const lang = text(formData, 'lang');

  if (!name || name.length > MAX_TITLE) return { error: 'name' };
  if (!EMAIL.test(email) || email.length > 320) return { error: 'email' };
  if (!(LANGS as readonly string[]).includes(lang)) return { error: 'lang' };

  const result = await createClient({ email, name, lang: lang as (typeof LANGS)[number] });
  if ('error' in result) return { error: result.error };

  refresh();
  redirect(`/admin/clients/${result.client.id}`);
  return { ok: true };
}

export async function setClientActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const clientId = uuid(text(formData, 'clientId'));
  if (!clientId) return { error: 'notfound' };

  if (!(await setClientActive(clientId, text(formData, 'active') === 'true'))) {
    return { error: 'notfound' };
  }
  refresh(clientId);
  return { ok: true };
}

export async function deleteClientAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const clientId = uuid(text(formData, 'clientId'));
  if (!clientId) return { error: 'notfound' };
  if (formData.get('confirm') !== 'on') return { error: 'confirm' };

  const keys = await deleteClient(clientId);
  await removeBlobs(keys);

  refresh();
  redirect('/admin/clients');
  return { ok: true };
}

export async function createProjectAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const clientId = uuid(text(formData, 'clientId'));
  if (!clientId) return { error: 'notfound' };

  const title = text(formData, 'title');
  const zone = text(formData, 'zone');
  const summary = text(formData, 'summary');
  const visitDate = text(formData, 'visitDate');

  if (!title || title.length > MAX_TITLE) return { error: 'title' };
  if (zone && !(PROJECT_ZONES as readonly string[]).includes(zone)) return { error: 'zone' };
  if (summary.length > MAX_BODY) return { error: 'body' };
  if (visitDate && !isRealDate(visitDate)) return { error: 'date' };

  const project = await createProject(clientId, { title, zone, summary, visitDate });
  if (!project) return { error: 'notfound' };

  refresh(clientId);
  return { ok: true };
}

export async function updateProjectStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const projectId = uuid(text(formData, 'projectId'));
  const status = text(formData, 'status');
  if (!projectId) return { error: 'notfound' };
  if (!(PROJECT_STATUSES as readonly string[]).includes(status)) return { error: 'status' };

  if (!(await updateProjectStatus(projectId, status as (typeof PROJECT_STATUSES)[number]))) {
    return { error: 'notfound' };
  }
  refresh();
  return { ok: true };
}

/** A note (free text) or a link (an http(s) URL) on a project. */
export async function addTextMaterialAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const projectId = uuid(text(formData, 'projectId'));
  const kind = text(formData, 'kind');
  const title = text(formData, 'title');
  const body = text(formData, 'body');

  if (!projectId) return { error: 'notfound' };
  if (kind !== 'note' && kind !== 'link') return { error: 'kind' };
  if (!title || title.length > MAX_TITLE) return { error: 'title' };
  if (!body || body.length > MAX_BODY) return { error: 'body' };
  if (kind === 'link' && !/^https?:\/\/\S+$/i.test(body)) return { error: 'url' };

  if (!(await addMaterial(projectId, { kind, title, body }))) return { error: 'notfound' };

  refresh();
  return { ok: true };
}

export async function deleteMaterialAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const materialId = uuid(text(formData, 'materialId'));
  if (!materialId) return { error: 'notfound' };

  const removed = await deleteMaterial(materialId);
  if (!removed) return { error: 'notfound' };
  if (removed.fileKey) await removeBlobs([removed.fileKey]);

  refresh();
  return { ok: true };
}

/** Sends the "new material" email. Only ever runs when the organizer asks. */
export async function notifyClientAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const clientId = uuid(text(formData, 'clientId'));
  const projectId = uuid(text(formData, 'projectId'));
  if (!clientId || !projectId) return { error: 'notfound' };

  return (await notifyClient(clientId, projectId))
    ? { ok: true, message: 'Email inviata' }
    : { error: 'notify' };
}

/** Step 1 of an upload: a signed URL the browser can PUT the file to. */
export async function requestUploadUrl(
  projectId: string,
  file: { type: string; size: number },
): Promise<{ uploadUrl: string; key: string } | { error: 'type' | 'size' | 'notfound' }> {
  await requireAdmin();

  if (!uuid(projectId)) return { error: 'notfound' };
  const check = validateUpload({ type: String(file?.type), size: Number(file?.size) });
  if (!check.ok) return { error: check.reason };

  return createUploadUrl(projectId, { type: file.type, size: file.size });
}

/**
 * Step 3 of an upload: records the file as a material, but only if it really
 * landed in storage. Type and size come from storage, not from the browser.
 */
export async function attachUploadedFile(
  projectId: string,
  key: string,
  title: string,
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();

  if (!uuid(projectId)) return { error: 'notfound' };

  const stored = await confirmUpload(projectId, String(key));
  if (!stored) return { error: 'upload' };

  const added = await addMaterial(projectId, {
    kind: 'file',
    title: String(title ?? '').trim().slice(0, MAX_TITLE) || 'Documento',
    fileKey: key,
    fileType: stored.type,
    fileSize: stored.size,
  });
  if (!added) return { error: 'notfound' };

  refresh();
  return { ok: true };
}
