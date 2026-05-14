import type { AccountHistoryItemDto, AccountUserDto } from "@breview/shared/api-contracts";
import type { Env } from "../env";

export interface LoginChallengeRow {
  id: string;
  email: string;
  codeHash: string;
  salt: string;
  expiresAt: string;
  attempts: number;
}

export async function countRecentLoginChallenges(
  env: Env,
  email: string,
  createdAfter: string,
): Promise<number> {
  const row = await env.DB.prepare(`
    SELECT COUNT(*) AS c
    FROM login_challenges
    WHERE email = ?
      AND created_at >= ?
  `)
    .bind(email, createdAfter)
    .first<{ c: number }>();

  return Number(row?.c ?? 0);
}

export async function insertLoginChallenge(
  env: Env,
  challenge: {
    id: string;
    email: string;
    codeHash: string;
    salt: string;
    expiresAt: string;
    createdAt: string;
  },
): Promise<void> {
  await env.DB.prepare(`
    INSERT INTO login_challenges (id, email, code_hash, salt, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
    .bind(
      challenge.id,
      challenge.email,
      challenge.codeHash,
      challenge.salt,
      challenge.expiresAt,
      challenge.createdAt,
    )
    .run();
}

export async function getLatestValidLoginChallenge(
  env: Env,
  email: string,
  nowIso: string,
): Promise<LoginChallengeRow | null> {
  const row = await env.DB.prepare(`
    SELECT
      id,
      email,
      code_hash AS codeHash,
      salt,
      expires_at AS expiresAt,
      attempts
    FROM login_challenges
    WHERE email = ?
      AND consumed_at IS NULL
      AND expires_at > ?
    ORDER BY created_at DESC
    LIMIT 1
  `)
    .bind(email, nowIso)
    .first<LoginChallengeRow>();

  return row ?? null;
}

export async function incrementLoginChallengeAttempts(env: Env, challengeId: string): Promise<void> {
  await env.DB.prepare("UPDATE login_challenges SET attempts = attempts + 1 WHERE id = ?")
    .bind(challengeId)
    .run();
}

export async function deleteLoginChallenge(env: Env, challengeId: string): Promise<void> {
  await env.DB.prepare("DELETE FROM login_challenges WHERE id = ?")
    .bind(challengeId)
    .run();
}

export async function consumeLoginChallenge(
  env: Env,
  challengeId: string,
  consumedAt: string,
): Promise<void> {
  await env.DB.prepare("UPDATE login_challenges SET consumed_at = ? WHERE id = ?")
    .bind(consumedAt, challengeId)
    .run();
}

export async function getOrCreateUserByEmail(
  env: Env,
  email: string,
  nowIso: string,
): Promise<AccountUserDto> {
  await env.DB.prepare(`
    INSERT INTO users (email, created_at, last_login_at)
    VALUES (?, ?, ?)
    ON CONFLICT(email)
    DO UPDATE SET last_login_at = excluded.last_login_at
  `)
    .bind(email, nowIso, nowIso)
    .run();

  const user = await env.DB.prepare("SELECT id, email FROM users WHERE email = ?")
    .bind(email)
    .first<AccountUserDto>();

  if (!user) {
    throw new Error("Käyttäjän luonti epäonnistui");
  }

  return {
    id: Number(user.id),
    email: String(user.email),
  };
}

export async function createSession(
  env: Env,
  tokenHash: string,
  userId: number,
  createdAt: string,
  expiresAt: string,
): Promise<void> {
  await env.DB.prepare(`
    INSERT INTO sessions (token_hash, user_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `)
    .bind(tokenHash, userId, createdAt, expiresAt)
    .run();
}

export async function getUserBySessionHash(
  env: Env,
  tokenHash: string,
  nowIso: string,
): Promise<AccountUserDto | null> {
  const user = await env.DB.prepare(`
    SELECT u.id AS id, u.email AS email
    FROM sessions s
    INNER JOIN users u
      ON u.id = s.user_id
    WHERE s.token_hash = ?
      AND s.revoked_at IS NULL
      AND s.expires_at > ?
  `)
    .bind(tokenHash, nowIso)
    .first<AccountUserDto>();

  if (!user) return null;
  return {
    id: Number(user.id),
    email: String(user.email),
  };
}

export async function revokeSession(
  env: Env,
  tokenHash: string,
  revokedAt: string,
): Promise<void> {
  await env.DB.prepare("UPDATE sessions SET revoked_at = ? WHERE token_hash = ?")
    .bind(revokedAt, tokenHash)
    .run();
}

export async function linkPlayersForClientId(
  env: Env,
  userId: number,
  clientId: string,
  linkedAt: string,
): Promise<void> {
  await env.DB.prepare(`
    INSERT OR IGNORE INTO user_players (user_id, player_id, linked_at)
    SELECT ?, p.id, ?
    FROM players p
    WHERE p.client_id = ?
      AND NOT EXISTS (
        SELECT 1
        FROM user_players up
        INNER JOIN players existing
          ON existing.id = up.player_id
        WHERE up.user_id = ?
          AND existing.game_id = p.game_id
      )
  `)
    .bind(userId, linkedAt, clientId, userId)
    .run();
}

export async function linkPlayerToUser(
  env: Env,
  userId: number,
  playerId: number,
  linkedAt: string,
): Promise<void> {
  await env.DB.prepare(`
    INSERT OR IGNORE INTO user_players (user_id, player_id, linked_at)
    VALUES (?, ?, ?)
  `)
    .bind(userId, playerId, linkedAt)
    .run();
}

export async function getAccountPlayerIdForGame(
  env: Env,
  userId: number,
  gameId: number,
): Promise<number | null> {
  const row = await env.DB.prepare(`
    SELECT p.id AS id
    FROM user_players up
    INNER JOIN players p
      ON p.id = up.player_id
    WHERE up.user_id = ?
      AND p.game_id = ?
    ORDER BY up.linked_at ASC, p.id ASC
    LIMIT 1
  `)
    .bind(userId, gameId)
    .first<{ id: number }>();

  const id = Number(row?.id ?? 0);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function getRatingsForUserAndGame(
  env: Env,
  userId: number,
  gameId: number,
): Promise<Array<{ beerId: number; score: number; comment: string | null }>> {
  const rows = await env.DB.prepare(`
    SELECT
      r.beer_id AS beerId,
      r.score AS score,
      r.comment AS comment
    FROM ratings r
    INNER JOIN user_players up
      ON up.player_id = r.player_id
    INNER JOIN players p
      ON p.id = r.player_id
    WHERE up.user_id = ?
      AND r.game_id = ?
      AND p.game_id = ?
    ORDER BY r.beer_id ASC
  `)
    .bind(userId, gameId, gameId)
    .all<{ beerId: number; score: number; comment: string | null }>();

  return (rows.results ?? []).map((row) => ({
    beerId: Number(row.beerId),
    score: Number(row.score),
    comment: row.comment == null ? null : String(row.comment),
  }));
}

interface HistoryRow {
  gameId: number;
  publicId: string | null;
  gameName: string | null;
  ratingsCount: number;
  updatedAt: string | null;
  isArchived: number;
  role: string;
}

export async function getAccountHistory(
  env: Env,
  userId: number,
): Promise<AccountHistoryItemDto[]> {
  const rows = await env.DB.prepare(`
    SELECT * FROM (
      SELECT
        g.id AS gameId,
        g.public_id AS publicId,
        g.name AS gameName,
        COUNT(r.beer_id) AS ratingsCount,
        MAX(r.updated_at) AS updatedAt,
        up.is_archived AS isArchived,
        'player' AS role
      FROM user_players up
      INNER JOIN players p
        ON p.id = up.player_id
      INNER JOIN games g
        ON g.id = p.game_id
      LEFT JOIN ratings r
        ON r.player_id = p.id
        AND r.game_id = p.game_id
      WHERE up.user_id = ? AND (g.creator_user_id IS NULL OR g.creator_user_id != ?)
      GROUP BY g.id, g.public_id, g.name, up.is_archived
      HAVING COUNT(r.beer_id) > 0

      UNION ALL

      SELECT
        g.id AS gameId,
        g.public_id AS publicId,
        g.name AS gameName,
        (SELECT COUNT(*) FROM ratings r2 WHERE r2.game_id = g.id) AS ratingsCount,
        (SELECT MAX(r2.updated_at) FROM ratings r2 WHERE r2.game_id = g.id) AS updatedAt,
        g.is_archived_by_creator AS isArchived,
        'host' AS role
      FROM games g
      WHERE g.creator_user_id = ?
    )
    ORDER BY COALESCE(updatedAt, '1970-01-01') DESC, gameId DESC
  `)
    .bind(userId, userId, userId)
    .all<HistoryRow>();

  return (rows.results ?? []).map((row) => ({
    gameId: Number(row.gameId),
    publicId: row.publicId == null ? null : String(row.publicId),
    gameName: String(row.gameName ?? ""),
    ratingsCount: Number(row.ratingsCount ?? 0),
    updatedAt: row.updatedAt == null ? null : String(row.updatedAt),
    isArchived: Boolean(row.isArchived),
    role: row.role as "host" | "player",
  }));
}

export async function linkHostSessionToUser(
  env: Env,
  userId: number,
  publicId: string,
  tokenHash: string,
): Promise<void> {
  await env.DB.prepare(`
    UPDATE games
    SET creator_user_id = ?
    WHERE public_id = ? AND creator_token_hash = ? AND creator_user_id IS NULL
  `)
    .bind(userId, publicId, tokenHash)
    .run();
}

export async function setSessionArchived(
  env: Env,
  userId: number,
  gameId: number,
  isArchived: boolean,
): Promise<void> {
  // Try to update as host
  const result = await env.DB.prepare(`
    UPDATE games
    SET is_archived_by_creator = ?
    WHERE id = ? AND creator_user_id = ?
  `)
    .bind(isArchived ? 1 : 0, gameId, userId)
    .run();

  // If not host (or in addition to), update as player
  if ((result.meta?.changes ?? 0) === 0) {
    await env.DB.prepare(`
      UPDATE user_players
      SET is_archived = ?
      WHERE user_id = ? AND player_id IN (
        SELECT id FROM players WHERE game_id = ?
      )
    `)
      .bind(isArchived ? 1 : 0, userId, gameId)
      .run();
  }
}

export async function deleteAccountAndLinkedPlayers(env: Env, userId: number): Promise<void> {
  await env.DB.prepare(`
    DELETE FROM players
    WHERE id IN (
      SELECT player_id
      FROM user_players
      WHERE user_id = ?
    )
  `)
    .bind(userId)
    .run();

  await env.DB.prepare("DELETE FROM users WHERE id = ?")
    .bind(userId)
    .run();
}
