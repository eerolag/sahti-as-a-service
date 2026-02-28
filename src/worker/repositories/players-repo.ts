import { normalizeClientId } from "../../shared/validation";
import type { Env } from "../env";

export async function getOrCreatePlayerId(
  env: Env,
  gameId: number,
  clientId: unknown,
): Promise<number | null> {
  const cleanClientId = normalizeClientId(clientId);
  if (!cleanClientId) return null;

  let player = await env.DB.prepare("SELECT id FROM players WHERE game_id = ? AND client_id = ?")
    .bind(gameId, cleanClientId)
    .first<{ id: number }>();

  if (player?.id) return player.id;

  await env.DB.prepare("INSERT OR IGNORE INTO players (game_id, client_id) VALUES (?, ?)")
    .bind(gameId, cleanClientId)
    .run();

  player = await env.DB.prepare("SELECT id FROM players WHERE game_id = ? AND client_id = ?")
    .bind(gameId, cleanClientId)
    .first<{ id: number }>();

  return player?.id ?? null;
}

export async function countPlayersByGameId(env: Env, gameId: number): Promise<number> {
  const res = await env.DB.prepare("SELECT COUNT(*) AS c FROM players WHERE game_id = ?")
    .bind(gameId)
    .first<{ c: number }>();
  return Number(res?.c ?? 0);
}
