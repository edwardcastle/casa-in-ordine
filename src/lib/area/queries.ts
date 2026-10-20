import { db } from '@/lib/reviews/db';
import type { RichDoc } from './rich-text';

export type Client = {
  id: string;
  email: string;
  name: string;
  lang: 'it' | 'en' | 'es';
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The client with this id, if they exist and have not been deactivated.
 *
 * An id that is not a uuid is "no such client", not an error: the id comes out
 * of a cookie we signed, but Postgres would reject a malformed one with an
 * exception, and a lookup that can throw turns a stale cookie into a 500.
 */
export async function findActiveClient(id: string): Promise<Client | null> {
  if (!UUID.test(id)) return null;

  const rows = await db()<Client[]>`
    SELECT id, email, name, lang
    FROM clients
    WHERE id = ${id} AND active
  `;
  return rows[0] ?? null;
}

/**
 * The active client with this email address, or null.
 *
 * The address is trimmed and lowercased before matching, and compared against
 * the stored one lowercased too, so "Anna@Example.com " finds
 * "anna@example.com" whichever way it was typed when the client was added.
 * Deactivated clients are "no such client": they cannot be sent a sign-in link.
 */
export async function findClientByEmail(email: string): Promise<Client | null> {
  const wanted = email.trim().toLowerCase();
  if (!wanted) return null;

  const rows = await db()<Client[]>`
    SELECT id, email, name, lang
    FROM clients
    WHERE lower(email) = ${wanted} AND active
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/**
 * Records that the client was here, at most once an hour.
 *
 * The condition lives in the UPDATE, so a busy page does not write on every
 * request and two concurrent requests cannot both pass a read-then-write check.
 */
export async function touchClient(id: string): Promise<void> {
  await db()`
    UPDATE clients
    SET last_seen_at = now()
    WHERE id = ${id}
      AND (last_seen_at IS NULL OR last_seen_at < now() - interval '1 hour')
  `;
}

export type ProjectSummary = {
  id: string;
  title: string;
  zone: string | null;
  status: 'planned' | 'in_progress' | 'done';
  /** ISO `YYYY-MM-DD`, or null when no visit is booked. */
  visitDate: string | null;
  materialCount: number;
};

export type Material = {
  id: string;
  kind: 'file' | 'note' | 'link';
  title: string;
  /** The note text, or the link's URL. */
  body: string | null;
  /** A formatted note's document; null for links, files and older plain notes. */
  doc: RichDoc | null;
  fileType: string | null;
  fileSize: number | null;
  createdAt: Date;
};

export type ProjectDetail = ProjectSummary & {
  summary: string | null;
  materials: Material[];
};

export type Tip = {
  id: string;
  title: string;
  body: string;
  zone: string | null;
  blogSlug: string | null;
};

/**
 * Everything below is scoped to one client, and the scoping is part of every
 * query rather than a check afterwards: a project or material is reached only
 * through `client_projects.client_id`, and no function takes a project or
 * material id on its own. An id that belongs to someone else therefore matches
 * nothing, and reads exactly like an id that does not exist.
 *
 * Ids come from URLs, so every one is checked for uuid shape first. Postgres
 * would reject a malformed uuid with an exception, which would turn a mistyped
 * link into a 500.
 */

/** The client's projects, newest first. */
export async function listProjects(clientId: string): Promise<ProjectSummary[]> {
  if (!UUID.test(clientId)) return [];

  return db()<ProjectSummary[]>`
    SELECT p.id,
           p.title,
           p.zone,
           p.status,
           to_char(p.visit_date, 'YYYY-MM-DD') AS "visitDate",
           (SELECT count(*)::int FROM project_materials m WHERE m.project_id = p.id)
             AS "materialCount"
    FROM client_projects p
    WHERE p.client_id = ${clientId}
    ORDER BY p.created_at DESC, p.id
  `;
}

/** One of the client's projects with its materials (newest first), or null. */
export async function getProject(
  clientId: string,
  projectId: string,
): Promise<ProjectDetail | null> {
  if (!UUID.test(clientId) || !UUID.test(projectId)) return null;

  const sql = db();
  const [project] = await sql<Omit<ProjectDetail, 'materials'>[]>`
    SELECT p.id,
           p.title,
           p.zone,
           p.status,
           p.summary,
           to_char(p.visit_date, 'YYYY-MM-DD') AS "visitDate",
           (SELECT count(*)::int FROM project_materials m WHERE m.project_id = p.id)
             AS "materialCount"
    FROM client_projects p
    WHERE p.id = ${projectId} AND p.client_id = ${clientId}
  `;
  if (!project) return null;

  // The storage key is deliberately not selected: files are served through
  // `getMaterialFile`, which checks ownership again on every download.
  const materials = await sql<Material[]>`
    SELECT m.id,
           m.kind,
           m.title,
           m.body,
           m.body_doc AS "doc",
           m.file_type AS "fileType",
           m.file_size AS "fileSize",
           m.created_at AS "createdAt"
    FROM project_materials m
    JOIN client_projects p ON p.id = m.project_id
    WHERE m.project_id = ${projectId} AND p.client_id = ${clientId}
    ORDER BY m.created_at DESC, m.id
  `;

  return { ...project, materials };
}

/** The stored file behind one of the client's file materials, or null. */
export async function getMaterialFile(
  clientId: string,
  materialId: string,
): Promise<{ fileKey: string; fileType: string; title: string } | null> {
  if (!UUID.test(clientId) || !UUID.test(materialId)) return null;

  const rows = await db()<{ fileKey: string; fileType: string; title: string }[]>`
    SELECT m.file_key AS "fileKey",
           coalesce(m.file_type, 'application/octet-stream') AS "fileType",
           m.title
    FROM project_materials m
    JOIN client_projects p ON p.id = m.project_id
    WHERE m.id = ${materialId}
      AND p.client_id = ${clientId}
      AND m.kind = 'file'
      AND m.file_key IS NOT NULL
  `;
  return rows[0] ?? null;
}

const TIP_COLUMNS = {
  it: { title: 'title_it', body: 'body_it' },
  en: { title: 'title_en', body: 'body_en' },
  es: { title: 'title_es', body: 'body_es' },
} as const;

/**
 * Published tips, newest first, in the client's language.
 *
 * Tips are written in Italian first and translated when there is time, so a
 * missing translation is normal. Title and body each fall back to Italian on
 * their own: a tip translated halfway still reads, rather than disappearing or
 * showing a blank. Tips are not per client, so there is nothing to scope.
 */
export async function listTips(lang: 'it' | 'en' | 'es', limit = 5): Promise<Tip[]> {
  const cols = TIP_COLUMNS[lang] ?? TIP_COLUMNS.it;
  const sql = db();

  return sql<Tip[]>`
    SELECT id,
           coalesce(nullif(${sql(cols.title)}, ''), title_it, '') AS title,
           coalesce(nullif(${sql(cols.body)}, ''), body_it, '') AS body,
           zone,
           blog_slug AS "blogSlug"
    FROM area_tips
    WHERE published
    ORDER BY created_at DESC, id
    LIMIT ${limit}
  `;
}

/**
 * Admin side. Everything below is called only from admin server actions and
 * pages, which check `currentAdmin()` first; none of it is reachable with a
 * client session, so these functions take ids directly instead of a client id.
 * Ids still arrive from forms, so each is checked for uuid shape first.
 */

export const PROJECT_ZONES = [
  'armadio',
  'cucina',
  'bagno',
  'living',
  'trasloco',
  'garage',
] as const;

export const PROJECT_STATUSES = ['planned', 'in_progress', 'done'] as const;

type Lang = Client['lang'];
type Status = ProjectSummary['status'];

export type AdminClient = Client & {
  active: boolean;
  createdAt: Date;
  lastSeenAt: Date | null;
  projectCount: number;
};

export type AdminTip = {
  id: string;
  titleIt: string | null;
  titleEn: string | null;
  titleEs: string | null;
  bodyIt: string | null;
  bodyEn: string | null;
  bodyEs: string | null;
  zone: string | null;
  blogSlug: string | null;
  published: boolean;
  createdAt: Date;
};

/** Every client, newest first, with how many projects they have. */
export async function listClients(): Promise<AdminClient[]> {
  return db()<AdminClient[]>`
    SELECT c.id,
           c.email,
           c.name,
           c.lang,
           c.active,
           c.created_at AS "createdAt",
           c.last_seen_at AS "lastSeenAt",
           (SELECT count(*)::int FROM client_projects p WHERE p.client_id = c.id)
             AS "projectCount"
    FROM clients c
    ORDER BY c.created_at DESC, c.id
  `;
}

/** One client whether or not they are active, or null. */
export async function getClient(id: string): Promise<AdminClient | null> {
  if (!UUID.test(id)) return null;

  const rows = await db()<AdminClient[]>`
    SELECT c.id,
           c.email,
           c.name,
           c.lang,
           c.active,
           c.created_at AS "createdAt",
           c.last_seen_at AS "lastSeenAt",
           (SELECT count(*)::int FROM client_projects p WHERE p.client_id = c.id)
             AS "projectCount"
    FROM clients c
    WHERE c.id = ${id}
  `;
  return rows[0] ?? null;
}

/**
 * Adds a client. The address is stored trimmed and lowercased, which is what
 * the sign-in lookup compares against. An address that already exists, in any
 * casing, comes back as `{ error: 'duplicate' }` rather than a thrown
 * unique-violation, so the form can say so.
 */
export async function createClient(input: {
  email: string;
  name: string;
  lang: Lang;
}): Promise<{ client: Client } | { error: 'duplicate' }> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  const rows = await db()<Client[]>`
    INSERT INTO clients (email, name, lang)
    SELECT ${email}, ${name}, ${input.lang}
    WHERE NOT EXISTS (SELECT 1 FROM clients WHERE lower(email) = ${email})
    ON CONFLICT (email) DO NOTHING
    RETURNING id, email, name, lang
  `;
  return rows[0] ? { client: rows[0] } : { error: 'duplicate' };
}

/** Deactivating locks the client out on their next request; history stays. */
export async function setClientActive(id: string, active: boolean): Promise<boolean> {
  if (!UUID.test(id)) return false;

  const rows = await db()`UPDATE clients SET active = ${active} WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

/**
 * Deletes the client; their projects and materials go with them (ON DELETE
 * CASCADE). Returns the storage keys of their files so the caller can remove
 * the blobs: the rows are gone after this, and the keys are the only record
 * of what to delete.
 */
export async function deleteClient(id: string): Promise<string[]> {
  if (!UUID.test(id)) return [];

  const rows = await db()<{ fileKey: string }[]>`
    WITH keys AS (
      SELECT m.file_key
      FROM project_materials m
      JOIN client_projects p ON p.id = m.project_id
      WHERE p.client_id = ${id} AND m.file_key IS NOT NULL
    ),
    gone AS (
      DELETE FROM clients WHERE id = ${id} RETURNING id
    )
    SELECT keys.file_key AS "fileKey" FROM keys, gone
  `;
  return rows.map((r) => r.fileKey);
}

/** Creates a planned project for the client, or null if there is no such client. */
export async function createProject(
  clientId: string,
  input: {
    title: string;
    zone?: string | null;
    summary?: string | null;
    visitDate?: string | null;
  },
): Promise<ProjectSummary | null> {
  if (!UUID.test(clientId)) return null;

  const rows = await db()<ProjectSummary[]>`
    INSERT INTO client_projects (client_id, title, zone, summary, visit_date)
    SELECT c.id, ${input.title.trim()}, ${input.zone?.trim() || null}, ${input.summary?.trim() || null},
           ${input.visitDate || null}
    FROM clients c
    WHERE c.id = ${clientId}
    RETURNING id,
              title,
              zone,
              status,
              to_char(visit_date, 'YYYY-MM-DD') AS "visitDate",
              0 AS "materialCount"
  `;
  return rows[0] ?? null;
}

/** Changes a project's name, room, visit date and summary. */
export async function updateProject(
  projectId: string,
  input: { title: string; zone: string | null; summary: string | null; visitDate: string | null },
): Promise<boolean> {
  if (!UUID.test(projectId)) return false;

  const rows = await db()`
    UPDATE client_projects
       SET title = ${input.title.trim()},
           zone = ${input.zone?.trim() || null},
           summary = ${input.summary?.trim() || null},
           visit_date = ${input.visitDate || null},
           updated_at = now()
     WHERE id = ${projectId}
    RETURNING id
  `;
  return rows.length > 0;
}

/**
 * Deletes a project and its materials. Returns the owning client, so the
 * caller can go back to it, and the stored file keys, so their blobs can be
 * removed. Null when there was no such project.
 */
export async function deleteProject(
  projectId: string,
): Promise<{ clientId: string; fileKeys: string[] } | null> {
  if (!UUID.test(projectId)) return null;

  const rows = await db()<{ clientId: string; fileKeys: string[] }[]>`
    WITH keys AS (
      SELECT file_key FROM project_materials
       WHERE project_id = ${projectId} AND file_key IS NOT NULL
    ),
    gone AS (
      DELETE FROM client_projects WHERE id = ${projectId} RETURNING client_id
    )
    SELECT gone.client_id AS "clientId",
           coalesce((SELECT array_agg(file_key) FROM keys), '{}') AS "fileKeys"
      FROM gone
  `;
  return rows[0] ?? null;
}

export async function updateProjectStatus(projectId: string, status: Status): Promise<boolean> {
  if (!UUID.test(projectId) || !PROJECT_STATUSES.includes(status)) return false;

  const rows = await db()`
    UPDATE client_projects SET status = ${status}, updated_at = now()
    WHERE id = ${projectId}
    RETURNING id
  `;
  return rows.length > 0;
}

/** Whether a project with this id exists, for any client. Admin use only. */
export async function projectExists(projectId: string): Promise<boolean> {
  if (!UUID.test(projectId)) return false;

  const rows = await db()`SELECT 1 FROM client_projects WHERE id = ${projectId}`;
  return rows.length > 0;
}

export type NewMaterial =
  | { kind: 'note'; title: string; body: string; doc?: RichDoc | null }
  | { kind: 'link'; title: string; body: string }
  | { kind: 'file'; title: string; fileKey: string; fileType: string; fileSize: number };

/** Rewrites a note's title and text. Only notes: links and files are not edited here. */
export async function updateNote(
  materialId: string,
  input: { title: string; body: string; doc: RichDoc },
): Promise<boolean> {
  if (!UUID.test(materialId)) return false;
  const rows = await db()`
    UPDATE project_materials
       SET title = ${input.title.trim()}, body = ${input.body}, body_doc = ${db().json(input.doc as never)}
     WHERE id = ${materialId} AND kind = 'note'
    RETURNING id
  `;
  return rows.length > 0;
}

/** Adds a material to the project; null if the project does not exist. */
export async function addMaterial(
  projectId: string,
  input: NewMaterial,
): Promise<{ id: string } | null> {
  if (!UUID.test(projectId)) return null;

  const isFile = input.kind === 'file';
  const rows = await db()<{ id: string }[]>`
    INSERT INTO project_materials (project_id, kind, title, body, body_doc, file_key, file_type, file_size)
    SELECT p.id,
           ${input.kind},
           ${input.title.trim()},
           ${isFile ? null : input.body},
           ${input.kind === 'note' && input.doc ? db().json(input.doc as never) : null},
           ${isFile ? input.fileKey : null},
           ${isFile ? input.fileType : null},
           ${isFile ? input.fileSize : null}
    FROM client_projects p
    WHERE p.id = ${projectId}
    RETURNING id
  `;
  return rows[0] ?? null;
}

/**
 * Removes a material and returns its storage key (null for notes and links),
 * or null if there was no such material. The caller deletes the blob.
 */
export async function deleteMaterial(
  materialId: string,
): Promise<{ fileKey: string | null } | null> {
  if (!UUID.test(materialId)) return null;

  const rows = await db()<{ fileKey: string | null }[]>`
    DELETE FROM project_materials WHERE id = ${materialId} RETURNING file_key AS "fileKey"
  `;
  return rows[0] ?? null;
}

/** Every tip, published or not, newest first. */
export async function listAllTips(): Promise<AdminTip[]> {
  return db()<AdminTip[]>`
    SELECT id,
           title_it AS "titleIt", title_en AS "titleEn", title_es AS "titleEs",
           body_it AS "bodyIt", body_en AS "bodyEn", body_es AS "bodyEs",
           zone,
           blog_slug AS "blogSlug",
           published,
           created_at AS "createdAt"
    FROM area_tips
    ORDER BY created_at DESC, id
  `;
}

export type TipInput = {
  id?: string;
  titleIt: string;
  bodyIt: string;
  titleEn?: string | null;
  bodyEn?: string | null;
  titleEs?: string | null;
  bodyEs?: string | null;
  zone?: string | null;
  blogSlug?: string | null;
  published: boolean;
};

/**
 * Creates a tip, or updates the one with `id`. Italian title and body are
 * required: the client-facing queries fall back to them. The other languages
 * are optional and stored as null when blank.
 */
export async function upsertTip(
  input: TipInput,
): Promise<{ tip: AdminTip } | { error: 'required' | 'zone' | 'notfound' }> {
  const clean = (value: string | null | undefined) => value?.trim() || null;

  const titleIt = clean(input.titleIt);
  const bodyIt = clean(input.bodyIt);
  if (!titleIt || !bodyIt) return { error: 'required' };

  const zone = clean(input.zone);
  if (zone && !(PROJECT_ZONES as readonly string[]).includes(zone)) return { error: 'zone' };

  const values = {
    title_it: titleIt,
    body_it: bodyIt,
    title_en: clean(input.titleEn),
    body_en: clean(input.bodyEn),
    title_es: clean(input.titleEs),
    body_es: clean(input.bodyEs),
    zone,
    blog_slug: clean(input.blogSlug),
    published: input.published,
  };
  const sql = db();
  const returning = sql`
    id,
    title_it AS "titleIt", title_en AS "titleEn", title_es AS "titleEs",
    body_it AS "bodyIt", body_en AS "bodyEn", body_es AS "bodyEs",
    zone,
    blog_slug AS "blogSlug",
    published,
    created_at AS "createdAt"
  `;

  if (input.id !== undefined) {
    if (!UUID.test(input.id)) return { error: 'notfound' };
    const rows = await sql<AdminTip[]>`
      UPDATE area_tips SET ${sql(values)} WHERE id = ${input.id} RETURNING ${returning}
    `;
    return rows[0] ? { tip: rows[0] } : { error: 'notfound' };
  }

  const rows = await sql<AdminTip[]>`
    INSERT INTO area_tips ${sql(values)} RETURNING ${returning}
  `;
  return { tip: rows[0] };
}

export async function deleteTip(id: string): Promise<boolean> {
  if (!UUID.test(id)) return false;

  const rows = await db()`DELETE FROM area_tips WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

export async function setTipPublished(id: string, published: boolean): Promise<boolean> {
  if (!UUID.test(id)) return false;

  const rows = await db()`UPDATE area_tips SET published = ${published} WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}
