-- 0004_answer_memory.sql
-- Workit: Answer Memory for custom employer questions and reusable past answers

CREATE TABLE IF NOT EXISTS answer_memories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  question_key TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  category TEXT,
  usage_count INTEGER NOT NULL DEFAULT 1,
  last_used_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_answer_memories_user_key
  ON answer_memories(user_id, question_key);

CREATE INDEX IF NOT EXISTS idx_answer_memories_user_last_used
  ON answer_memories(user_id, last_used_at DESC);
