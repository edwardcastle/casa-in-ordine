-- Up Migration

-- Formatted notes. The editor's document is kept as written, already cleaned
-- to the allowed elements; `body` keeps the note's plain text alongside it,
-- so older notes (which have no document) and plain-text uses keep working.

ALTER TABLE project_materials ADD COLUMN IF NOT EXISTS body_doc jsonb;

-- Down Migration

ALTER TABLE project_materials DROP COLUMN IF EXISTS body_doc;
