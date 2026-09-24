-- Migration 0002: Career Profile and structured facts
CREATE TABLE IF NOT EXISTS career_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  github_url TEXT,
  summary TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profile_experiences (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES career_profiles(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT,
  is_current INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profile_experience_facts (
  id TEXT PRIMARY KEY,
  experience_id TEXT NOT NULL REFERENCES profile_experiences(id) ON DELETE CASCADE,
  fact_text TEXT NOT NULL,
  fact_type TEXT DEFAULT 'achievement',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profile_education (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES career_profiles(id) ON DELETE CASCADE,
  institution TEXT NOT NULL,
  degree TEXT,
  field_of_study TEXT,
  start_date TEXT,
  end_date TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profile_skills (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES career_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_career_profiles_user_id ON career_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_experiences_profile_id ON profile_experiences(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_experience_facts_exp_id ON profile_experience_facts(experience_id);
CREATE INDEX IF NOT EXISTS idx_profile_education_profile_id ON profile_education(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_skills_profile_id ON profile_skills(profile_id);
