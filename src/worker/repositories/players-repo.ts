import { normalizeClientId } from "../../shared/validation";
import type { Env } from "../env";

export async function getOrCreatePlayerId(
  env: Env,
  gameId: number,
  clientId: unknown,
  nickname: string | null = null,
): Promise<number | null> {
  const cleanClientId = normalizeClientId(clientId);
  if (!cleanClientId) return null;

  let player = await env.DB.prepare("SELECT id, nickname FROM players WHERE game_id = ? AND client_id = ?")
    .bind(gameId, cleanClientId)
    .first<{ id: number; nickname: string | null }>();

  if (player?.id) {
    const prevNickname = String(player.nickname ?? "");
    const nextNickname = String(nickname ?? "");
    if (nextNickname && prevNickname !== nextNickname) {
      await env.DB.prepare("UPDATE players SET nickname = ? WHERE id = ?")
        .bind(nextNickname, player.id)
        .run();
    }
    return player.id;
  }

  await env.DB.prepare("INSERT OR IGNORE INTO players (game_id, client_id, nickname) VALUES (?, ?, ?)")
    .bind(gameId, cleanClientId, nickname)
    .run();

  player = await env.DB.prepare("SELECT id, nickname FROM players WHERE game_id = ? AND client_id = ?")
    .bind(gameId, cleanClientId)
    .first<{ id: number; nickname: string | null }>();

  if (player?.id && nickname && String(player.nickname ?? "") !== nickname) {
    await env.DB.prepare("UPDATE players SET nickname = ? WHERE id = ?")
      .bind(nickname, player.id)
      .run();
  }

  return player?.id ?? null;
}

export async function countPlayersByGameId(env: Env, gameId: number): Promise<number> {
  const res = await env.DB.prepare("SELECT COUNT(*) AS c FROM players WHERE game_id = ?")
    .bind(gameId)
    .first<{ c: number }>();
  return Number(res?.c ?? 0);
}
