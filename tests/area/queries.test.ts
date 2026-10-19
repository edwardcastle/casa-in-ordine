import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { closeTestDb, hasTestDb, resetAreaTables, testDb } from '../helpers/db';
import { getMaterialFile, getProject, listProjects, listTips } from '@/lib/area/queries';

type Seed = { clientId: string; projectId: string; materialId: string; noteId: string };

async function seedClient(email: string, title: string): Promise<Seed> {
  const sql = testDb();
  const [client] = await sql<{ id: string }[]>`
    INSERT INTO clients (email, name) VALUES (${email}, ${title}) RETURNING id`;
  const [project] = await sql<{ id: string }[]>`
    INSERT INTO client_projects (client_id, title, zone, status, summary, visit_date)
    VALUES (${client.id}, ${title}, 'cucina', 'in_progress', 'Summary', '2026-11-03')
    RETURNING id`;
  const [file] = await sql<{ id: string }[]>`
    INSERT INTO project_materials (project_id, kind, title, file_key, file_type, file_size, created_at)
    VALUES (${project.id}, 'file', ${`${title} plan`}, ${`keys/${title}.pdf`}, 'application/pdf', 1234,
            now() - interval '1 day')
    RETURNING id`;
  const [note] = await sql<{ id: string }[]>`
    INSERT INTO project_materials (project_id, kind, title, body)
    VALUES (${project.id}, 'note', ${`${title} note`}, 'Remember the keys')
    RETURNING id`;
  return { clientId: client.id, projectId: project.id, materialId: file.id, noteId: note.id };
}

