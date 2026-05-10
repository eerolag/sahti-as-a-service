CREATE TABLE IF NOT EXISTS ai_recognition_usage (
  identity_hash TEXT NOT NULL,
  usage_day TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  violations INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (identity_hash, usage_day)
);

CREATE INDEX IF NOT EXISTS idx_ai_recognition_usage_locked_until ON ai_recognition_usage(locked_until);
