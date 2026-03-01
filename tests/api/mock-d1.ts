import type { D1Database, D1PreparedStatement, D1QueryResult, D1RunResult } from "../../src/worker/env";

type AnyRow = Record<string, any>;

type GameRow = {
  id: number;
  name: string;
  created_at: string;
};

type BeerRow = {
  id: number;
  game_id: number;
  name: string;
  image_url: string | null;
  sort_order: number;
  untappd_url: string | null;
  untappd_source: string | null;
  untappd_confidence: number | null;
  untappd_resolved_at: string | null;
  created_at: string;
};

type PlayerRow = {
  id: number;
  game_id: number;
  client_id: string;
  nickname: string | null;
  created_at: string;
};

type RatingRow = {
  game_id: number;
  beer_id: number;
  player_id: number;
  score: number;
  comment: string | null;
  updated_at: string;
};

function now(): string {
  return new Date().toISOString();
}

function normalizeSql(input: string): string {
  return input.replace(/\s+/g, " ").trim().toLowerCase();
}

class MockPreparedStatement implements D1PreparedStatement {
  private readonly db: MockD1Database;
  private readonly sql: string;
  private readonly values: unknown[];

  constructor(db: MockD1Database, sql: string, values: unknown[] = []) {
    this.db = db;
    this.sql = sql;
    this.values = values;
  }

  bind(...values: unknown[]): D1PreparedStatement {
    return new MockPreparedStatement(this.db, this.sql, values);
  }

  run<T = Record<string, unknown>>(): Promise<D1RunResult & T> {
    return this.db.executeRun(this.sql, this.values) as Promise<D1RunResult & T>;
  }

  first<T = Record<string, unknown>>(): Promise<T | null> {
    return this.db.executeFirst(this.sql, this.values) as Promise<T | null>;
  }

  all<T = Record<string, unknown>>(): Promise<D1QueryResult<T>> {
    return this.db.executeAll(this.sql, this.values) as Promise<D1QueryResult<T>>;
  }
}

export class MockD1Database implements D1Database {
  private games: GameRow[] = [];
  private beers: BeerRow[] = [];
  private players: PlayerRow[] = [];
  private ratings: RatingRow[] = [];

  private gameIdCounter = 1;
  private beerIdCounter = 1;
  private playerIdCounter = 1;

  prepare(query: string): D1PreparedStatement {
    return new MockPreparedStatement(this, query);
  }

  getPlayer(gameId: number, clientId: string): { id: number; nickname: string | null } | null {
    const player = this.players.find((row) => row.game_id === gameId && row.client_id === clientId);
    if (!player) return null;
    return { id: player.id, nickname: player.nickname };
  }

  async batch(statements: D1PreparedStatement[]): Promise<unknown[]> {
    const result: unknown[] = [];
    for (const statement of statements) {
      result.push(await statement.run());
    }
    return result;
  }

