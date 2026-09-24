-- 0005_resume_artifacts.sql
-- Workit: Stored resume artifacts (raw text & metadata)

CREATE TABLE IF NOT EXISTS resume_artifacts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  raw_text TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_resume_artifacts_user_created
  ON resume_artifacts(user_id, created_at DESC);