describe.skipIf(!hasTestDb())('ownership-scoped queries', () => {
  let a: Seed;
  let b: Seed;

  beforeEach(async () => {
    await resetAreaTables();
    a = await seedClient('a@example.com', 'Alpha');
    b = await seedClient('b@example.com', 'Beta');
  });

  afterAll(closeTestDb);

  it("getProject(A, B's project) returns null", async () => {
    expect(await getProject(a.clientId, b.projectId)).toBeNull();
  });

  it("getMaterialFile(A, B's material) returns null", async () => {
    expect(await getMaterialFile(a.clientId, b.materialId)).toBeNull();
  });

  it("listProjects(A) never contains B's projects", async () => {
    const projects = await listProjects(a.clientId);
    expect(projects.map((p) => p.id)).toEqual([a.projectId]);
  });

  it('getProject(A, not-a-uuid) returns null', async () => {
    expect(await getProject(a.clientId, 'not-a-uuid')).toBeNull();
  });

  it('returns null, not an error, for a malformed client or material id', async () => {
    expect(await getProject('nope', a.projectId)).toBeNull();
    expect(await getMaterialFile(a.clientId, 'not-a-uuid')).toBeNull();
    expect(await getMaterialFile('nope', a.materialId)).toBeNull();
    expect(await listProjects('nope')).toEqual([]);
  });

  it('lists a project with its material count and ISO visit date', async () => {
    expect(await listProjects(a.clientId)).toEqual([
      {
        id: a.projectId,
        title: 'Alpha',
        zone: 'cucina',
        status: 'in_progress',
        visitDate: '2026-11-03',
        materialCount: 2,
      },
    ]);
  });

  it('lists projects newest first', async () => {
    const sql = testDb();
    const [newer] = await sql<{ id: string }[]>`
      INSERT INTO client_projects (client_id, title, created_at)
      VALUES (${a.clientId}, 'Newer', now() + interval '1 hour') RETURNING id`;

    const projects = await listProjects(a.clientId);
    expect(projects.map((p) => p.id)).toEqual([newer.id, a.projectId]);
    expect(projects[0]).toMatchObject({ zone: null, visitDate: null, materialCount: 0 });
  });

  it('returns the owner their project with materials, newest first', async () => {
    const project = await getProject(a.clientId, a.projectId);

    expect(project).toMatchObject({
      id: a.projectId,
      title: 'Alpha',
      summary: 'Summary',
      visitDate: '2026-11-03',
      materialCount: 2,
    });
    expect(project!.materials.map((m) => m.id)).toEqual([a.noteId, a.materialId]);
    expect(project!.materials[1]).toMatchObject({
      kind: 'file',
      title: 'Alpha plan',
      body: null,
      fileType: 'application/pdf',
      fileSize: 1234,
    });
    expect(project!.materials[1].createdAt).toBeInstanceOf(Date);
    // The storage key never leaves the server through the project view.
    expect(project!.materials[1]).not.toHaveProperty('fileKey');
  });

  it('returns the owner their file', async () => {
    expect(await getMaterialFile(a.clientId, a.materialId)).toEqual({
      fileKey: 'keys/Alpha.pdf',
      fileType: 'application/pdf',
      title: 'Alpha plan',
    });
  });

  it('returns null for a note, which has no file', async () => {
    expect(await getMaterialFile(a.clientId, a.noteId)).toBeNull();
  });

  describe('listTips', () => {
    async function insertTip(t: {
      it?: [string | null, string | null];
      en?: [string | null, string | null];
      es?: [string | null, string | null];
      published?: boolean;
      zone?: string | null;
      slug?: string | null;
      createdAt?: string;
    }) {
      const [ti, bi] = t.it ?? [null, null];
      const [te, be] = t.en ?? [null, null];
      const [ts, bs] = t.es ?? [null, null];
      await testDb()`
        INSERT INTO area_tips (title_it, title_en, title_es, body_it, body_en, body_es,
                               zone, blog_slug, published, created_at)
        VALUES (${ti}, ${te}, ${ts}, ${bi}, ${be}, ${bs}, ${t.zone ?? null}, ${t.slug ?? null},
                ${t.published ?? true}, ${t.createdAt ?? new Date().toISOString()})`;
    }

    it('falls back to Italian text when Spanish is empty', async () => {
      await insertTip({
        it: ['Titolo', 'Corpo'],
        es: ['', null],
        zone: 'bagno',
        slug: 'un-articolo',
      });

      const tips = await listTips('es');
      expect(tips).toEqual([
        {
          id: expect.any(String),
          title: 'Titolo',
          body: 'Corpo',
          zone: 'bagno',
          blogSlug: 'un-articolo',
        },
      ]);
    });

    it('falls back for title and body independently', async () => {
      await insertTip({ it: ['Titolo', 'Corpo'], es: ['Titulo', null] });
      await insertTip({
        it: ['Titolo 2', 'Corpo 2'],
        es: [null, 'Cuerpo 2'],
        createdAt: '2020-01-01T00:00:00Z',
      });

      const tips = await listTips('es');
      expect(tips.map((t) => [t.title, t.body])).toEqual([
        ['Titulo', 'Corpo'],
        ['Titolo 2', 'Cuerpo 2'],
      ]);
    });

    it('uses the requested language when it is present', async () => {
      await insertTip({ it: ['Titolo', 'Corpo'], en: ['Title', 'Body'] });

      const [tip] = await listTips('en');
      expect(tip).toMatchObject({ title: 'Title', body: 'Body' });
    });

    it('excludes unpublished tips', async () => {
      await insertTip({ it: ['Public', 'Body'] });
      await insertTip({ it: ['Draft', 'Body'], published: false });

      expect((await listTips('it')).map((t) => t.title)).toEqual(['Public']);
    });

    it('returns newest first and honours the limit', async () => {
      await insertTip({ it: ['Old', 'x'], createdAt: '2020-01-01T00:00:00Z' });
      await insertTip({ it: ['Mid', 'x'], createdAt: '2021-01-01T00:00:00Z' });
      await insertTip({ it: ['New', 'x'], createdAt: '2022-01-01T00:00:00Z' });

      expect((await listTips('it')).map((t) => t.title)).toEqual(['New', 'Mid', 'Old']);
      expect((await listTips('it', 2)).map((t) => t.title)).toEqual(['New', 'Mid']);
    });
  });
});