  async executeRun(sqlRaw: string, values: unknown[]): Promise<D1RunResult> {
    const sql = normalizeSql(sqlRaw);

    if (sql.startsWith("insert into games (name) values (?)")) {
      const name = String(values[0] ?? "");
      const row: GameRow = { id: this.gameIdCounter++, name, created_at: now() };
      this.games.push(row);
      return { success: true, meta: { last_row_id: row.id } };
    }

    if (sql.startsWith("update games set name = ? where id = ?")) {
      const name = String(values[0] ?? "");
      const gameId = Number(values[1]);
      const game = this.games.find((g) => g.id === gameId);
      if (game) game.name = name;
      return { success: true, meta: {} };
    }

    if (sql.startsWith("insert into beers (game_id, name, image_url, sort_order, untappd_url, untappd_source, untappd_confidence, untappd_resolved_at) values (?, ?, ?, ?, ?, ?, ?, ?)")) {
      const [game_id, name, image_url, sort_order, untappd_url, untappd_source, untappd_confidence, untappd_resolved_at] = values;
      const row: BeerRow = {
        id: this.beerIdCounter++,
        game_id: Number(game_id),
        name: String(name ?? ""),
        image_url: image_url == null ? null : String(image_url),
        sort_order: Number(sort_order),
        untappd_url: untappd_url == null ? null : String(untappd_url),
        untappd_source: untappd_source == null ? null : String(untappd_source),
        untappd_confidence: untappd_confidence == null ? null : Number(untappd_confidence),
        untappd_resolved_at: untappd_resolved_at == null ? null : String(untappd_resolved_at),
        created_at: now(),
      };
      this.beers.push(row);
      return { success: true, meta: { last_row_id: row.id } };
    }

    if (sql.startsWith("update beers set name = ?, image_url = ?, sort_order = ?, untappd_url = ?, untappd_source = ?, untappd_confidence = ?, untappd_resolved_at = ? where game_id = ? and id = ?")) {
      const [name, image_url, sort_order, untappd_url, untappd_source, untappd_confidence, untappd_resolved_at, game_id, id] = values;
      const row = this.beers.find((b) => b.game_id === Number(game_id) && b.id === Number(id));
      if (row) {
        row.name = String(name ?? "");
        row.image_url = image_url == null ? null : String(image_url);
        row.sort_order = Number(sort_order);
        row.untappd_url = untappd_url == null ? null : String(untappd_url);
        row.untappd_source = untappd_source == null ? null : String(untappd_source);
        row.untappd_confidence = untappd_confidence == null ? null : Number(untappd_confidence);
        row.untappd_resolved_at = untappd_resolved_at == null ? null : String(untappd_resolved_at);
      }
      return { success: true, meta: {} };
    }

    if (sql.startsWith("delete from beers where game_id = ? and id = ?")) {
      const gameId = Number(values[0]);
      const beerId = Number(values[1]);
      this.beers = this.beers.filter((row) => !(row.game_id === gameId && row.id === beerId));
      this.ratings = this.ratings.filter((row) => !(row.game_id === gameId && row.beer_id === beerId));
      return { success: true, meta: {} };
    }

    if (sql.startsWith("update beers set untappd_url = ?, untappd_source = ?, untappd_confidence = ?, untappd_resolved_at = ? where game_id = ? and id = ?")) {
      const [untappd_url, untappd_source, untappd_confidence, untappd_resolved_at, game_id, id] = values;
      const row = this.beers.find((b) => b.game_id === Number(game_id) && b.id === Number(id));
      if (row) {
        row.untappd_url = untappd_url == null ? null : String(untappd_url);
        row.untappd_source = untappd_source == null ? null : String(untappd_source);
        row.untappd_confidence = untappd_confidence == null ? null : Number(untappd_confidence);
        row.untappd_resolved_at = untappd_resolved_at == null ? null : String(untappd_resolved_at);
      }
      return { success: true, meta: {} };
    }

    if (sql.startsWith("insert or ignore into players (game_id, client_id, nickname) values (?, ?, ?)")) {
      const gameId = Number(values[0]);
      const clientId = String(values[1] ?? "");
      const nicknameRaw = String(values[2] ?? "").trim();
      const nickname = nicknameRaw || null;
      const exists = this.players.some((p) => p.game_id === gameId && p.client_id === clientId);
      if (!exists) {
        this.players.push({
          id: this.playerIdCounter++,
          game_id: gameId,
          client_id: clientId,
          nickname,
          created_at: now(),
        });
      }
      return { success: true, meta: {} };
    }

    if (sql.startsWith("insert or ignore into players (game_id, client_id) values (?, ?)")) {
      const gameId = Number(values[0]);
      const clientId = String(values[1] ?? "");
      const exists = this.players.some((p) => p.game_id === gameId && p.client_id === clientId);
      if (!exists) {
        this.players.push({
          id: this.playerIdCounter++,
          game_id: gameId,
          client_id: clientId,
          nickname: null,
          created_at: now(),
        });
      }
      return { success: true, meta: {} };
    }

    if (sql.startsWith("update players set nickname = ? where id = ?")) {
      const nicknameRaw = String(values[0] ?? "").trim();
      const nickname = nicknameRaw || null;
      const playerId = Number(values[1]);
      const player = this.players.find((row) => row.id === playerId);
      if (player) {
        player.nickname = nickname;
      }
      return { success: true, meta: {} };
    }

    if (sql.startsWith("insert into ratings (game_id, beer_id, player_id, score, comment, updated_at) values (?, ?, ?, ?, ?, datetime('now')) on conflict(game_id, beer_id, player_id) do update set score = excluded.score, comment = excluded.comment, updated_at = datetime('now')")) {
      const gameId = Number(values[0]);
      const beerId = Number(values[1]);
      const playerId = Number(values[2]);
      const score = Number(values[3]);
      const comment = values[4] == null ? null : String(values[4]);

      const existing = this.ratings.find(
        (r) => r.game_id === gameId && r.beer_id === beerId && r.player_id === playerId,
      );
      if (existing) {
        existing.score = score;
        existing.comment = comment;
        existing.updated_at = now();
      } else {
        this.ratings.push({
          game_id: gameId,
          beer_id: beerId,
          player_id: playerId,
          score,
          comment,
          updated_at: now(),
        });
      }

      return { success: true, meta: {} };
    }

    throw new Error(`Unsupported run SQL: ${sqlRaw}`);
  }

