import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { closeTestDb, hasTestDb, resetAreaTables, testDb } from '../helpers/db';
import {
  addMaterial,
  createClient,
  createProject,
  deleteClient,
  deleteMaterial,
  setClientActive,
  updateProjectStatus,
  upsertTip,
} from '@/lib/area/queries';

const MISSING = '00000000-0000-4000-8000-000000000000';

describe.skipIf(!hasTestDb())('admin write queries', () => {
  beforeEach(resetAreaTables);
  afterAll(closeTestDb);

  async function newClient(email = 'anna@example.com') {
    const result = await createClient({ email, name: 'Anna', lang: 'it' });
    if ('error' in result) throw new Error(result.error);
    return result.client;
  }

  it('createClient lowercases and trims email', async () => {
    const result = await createClient({ email: '  Anna@Example.COM ', name: ' Anna ', lang: 'es' });
    expect('client' in result && result.client).toMatchObject({
      email: 'anna@example.com',
      name: 'Anna',
      lang: 'es',
    });
    const rows = await testDb()`SELECT email FROM clients`;
    expect(rows.map((r) => r.email)).toEqual(['anna@example.com']);
  });

  it('createClient with an existing email returns duplicate', async () => {
    await newClient('anna@example.com');
    expect(await createClient({ email: 'ANNA@example.com', name: 'Other', lang: 'en' })).toEqual({
      error: 'duplicate',
    });
    const [{ count }] = await testDb()`SELECT count(*)::int AS count FROM clients`;
    expect(count).toBe(1);
  });

  it('setClientActive toggles and reports whether the client exists', async () => {
    const client = await newClient();
    expect(await setClientActive(client.id, false)).toBe(true);
    const [row] = await testDb()`SELECT active FROM clients WHERE id = ${client.id}`;
    expect(row.active).toBe(false);
    expect(await setClientActive(MISSING, false)).toBe(false);
    expect(await setClientActive('not-a-uuid', false)).toBe(false);
  });

  it('createProject creates a planned project, and refuses an unknown client', async () => {
    const client = await newClient();
    const project = await createProject(client.id, {
      title: ' Cucina Rossi ',
      zone: 'cucina',
      summary: null,
      visitDate: '2026-11-03',
    });
    expect(project).toMatchObject({
      title: 'Cucina Rossi',
      zone: 'cucina',
      status: 'planned',
      visitDate: '2026-11-03',
    });
    expect(await createProject(MISSING, { title: 'X' })).toBeNull();
  });

  it('updateProjectStatus changes the status and rejects unknown values', async () => {
    const client = await newClient();
    const project = (await createProject(client.id, { title: 'P' }))!;
    expect(await updateProjectStatus(project.id, 'in_progress')).toBe(true);
    const [row] = await testDb()`SELECT status FROM client_projects WHERE id = ${project.id}`;
    expect(row.status).toBe('in_progress');
    expect(await updateProjectStatus(project.id, 'bogus' as never)).toBe(false);
    expect(await updateProjectStatus(MISSING, 'done')).toBe(false);
  });

  it('addMaterial stores notes, links and files, and refuses an unknown project', async () => {
    const client = await newClient();
    const project = (await createProject(client.id, { title: 'P' }))!;

    const note = await addMaterial(project.id, { kind: 'note', title: 'N', body: 'Text' });
    const link = await addMaterial(project.id, {
      kind: 'link',
      title: 'L',
      body: 'https://example.com',
    });
    const file = await addMaterial(project.id, {
      kind: 'file',
      title: 'F',
      fileKey: `area/${project.id}/k.pdf`,
      fileType: 'application/pdf',
      fileSize: 99,
    });
    expect(note && link && file).toBeTruthy();

    const rows = await testDb()`
      SELECT kind, body, file_key, file_type, file_size FROM project_materials ORDER BY kind`;
    expect(rows.map((r) => r.kind)).toEqual(['file', 'link', 'note']);
    expect(rows[0]).toMatchObject({ file_type: 'application/pdf', file_size: 99 });

    expect(await addMaterial(MISSING, { kind: 'note', title: 'N', body: 'x' })).toBeNull();
  });

  it('deleteMaterial removes the row and returns its file key', async () => {
    const client = await newClient();
    const project = (await createProject(client.id, { title: 'P' }))!;
    const file = (await addMaterial(project.id, {
      kind: 'file',
      title: 'F',
      fileKey: `area/${project.id}/k.pdf`,
      fileType: 'application/pdf',
      fileSize: 1,
    }))!;
    const note = (await addMaterial(project.id, { kind: 'note', title: 'N', body: 'x' }))!;

    expect(await deleteMaterial(file.id)).toEqual({ fileKey: `area/${project.id}/k.pdf` });
    expect(await deleteMaterial(note.id)).toEqual({ fileKey: null });
    expect(await deleteMaterial(note.id)).toBeNull();
    const [{ count }] = await testDb()`SELECT count(*)::int AS count FROM project_materials`;
    expect(count).toBe(0);
  });

  it('deleting a client removes their projects and materials', async () => {
    const keep = await newClient('keep@example.com');
    const gone = await newClient('gone@example.com');
    const keepProject = (await createProject(keep.id, { title: 'Keep' }))!;
    const goneProject = (await createProject(gone.id, { title: 'Gone' }))!;
    await addMaterial(keepProject.id, { kind: 'note', title: 'N', body: 'x' });
    await addMaterial(goneProject.id, { kind: 'note', title: 'N', body: 'x' });
    await addMaterial(goneProject.id, {
      kind: 'file',
      title: 'F',
      fileKey: `area/${goneProject.id}/k.pdf`,
      fileType: 'application/pdf',
      fileSize: 1,
    });

    expect(await deleteClient(gone.id)).toEqual([`area/${goneProject.id}/k.pdf`]);

    const sql = testDb();
    expect((await sql`SELECT id FROM clients`).map((r) => r.id)).toEqual([keep.id]);
    expect((await sql`SELECT id FROM client_projects`).map((r) => r.id)).toEqual([keepProject.id]);
    const [{ count }] = await sql`SELECT count(*)::int AS count FROM project_materials`;
    expect(count).toBe(1);
    expect(await deleteClient(gone.id)).toEqual([]);
  });

  it('upsertTip requires an Italian title and body, then inserts and updates', async () => {
    expect(await upsertTip({ titleIt: ' ', bodyIt: 'b', published: false })).toEqual({
      error: 'required',
    });
    expect(await upsertTip({ titleIt: 't', bodyIt: '', published: false })).toEqual({
      error: 'required',
    });
    expect(await upsertTip({ titleIt: 't', bodyIt: 'b', zone: 'attic', published: false })).toEqual({
      error: 'zone',
    });

    const created = await upsertTip({
      titleIt: ' Titolo ',
      bodyIt: 'Corpo',
      titleEn: 'Title',
      zone: 'cucina',
      blogSlug: 'some-slug',
      published: true,
    });
    if (!('tip' in created)) throw new Error('expected a tip');
    expect(created.tip).toMatchObject({
      titleIt: 'Titolo',
      bodyIt: 'Corpo',
      titleEn: 'Title',
      bodyEn: null,
      zone: 'cucina',
      blogSlug: 'some-slug',
      published: true,
    });

    const updated = await upsertTip({
      id: created.tip.id,
      titleIt: 'Nuovo',
      bodyIt: 'Corpo',
      zone: null,
      published: false,
    });
    if (!('tip' in updated)) throw new Error('expected a tip');
    expect(updated.tip).toMatchObject({ id: created.tip.id, titleIt: 'Nuovo', zone: null, published: false });
    const [{ count }] = await testDb()`SELECT count(*)::int AS count FROM area_tips`;
    expect(count).toBe(1);

    expect(await upsertTip({ id: MISSING, titleIt: 't', bodyIt: 'b', published: false })).toEqual({
      error: 'notfound',
    });
  });
});
