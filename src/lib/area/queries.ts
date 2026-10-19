import { db } from '@/lib/reviews/db';

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
