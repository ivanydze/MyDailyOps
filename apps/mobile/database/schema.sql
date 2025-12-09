-- SQLite schema for tasks table with recurring tasks support
-- This is the reference schema. The actual migration happens in init.ts

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  priority TEXT,
  deadline TEXT,
  status TEXT DEFAULT 'pending',
  pinned INTEGER DEFAULT 0,
  -- Recurring fields
  recurring INTEGER DEFAULT 0,
  recurring_type TEXT,
  recurring_interval_days INTEGER,
  recurring_weekday INTEGER,
  recurring_day_of_month INTEGER,
  last_generated_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
