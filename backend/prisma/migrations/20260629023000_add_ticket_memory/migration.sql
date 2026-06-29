CREATE TABLE IF NOT EXISTS ticket_memory (
  id TEXT PRIMARY KEY,
  workflow_run_id TEXT NOT NULL UNIQUE,
  ticket_id TEXT NOT NULL,
  repository_id TEXT,
  title TEXT NOT NULL,
  description_summary TEXT NOT NULL,
  affected_feature TEXT,
  fix_title TEXT,
  fix_approach TEXT,
  priority_level TEXT,
  mentor_decision TEXT,
  resolved_files TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL,
  embedding vector,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_memory_repository_idx
  ON ticket_memory (repository_id);

CREATE INDEX IF NOT EXISTS ticket_memory_status_idx
  ON ticket_memory (status);
