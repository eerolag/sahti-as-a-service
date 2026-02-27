PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS beers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_beers_game_id ON beers(game_id);

CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  client_id TEXT NOT NULL,
  nickname TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (game_id, client_id),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_players_game_id ON players(game_id);

CREATE TABLE IF NOT EXISTS ratings (
  game_id INTEGER NOT NULL,
  beer_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  score REAL NOT NULL CHECK(score >= 0 AND score <= 10),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (game_id, beer_id, player_id),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (beer_id) REFERENCES beers(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ratings_game_id ON ratings(game_id);
CREATE INDEX IF NOT EXISTS idx_ratings_beer_id ON ratings(beer_id);