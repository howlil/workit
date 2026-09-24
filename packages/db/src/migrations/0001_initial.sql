-- Initial migration for Workit D1 database

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_provider TEXT,
  source_job_id TEXT,
  canonical_url TEXT NOT NULL,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT,
  work_arrangement TEXT,
  employment_type TEXT,
  state TEXT NOT NULL DEFAULT 'saved',
  current_snapshot_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_snapshots (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT,
  employment_type TEXT,
  work_arrangement TEXT,
  description_text TEXT NOT NULL,
  description_html TEXT,
  source_url TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  content_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_opportunities_user_id ON opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_canonical_url ON opportunities(user_id, canonical_url);
CREATE INDEX IF NOT EXISTS idx_opportunities_source ON opportunities(user_id, source_provider, source_job_id);
CREATE INDEX IF NOT EXISTS idx_job_snapshots_opportunity_id ON job_snapshots(opportunity_id);
