import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeTestDb, hasTestDb, resetAreaTables, testDb } from '../helpers/db';

const files = vi.hoisted(() => ({
  confirmUpload: vi.fn(),
  createUploadUrl: vi.fn(),
  deleteFiles: vi.fn(),
}));
vi.mock('@/lib/area/files', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/area/files')>()),
  ...files,
}));

const mail = vi.hoisted(() => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/mail', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/mail')>()),
  ...mail,
}));

const session = vi.hoisted(() => ({ currentAdmin: vi.fn() }));
vi.mock('@/lib/reviews/admin-session', () => session);
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

import {
  addTextMaterialAction,
  attachUploadedFile,
  createClientAction,
  createProjectAction,
  deleteClientAction,
  deleteMaterialAction,
  notifyClientAction,
  requestUploadUrl,
  setClientActiveAction,
  updateProjectStatusAction,
} from '@/app/admin/clients/actions';
import {
  deleteTipAction,
  setTipPublishedAction,
  upsertTipAction,
} from '@/app/admin/tips/actions';
import { addMaterial, createClient, createProject } from '@/lib/area/queries';

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

async function seed(email: string) {
  const result = await createClient({ email, name: email, lang: 'en' });
  if ('error' in result) throw new Error(result.error);
  const project = (await createProject(result.client.id, { title: `P ${email}` }))!;
  return { client: result.client, project };
}