  async executeFirst(sqlRaw: string, values: unknown[]): Promise<AnyRow | null> {
    const sql = normalizeSql(sqlRaw);

    if (sql.startsWith("select id, name, created_at from games where id = ?")) {
      const game = this.games.find((row) => row.id === Number(values[0]));
      return game ?? null;
    }

    if (sql.startsWith("select id from games where id = ?")) {
      const game = this.games.find((row) => row.id === Number(values[0]));
      return game ? { id: game.id } : null;
    }

    if (sql.startsWith("select id from players where game_id = ? and client_id = ?")) {
      const gameId = Number(values[0]);
      const clientId = String(values[1] ?? "");
      const player = this.players.find((row) => row.game_id === gameId && row.client_id === clientId);
      return player ? { id: player.id } : null;
    }

    if (sql.startsWith("select id, nickname from players where game_id = ? and client_id = ?")) {
      const gameId = Number(values[0]);
      const clientId = String(values[1] ?? "");
      const player = this.players.find((row) => row.game_id === gameId && row.client_id === clientId);
      return player ? { id: player.id, nickname: player.nickname } : null;
    }

    if (sql.startsWith("select count(*) as c from players where game_id = ?")) {
      const gameId = Number(values[0]);
      const count = this.players.filter((row) => row.game_id === gameId).length;
      return { c: count };
    }

    throw new Error(`Unsupported first SQL: ${sqlRaw}`);
  }

  async executeAll(sqlRaw: string, values: unknown[]): Promise<D1QueryResult<AnyRow>> {
    const sql = normalizeSql(sqlRaw);

    if (sql.startsWith("select id, name, image_url, sort_order, untappd_url, untappd_source, untappd_confidence, untappd_resolved_at from beers where game_id = ? order by sort_order asc, id asc")) {
      const gameId = Number(values[0]);
      return {
        results: this.beers
          .filter((row) => row.game_id === gameId)
          .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
          .map((row) => ({
            id: row.id,
            name: row.name,
            image_url: row.image_url,
            sort_order: row.sort_order,
            untappd_url: row.untappd_url,
            untappd_source: row.untappd_source,
            untappd_confidence: row.untappd_confidence,
            untappd_resolved_at: row.untappd_resolved_at,
          })),
      };
    }

    if (sql.startsWith("select id from beers where game_id = ? order by sort_order asc, id asc")) {
      const gameId = Number(values[0]);
      return {
        results: this.beers
          .filter((row) => row.game_id === gameId)
          .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
          .map((row) => ({ id: row.id })),
      };
    }

    if (sql.startsWith("select id, name, untappd_url, untappd_source, untappd_resolved_at from beers where game_id = ?")) {
      const gameId = Number(values[0]);
      return {
        results: this.beers
          .filter((row) => row.game_id === gameId)
          .map((row) => ({
            id: row.id,
            name: row.name,
            untappd_url: row.untappd_url,
            untappd_source: row.untappd_source,
            untappd_resolved_at: row.untappd_resolved_at,
          })),
      };
    }

    if (sql.includes("from ratings r") && sql.includes("inner join players p") && sql.includes("p.client_id = ?")) {
      const gameId = Number(values[0]);
      const gameId2 = Number(values[1]);
      const clientId = String(values[2] ?? "");
      if (gameId !== gameId2) {
        return { results: [] };
      }

      const player = this.players.find((p) => p.game_id === gameId && p.client_id === clientId);
      if (!player) return { results: [] };

      const ratings = this.ratings
        .filter((r) => r.game_id === gameId && r.player_id === player.id)
        .sort((a, b) => a.beer_id - b.beer_id)
        .map((r) => ({ beerId: r.beer_id, score: r.score, comment: r.comment }));

      return { results: ratings };
    }

    if (sql.includes("round(coalesce(avg(r.score), 0), 2) as avg_score") && sql.includes("from beers b")) {
      const gameId = Number(values[0]);
      const beers = this.beers
        .filter((b) => b.game_id === gameId)
        .map((beer) => {
          const beerRatings = this.ratings.filter((r) => r.game_id === gameId && r.beer_id === beer.id);
          const avg = beerRatings.length
            ? Math.round((beerRatings.reduce((sum, r) => sum + r.score, 0) / beerRatings.length) * 100) / 100
            : 0;

          return {
            id: beer.id,
            name: beer.name,
            image_url: beer.image_url,
            untappd_url: beer.untappd_url,
            untappd_source: beer.untappd_source,
            untappd_confidence: beer.untappd_confidence,
            untappd_resolved_at: beer.untappd_resolved_at,
            sort_order: beer.sort_order,
            avg_score: avg,
            rating_count: beerRatings.length,
          };
        })
        .sort((a, b) => b.avg_score - a.avg_score || a.sort_order - b.sort_order || a.id - b.id);

      return { results: beers };
    }

    throw new Error(`Unsupported all SQL: ${sqlRaw}`);
  }
}
