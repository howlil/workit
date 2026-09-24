-- 0003_application_lifecycle.sql
-- Workit: Application Lifecycle, State Transitions, Historical Snapshots, Submitted Answers

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  state TEXT NOT NULL,
  started_at TEXT NOT NULL,
  submitted_at TEXT,
  submitted_job_snapshot_id TEXT REFERENCES job_snapshots(id),
  submitted_resume_artifact_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_applications_user_opp
  ON applications(user_id, opportunity_id);

CREATE INDEX IF NOT EXISTS idx_applications_user_state
  ON applications(user_id, state);

CREATE TABLE IF NOT EXISTS application_events (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_application_events_app_time
  ON application_events(application_id, timestamp);

CREATE TABLE IF NOT EXISTS submitted_answers (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submitted_answers_app
  ON submitted_answers(application_id);
