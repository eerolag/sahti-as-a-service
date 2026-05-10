import type { D1Database, D1PreparedStatement, D1QueryResult, D1RunResult } from "../../apps/api/src/env";

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

type AiRecognitionUsageRow = {
  identity_hash: string;
  usage_day: string;
  attempts: number;
  violations: number;
  locked_until: string | null;
  updated_at: string;
};

type UserRow = {
  id: number;
  email: string;
  created_at: string;
  last_login_at: string | null;
};

type LoginChallengeRow = {
  id: string;
  email: string;
  code_hash: string;
  salt: string;
  expires_at: string;
  consumed_at: string | null;
  attempts: number;
  created_at: string;
};

type SessionRow = {
  token_hash: string;
  user_id: number;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
};

type UserPlayerRow = {
  user_id: number;
  player_id: number;
  linked_at: string;
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
  private aiRecognitionUsage: AiRecognitionUsageRow[] = [];
  private users: UserRow[] = [];
  private loginChallenges: LoginChallengeRow[] = [];
  private sessions: SessionRow[] = [];
  private userPlayers: UserPlayerRow[] = [];

  private gameIdCounter = 1;
  private beerIdCounter = 1;
  private playerIdCounter = 1;
  private userIdCounter = 1;

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

    if (sql.startsWith("insert into login_challenges (id, email, code_hash, salt, expires_at, created_at) values (?, ?, ?, ?, ?, ?)")) {
      this.loginChallenges.push({
        id: String(values[0] ?? ""),
        email: String(values[1] ?? ""),
        code_hash: String(values[2] ?? ""),
        salt: String(values[3] ?? ""),
        expires_at: String(values[4] ?? ""),
        consumed_at: null,
        attempts: 0,
        created_at: String(values[5] ?? ""),
      });
      return { success: true, meta: {} };
    }

    if (sql.startsWith("update login_challenges set attempts = attempts + 1 where id = ?")) {
      const id = String(values[0] ?? "");
      const challenge = this.loginChallenges.find((row) => row.id === id);
      if (challenge) challenge.attempts += 1;
      return { success: true, meta: {} };
    }

    if (sql.startsWith("update login_challenges set consumed_at = ? where id = ?")) {
      const consumedAt = String(values[0] ?? "");
      const id = String(values[1] ?? "");
      const challenge = this.loginChallenges.find((row) => row.id === id);
      if (challenge) challenge.consumed_at = consumedAt;
      return { success: true, meta: {} };
    }

    if (sql.startsWith("insert into users (email, created_at, last_login_at) values (?, ?, ?) on conflict(email) do update set last_login_at = excluded.last_login_at")) {
      const email = String(values[0] ?? "");
      const createdAt = String(values[1] ?? "");
      const lastLoginAt = String(values[2] ?? "");
      const existing = this.users.find((row) => row.email === email);
      if (existing) {
        existing.last_login_at = lastLoginAt;
      } else {
        this.users.push({
          id: this.userIdCounter++,
          email,
          created_at: createdAt,
          last_login_at: lastLoginAt,
        });
      }
      return { success: true, meta: {} };
    }

    if (sql.startsWith("insert into sessions (token_hash, user_id, created_at, expires_at) values (?, ?, ?, ?)")) {
      this.sessions.push({
        token_hash: String(values[0] ?? ""),
        user_id: Number(values[1]),
        created_at: String(values[2] ?? ""),
        expires_at: String(values[3] ?? ""),
        revoked_at: null,
      });
      return { success: true, meta: {} };
    }

    if (sql.startsWith("update sessions set revoked_at = ? where token_hash = ?")) {
      const revokedAt = String(values[0] ?? "");
      const tokenHash = String(values[1] ?? "");
      for (const session of this.sessions) {
        if (session.token_hash === tokenHash) {
          session.revoked_at = revokedAt;
        }
      }
      return { success: true, meta: {} };
    }

    if (
      sql.startsWith("insert or ignore into user_players (user_id, player_id, linked_at) select ?, p.id, ? from players p")
    ) {
      const userId = Number(values[0]);
      const linkedAt = String(values[1] ?? "");
      const clientId = String(values[2] ?? "");
      for (const player of this.players.filter((row) => row.client_id === clientId)) {
        const hasAccountPlayerForGame = this.userPlayers.some((link) => {
          if (link.user_id !== userId) return false;
          const existing = this.players.find((row) => row.id === link.player_id);
          return existing?.game_id === player.game_id;
        });
        if (hasAccountPlayerForGame) continue;
        const exists = this.userPlayers.some((link) => link.user_id === userId && link.player_id === player.id);
        if (!exists) {
          this.userPlayers.push({ user_id: userId, player_id: player.id, linked_at: linkedAt });
        }
      }
      return { success: true, meta: {} };
    }

    if (sql.startsWith("insert or ignore into user_players (user_id, player_id, linked_at) values (?, ?, ?)")) {
      const userId = Number(values[0]);
      const playerId = Number(values[1]);
      const linkedAt = String(values[2] ?? "");
      const exists = this.userPlayers.some((link) => link.user_id === userId && link.player_id === playerId);
      if (!exists) {
        this.userPlayers.push({ user_id: userId, player_id: playerId, linked_at: linkedAt });
      }
      return { success: true, meta: {} };
    }

    if (sql.startsWith("delete from players where id in")) {
      const userId = Number(values[0]);
      const playerIds = new Set(
        this.userPlayers.filter((link) => link.user_id === userId).map((link) => link.player_id),
      );
      this.players = this.players.filter((row) => !playerIds.has(row.id));
      this.ratings = this.ratings.filter((row) => !playerIds.has(row.player_id));
      this.userPlayers = this.userPlayers.filter((link) => !playerIds.has(link.player_id));
      return { success: true, meta: {} };
    }

    if (sql.startsWith("delete from users where id = ?")) {
      const userId = Number(values[0]);
      this.users = this.users.filter((row) => row.id !== userId);
      this.sessions = this.sessions.filter((row) => row.user_id !== userId);
      this.userPlayers = this.userPlayers.filter((row) => row.user_id !== userId);
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

    if (
      sql.startsWith("insert into ai_recognition_usage") &&
      sql.includes("violations = ai_recognition_usage.violations + 1")
    ) {
      const [identityHash, usageDay, threshold, lockedUntil] = values;
      const hash = String(identityHash ?? "");
      const day = String(usageDay ?? "");
      let row = this.aiRecognitionUsage.find((item) => item.identity_hash === hash && item.usage_day === day);

      if (!row) {
        row = {
          identity_hash: hash,
          usage_day: day,
          attempts: 0,
          violations: 1,
          locked_until: null,
          updated_at: now(),
        };
        this.aiRecognitionUsage.push(row);
      } else {
        row.violations += 1;
        row.updated_at = now();
      }

      if (row.violations >= Number(threshold)) {
        row.locked_until = String(lockedUntil ?? "");
      }

      return { success: true, meta: {} };
    }

    if (
      sql.startsWith("insert into ai_recognition_usage") &&
      sql.includes("attempts = ai_recognition_usage.attempts + 1")
    ) {
      const [identityHash, usageDay] = values;
      const hash = String(identityHash ?? "");
      const day = String(usageDay ?? "");
      const row = this.aiRecognitionUsage.find((item) => item.identity_hash === hash && item.usage_day === day);

      if (row) {
        row.attempts += 1;
        row.updated_at = now();
      } else {
        this.aiRecognitionUsage.push({
          identity_hash: hash,
          usage_day: day,
          attempts: 1,
          violations: 0,
          locked_until: null,
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

    if (sql.startsWith("select count(*) as c from login_challenges where email = ? and created_at >= ?")) {
      const email = String(values[0] ?? "");
      const createdAfter = String(values[1] ?? "");
      const count = this.loginChallenges.filter(
        (row) => row.email === email && row.created_at >= createdAfter,
      ).length;
      return { c: count };
    }

    if (
      sql.startsWith(
        "select id, email, code_hash as codehash, salt, expires_at as expiresat, attempts from login_challenges",
      )
    ) {
      const email = String(values[0] ?? "");
      const nowIso = String(values[1] ?? "");
      const row = this.loginChallenges
        .filter((item) => item.email === email && item.consumed_at == null && item.expires_at > nowIso)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      if (!row) return null;
      return {
        id: row.id,
        email: row.email,
        codeHash: row.code_hash,
        salt: row.salt,
        expiresAt: row.expires_at,
        attempts: row.attempts,
      };
    }

    if (sql.startsWith("select id, email from users where email = ?")) {
      const email = String(values[0] ?? "");
      const user = this.users.find((row) => row.email === email);
      return user ? { id: user.id, email: user.email } : null;
    }

    if (
      sql.startsWith("select u.id as id, u.email as email from sessions s inner join users u on u.id = s.user_id")
    ) {
      const tokenHash = String(values[0] ?? "");
      const nowIso = String(values[1] ?? "");
      const session = this.sessions.find(
        (row) => row.token_hash === tokenHash && row.revoked_at == null && row.expires_at > nowIso,
      );
      if (!session) return null;
      const user = this.users.find((row) => row.id === session.user_id);
      return user ? { id: user.id, email: user.email } : null;
    }

    if (
      sql.startsWith("select p.id as id from user_players up inner join players p on p.id = up.player_id")
    ) {
      const userId = Number(values[0]);
      const gameId = Number(values[1]);
      const linked = this.userPlayers
        .filter((link) => link.user_id === userId)
        .map((link) => ({
          link,
          player: this.players.find((player) => player.id === link.player_id) ?? null,
        }))
        .filter((item) => item.player?.game_id === gameId)
        .sort((a, b) => a.link.linked_at.localeCompare(b.link.linked_at) || a.link.player_id - b.link.player_id)[0];
      return linked?.player ? { id: linked.player.id } : null;
    }

    if (
      sql.startsWith(
        "select attempts, violations, locked_until from ai_recognition_usage where identity_hash = ? and usage_day = ?",
      )
    ) {
      const hash = String(values[0] ?? "");
      const day = String(values[1] ?? "");
      const row = this.aiRecognitionUsage.find((item) => item.identity_hash === hash && item.usage_day === day);
      if (!row) return null;
      return {
        attempts: row.attempts,
        violations: row.violations,
        locked_until: row.locked_until,
      };
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

    if (sql.includes("from ratings r") && sql.includes("inner join user_players up")) {
      const userId = Number(values[0]);
      const gameId = Number(values[1]);
      const gameId2 = Number(values[2]);
      if (gameId !== gameId2) return { results: [] };

      const linkedPlayerIds = new Set(
        this.userPlayers.filter((link) => link.user_id === userId).map((link) => link.player_id),
      );
      const ratings = this.ratings
        .filter((r) => r.game_id === gameId && linkedPlayerIds.has(r.player_id))
        .sort((a, b) => a.beer_id - b.beer_id)
        .map((r) => ({ beerId: r.beer_id, score: r.score, comment: r.comment }));

      return { results: ratings };
    }

    if (sql.includes("from user_players up") && sql.includes("count(r.beer_id) as ratingscount")) {
      const userId = Number(values[0]);
      const byGame = new Map<number, { game: GameRow; ratingsCount: number; updatedAt: string | null }>();

      for (const link of this.userPlayers.filter((row) => row.user_id === userId)) {
        const player = this.players.find((row) => row.id === link.player_id);
        if (!player) continue;
        const game = this.games.find((row) => row.id === player.game_id);
        if (!game) continue;
        const playerRatings = this.ratings.filter((row) => row.player_id === player.id && row.game_id === player.game_id);
        const existing = byGame.get(game.id) ?? { game, ratingsCount: 0, updatedAt: null };
        existing.ratingsCount += playerRatings.length;
        for (const rating of playerRatings) {
          if (!existing.updatedAt || rating.updated_at > existing.updatedAt) {
            existing.updatedAt = rating.updated_at;
          }
        }
        byGame.set(game.id, existing);
      }

      return {
        results: Array.from(byGame.values())
          .filter((row) => row.ratingsCount > 0)
          .sort((a, b) => {
            const dateCompare = String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""));
            return dateCompare || b.game.id - a.game.id;
          })
          .map((row) => ({
            gameId: row.game.id,
            gameName: row.game.name,
            ratingsCount: row.ratingsCount,
            updatedAt: row.updatedAt,
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

    if (sql.startsWith("select nickname from players where game_id = ? order by created_at asc, id asc")) {
      const gameId = Number(values[0]);
      return {
        results: this.players
          .filter((row) => row.game_id === gameId)
          .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id)
          .map((row) => ({
            nickname: row.nickname,
          })),
      };
    }

    throw new Error(`Unsupported all SQL: ${sqlRaw}`);
  }
}
