-- Up Migration
-- Private client area: who the clients are, what we are doing for them, and
-- what we have left in their folder.
--
-- Clients do not choose a password. They sign in with an emailed link (an
-- auth_tokens row with purpose 'client_signin'), and an admin creates the
-- client row, so there is no public sign-up to abuse.

CREATE TABLE IF NOT EXISTS clients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stored lowercased by the caller; the sign-in lookup compares lowercased.
  email        text        NOT NULL UNIQUE,
  name         text        NOT NULL,
  lang         text        NOT NULL DEFAULT 'it' CHECK (lang IN ('it', 'en', 'es')),
  -- Deactivating locks a client out on their next request without deleting
  -- their history.
  active       boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz
);

CREATE TABLE IF NOT EXISTS client_projects (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  uuid        NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  title      text        NOT NULL,
  -- The quote wizard's zones.
  zone       text        CHECK (zone IN ('armadio', 'cucina', 'bagno', 'living', 'trasloco', 'garage')),
  status     text        NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'done')),
  summary    text,
  visit_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_projects_client_idx ON client_projects (client_id);

CREATE TABLE IF NOT EXISTS project_materials (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid        NOT NULL REFERENCES client_projects (id) ON DELETE CASCADE,
  kind       text        NOT NULL CHECK (kind IN ('file', 'note', 'link')),
  title      text        NOT NULL,
  -- The note text, or the link's URL.
  body       text,
  file_key   text,
  file_type  text,
  file_size  integer,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT file_needs_key  CHECK (kind <> 'file' OR file_key IS NOT NULL),
  CONSTRAINT link_needs_url  CHECK (kind <> 'link' OR body IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS project_materials_project_idx ON project_materials (project_id);

CREATE TABLE IF NOT EXISTS area_tips (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_it   text,
  title_en   text,
  title_es   text,
  body_it    text,
  body_en    text,
  body_es    text,
  zone       text,
  blog_slug  text,
  published  boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- The sign-in link for a client is its own purpose, so an admin or review
-- decision token can never be redeemed as a client session.
ALTER TABLE auth_tokens DROP CONSTRAINT IF EXISTS auth_tokens_purpose_check;
ALTER TABLE auth_tokens
  ADD CONSTRAINT auth_tokens_purpose_check
  CHECK (purpose IN ('signin', 'decision', 'client_signin'));

-- Down Migration

-- Rows with the new purpose would violate the restored check.
DELETE FROM auth_tokens WHERE purpose = 'client_signin';
ALTER TABLE auth_tokens DROP CONSTRAINT IF EXISTS auth_tokens_purpose_check;
ALTER TABLE auth_tokens
  ADD CONSTRAINT auth_tokens_purpose_check
  CHECK (purpose IN ('signin', 'decision'));

DROP TABLE IF EXISTS area_tips;
DROP TABLE IF EXISTS project_materials;
DROP TABLE IF EXISTS client_projects;
DROP TABLE IF EXISTS clients;
