PRAGMA foreign_keys = ON;

ALTER TABLE games ADD COLUMN public_id TEXT;
ALTER TABLE games ADD COLUMN creator_token_hash TEXT;
ALTER TABLE games ADD COLUMN rating_mode TEXT NOT NULL DEFAULT 'slider';
ALTER TABLE games ADD COLUMN score_min REAL NOT NULL DEFAULT 0;
ALTER TABLE games ADD COLUMN score_max REAL NOT NULL DEFAULT 10;
ALTER TABLE games ADD COLUMN score_step REAL NOT NULL DEFAULT 0.25;
ALTER TABLE games ADD COLUMN results_visibility TEXT NOT NULL DEFAULT 'live';
ALTER TABLE games ADD COLUMN results_revealed_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_games_public_id ON games(public_id);

CREATE TABLE IF NOT EXISTS content_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  reason TEXT NOT NULL,
  details TEXT,
  client_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_content_reports_game_id ON content_reports(game_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_created_at ON content_reports(created_at);
