import type { Env } from "../env";

export interface GameRow {
  id: number;
  name: string;
  created_at: string;
}

export async function createGame(env: Env, name: string): Promise<number | null> {
  const result = await env.DB.prepare("INSERT INTO games (name) VALUES (?)").bind(name).run();
  return (result.meta?.last_row_id as number | undefined) ?? null;
}

export async function getGameById(env: Env, gameId: number): Promise<GameRow | null> {
  const game = await env.DB.prepare("SELECT id, name, created_at FROM games WHERE id = ?")
    .bind(gameId)
    .first<GameRow>();
  return game ?? null;
}

export async function gameExists(env: Env, gameId: number): Promise<boolean> {
  const row = await env.DB.prepare("SELECT id FROM games WHERE id = ?").bind(gameId).first<{ id: number }>();
  return Boolean(row?.id);
}

export async function updateGameName(env: Env, gameId: number, name: string): Promise<void> {
  await env.DB.prepare("UPDATE games SET name = ? WHERE id = ?").bind(name, gameId).run();
}