describe.skipIf(!hasTestDb())('admin actions', () => {
  beforeEach(async () => {
    await resetAreaTables();
    vi.resetAllMocks();
    session.currentAdmin.mockResolvedValue('admin@example.com');
    mail.sendEmail.mockResolvedValue(true);
    files.deleteFiles.mockResolvedValue(undefined);
  });
  afterAll(closeTestDb);

  it('every action throws without an admin session', async () => {
    session.currentAdmin.mockResolvedValue(null);
    const id = '00000000-0000-4000-8000-000000000000';
    const data = form({ clientId: id, projectId: id, materialId: id, id, confirm: 'on' });
    const calls = {
      createClientAction: () => createClientAction(null, data),
      setClientActiveAction: () => setClientActiveAction(null, data),
      deleteClientAction: () => deleteClientAction(null, data),
      createProjectAction: () => createProjectAction(null, data),
      updateProjectStatusAction: () => updateProjectStatusAction(null, data),
      addTextMaterialAction: () => addTextMaterialAction(null, data),
      deleteMaterialAction: () => deleteMaterialAction(null, data),
      notifyClientAction: () => notifyClientAction(null, data),
      requestUploadUrl: () => requestUploadUrl(id, { type: 'application/pdf', size: 1 }),
      attachUploadedFile: () => attachUploadedFile(id, 'k', 't'),
      upsertTipAction: () => upsertTipAction(null, data),
      setTipPublishedAction: () => setTipPublishedAction(null, data),
      deleteTipAction: () => deleteTipAction(null, data),
    };
    expect(Object.keys(calls)).toHaveLength(13);
    for (const [name, call] of Object.entries(calls)) {
      await expect(call(), name).rejects.toThrow('Not signed in.');
    }
    expect(files.createUploadUrl).not.toHaveBeenCalled();
    expect(await testDb()`SELECT id FROM clients`).toHaveLength(0);
  });

  it('createProjectAction accepts an empty zone and stores null', async () => {
    const { client } = await seed('a@example.com');
    const fields = { clientId: client.id, title: 'Senza zona', zone: '', summary: '', visitDate: '' };

    expect(await createProjectAction(null, form(fields))).toEqual({ ok: true });
    const [row] = await testDb()`
      SELECT zone, summary, visit_date FROM client_projects WHERE title = 'Senza zona'`;
    expect(row).toEqual({ zone: null, summary: null, visit_date: null });

    expect(await createProjectAction(null, form({ ...fields, zone: 'attic' }))).toEqual({
      error: 'zone',
    });
    expect(await createProjectAction(null, form({ ...fields, zone: 'bagno' }))).toEqual({
      ok: true,
    });
  });

  it('createClientAction stores a lowercased email and reports a duplicate', async () => {
    const fields = { name: 'Anna', email: ' Anna@Example.com ', lang: 'it' };
    await createClientAction(null, form(fields));
    expect((await testDb()`SELECT email FROM clients`).map((r) => r.email)).toEqual([
      'anna@example.com',
    ]);

    expect(await createClientAction(null, form(fields))).toEqual({ error: 'duplicate' });
    expect(await createClientAction(null, form({ ...fields, email: 'nope' }))).toEqual({
      error: 'email',
    });
    expect(await createClientAction(null, form({ ...fields, email: 'b@x.it', lang: 'fr' }))).toEqual({
      error: 'lang',
    });
  });

  it('deleting a client needs the confirmation checkbox', async () => {
    const { client } = await seed('a@example.com');
    expect(await deleteClientAction(null, form({ clientId: client.id }))).toEqual({
      error: 'confirm',
    });
    expect(await testDb()`SELECT id FROM clients`).toHaveLength(1);
  });

  it('deleting a client cascades and deletes their stored files', async () => {
    const gone = await seed('gone@example.com');
    const keep = await seed('keep@example.com');
    await addMaterial(gone.project.id, {
      kind: 'file',
      title: 'F',
      fileKey: `area/${gone.project.id}/a.pdf`,
      fileType: 'application/pdf',
      fileSize: 1,
    });
    await addMaterial(keep.project.id, {
      kind: 'file',
      title: 'F',
      fileKey: `area/${keep.project.id}/b.pdf`,
      fileType: 'application/pdf',
      fileSize: 1,
    });

    await deleteClientAction(null, form({ clientId: gone.client.id, confirm: 'on' }));

    expect(files.deleteFiles).toHaveBeenCalledExactlyOnceWith([`area/${gone.project.id}/a.pdf`]);
    const sql = testDb();
    expect((await sql`SELECT id FROM clients`).map((r) => r.id)).toEqual([keep.client.id]);
    expect(await sql`SELECT id FROM project_materials`).toHaveLength(1);
  });

  it('a failing blob deletion does not fail the client deletion', async () => {
    const { client, project } = await seed('a@example.com');
    await addMaterial(project.id, {
      kind: 'file',
      title: 'F',
      fileKey: `area/${project.id}/a.pdf`,
      fileType: 'application/pdf',
      fileSize: 1,
    });
    files.deleteFiles.mockRejectedValue(new Error('blob down'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      deleteClientAction(null, form({ clientId: client.id, confirm: 'on' })),
    ).resolves.toBeDefined();
    expect(await testDb()`SELECT id FROM clients`).toHaveLength(0);
    expect(log).toHaveBeenCalled();
  });

  it('deleting a file material deletes its blob; a note touches no blob', async () => {
    const { project } = await seed('a@example.com');
    const file = (await addMaterial(project.id, {
      kind: 'file',
      title: 'F',
      fileKey: `area/${project.id}/a.pdf`,
      fileType: 'application/pdf',
      fileSize: 1,
    }))!;
    const note = (await addMaterial(project.id, { kind: 'note', title: 'N', body: 'x' }))!;

    await deleteMaterialAction(null, form({ materialId: note.id }));
    expect(files.deleteFiles).not.toHaveBeenCalled();
    await deleteMaterialAction(null, form({ materialId: file.id }));
    expect(files.deleteFiles).toHaveBeenCalledExactlyOnceWith([`area/${project.id}/a.pdf`]);
  });

  it('a link must start with http:// or https://', async () => {
    const { project } = await seed('a@example.com');
    const link = (body: string) =>
      addTextMaterialAction(
        null,
        form({ projectId: project.id, kind: 'link', title: 'L', body }),
      );

    expect(await link('javascript:alert(1)')).toEqual({ error: 'url' });
    expect(await link('example.com')).toEqual({ error: 'url' });
    expect(await link('https://example.com/x')).toEqual({ ok: true });
    expect(await testDb()`SELECT id FROM project_materials`).toHaveLength(1);
  });

  it('attachUploadedFile refuses when confirmUpload returns null', async () => {
    const { project } = await seed('a@example.com');
    files.confirmUpload.mockResolvedValue(null);

    expect(await attachUploadedFile(project.id, `area/${project.id}/x.pdf`, 'Plan')).toEqual({
      error: 'upload',
    });
    expect(await testDb()`SELECT id FROM project_materials`).toHaveLength(0);
  });

  it('attachUploadedFile records type and size from storage, not from the browser', async () => {
    const { project } = await seed('a@example.com');
    const key = `area/${project.id}/x.pdf`;
    files.confirmUpload.mockResolvedValue({ type: 'application/pdf', size: 4242 });

    expect(await attachUploadedFile(project.id, key, '  Plan  ')).toEqual({ ok: true });
    expect(files.confirmUpload).toHaveBeenCalledWith(project.id, key);
    const [row] = await testDb()`
      SELECT kind, title, file_key, file_type, file_size FROM project_materials`;
    expect(row).toMatchObject({
      kind: 'file',
      title: 'Plan',
      file_key: key,
      file_type: 'application/pdf',
      file_size: 4242,
    });
  });

  it('attachUploadedFile refuses a key that is already attached', async () => {
    const { project } = await seed('a@example.com');
    const key = `area/${project.id}/x.pdf`;
    files.confirmUpload.mockResolvedValue({ type: 'application/pdf', size: 10 });

    expect(await attachUploadedFile(project.id, key, 'First')).toEqual({ ok: true });
    expect(await attachUploadedFile(project.id, key, 'Second')).toEqual({ error: 'duplicate' });
    expect(await testDb()`SELECT id FROM project_materials`).toHaveLength(1);
  });

  it('attachUploadedFile deletes the stored blob when the project is gone', async () => {
    const { project } = await seed('a@example.com');
    const key = `area/${project.id}/x.pdf`;
    files.confirmUpload.mockResolvedValue({ type: 'application/pdf', size: 10 });
    await testDb()`DELETE FROM client_projects WHERE id = ${project.id}`;

    expect(await attachUploadedFile(project.id, key, 'Plan')).toEqual({ error: 'notfound' });
    expect(files.deleteFiles).toHaveBeenCalledWith([key]);
  });

  it('attachUploadedFile logs, and still answers, when deleting the stray blob fails', async () => {
    const { project } = await seed('a@example.com');
    files.confirmUpload.mockResolvedValue({ type: 'application/pdf', size: 10 });
    files.deleteFiles.mockRejectedValue(new Error('blob down'));
    await testDb()`DELETE FROM client_projects WHERE id = ${project.id}`;
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      expect(await attachUploadedFile(project.id, 'k', 'Plan')).toEqual({ error: 'notfound' });
      expect(logged).toHaveBeenCalled();
    } finally {
      logged.mockRestore();
    }
  });

  it('attachUploadedFile keeps the blob on the duplicate path', async () => {
    const { project } = await seed('a@example.com');
    const key = `area/${project.id}/x.pdf`;
    files.confirmUpload.mockResolvedValue({ type: 'application/pdf', size: 10 });

    await attachUploadedFile(project.id, key, 'First');
    expect(await attachUploadedFile(project.id, key, 'Second')).toEqual({ error: 'duplicate' });
    expect(files.deleteFiles).not.toHaveBeenCalled();
  });

  it('requestUploadUrl refuses a project that does not exist, issuing no URL', async () => {
    const gone = '00000000-0000-4000-8000-000000000000';

    expect(await requestUploadUrl(gone, { type: 'application/pdf', size: 10 })).toEqual({
      error: 'project',
    });
    expect(files.createUploadUrl).not.toHaveBeenCalled();
  });

  it('requestUploadUrl reports the rejection reason before asking for a URL', async () => {
    const { project } = await seed('a@example.com');
    expect(await requestUploadUrl(project.id, { type: 'text/html', size: 10 })).toEqual({
      error: 'type',
    });
    expect(await requestUploadUrl(project.id, { type: 'application/pdf', size: 0 })).toEqual({
      error: 'size',
    });
    expect(files.createUploadUrl).not.toHaveBeenCalled();

    files.createUploadUrl.mockResolvedValue({ uploadUrl: 'https://u', key: 'k' });
    expect(await requestUploadUrl(project.id, { type: 'application/pdf', size: 10 })).toEqual({
      uploadUrl: 'https://u',
      key: 'k',
    });
  });

  it('notifyClient sends for the client’s own project, with a link to it', async () => {
    const { client, project } = await seed('a@example.com');

    expect(
      await notifyClientAction(null, form({ clientId: client.id, projectId: project.id })),
    ).toEqual({ ok: true, message: 'Email inviata' });
    expect(mail.sendEmail).toHaveBeenCalledOnce();
    const sent = mail.sendEmail.mock.calls[0][0];
    expect(sent.to).toEqual([{ email: 'a@example.com' }]);
    expect(sent.html).toContain(`/en/area/progetti/${project.id}`);
  });

  it('notifyClient refuses a project of another client, and an inactive client', async () => {
    const a = await seed('a@example.com');
    const b = await seed('b@example.com');

    expect(
      await notifyClientAction(null, form({ clientId: a.client.id, projectId: b.project.id })),
    ).toEqual({ error: 'notify' });
    expect(mail.sendEmail).not.toHaveBeenCalled();

    await testDb()`UPDATE clients SET active = false WHERE id = ${a.client.id}`;
    expect(
      await notifyClientAction(null, form({ clientId: a.client.id, projectId: a.project.id })),
    ).toEqual({ error: 'notify' });
    expect(mail.sendEmail).not.toHaveBeenCalled();
  });

  it('notifyClientAction reports an error when the email fails', async () => {
    const { client, project } = await seed('a@example.com');
    mail.sendEmail.mockResolvedValue(false);
    expect(
      await notifyClientAction(null, form({ clientId: client.id, projectId: project.id })),
    ).toEqual({ error: 'notify' });
  });

  it('upsertTipAction requires Italian text and rejects an unknown blog slug', async () => {
    expect(await upsertTipAction(null, form({ titleIt: 'T', bodyIt: '' }))).toEqual({
      error: 'required',
    });
    expect(
      await upsertTipAction(null, form({ titleIt: 'T', bodyIt: 'B', blogSlug: 'no-such-post' })),
    ).toEqual({ error: 'slug' });
    expect(
      await upsertTipAction(null, form({ titleIt: 'T', bodyIt: 'B', zone: 'attic' })),
    ).toEqual({ error: 'zone' });
    expect(
      await upsertTipAction(null, form({ titleIt: 'T'.repeat(201), bodyIt: 'B' })),
    ).toEqual({ error: 'title' });
    expect(
      await upsertTipAction(null, form({ titleIt: 'T', bodyIt: 'B'.repeat(10_001) })),
    ).toEqual({ error: 'body' });
    expect(
      await upsertTipAction(
        null,
        form({ titleIt: 'T', bodyIt: 'B', zone: 'cucina', published: 'on' }),
      ),
    ).toMatchObject({ ok: true });
    const [row] = await testDb()`SELECT zone, published FROM area_tips`;
    expect(row).toEqual({ zone: 'cucina', published: true });

    // Blank selects ("nessuna" / "nessuno") are stored as null.
    await upsertTipAction(null, form({ titleIt: 'U', bodyIt: 'B', zone: '', blogSlug: '' }));
    const [blank] = await testDb()`SELECT zone, blog_slug FROM area_tips WHERE title_it = 'U'`;
    expect(blank).toEqual({ zone: null, blog_slug: null });
  });
});
