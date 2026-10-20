-- Up Migration
-- One stored file backs one material. Without this, attaching the same upload
-- twice makes two rows share a key, and deleting either one removes the blob
-- the other still points to.

CREATE UNIQUE INDEX IF NOT EXISTS project_materials_file_key_uniq
  ON project_materials (file_key)
  WHERE file_key IS NOT NULL;

-- Down Migration

DROP INDEX IF EXISTS project_materials_file_key_uniq;
