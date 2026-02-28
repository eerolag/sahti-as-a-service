import { normalizeScore } from "../../shared/scoring";
import { normalizeClientId } from "../../shared/validation";
import type { Env } from "../env";

export interface RatingInput {
  beerId: number;
  score: number;
}

export async function getRatingsForClient(
  env: Env,
  gameId: number,
  clientId: unknown,
): Promise<Array<{ beerId: number; score: number }>> {
  const cleanClientId = normalizeClientId(clientId);
  if (!cleanClientId) {
    return [];
  }

  const rows = await env.DB.prepare(`
    SELECT
      r.beer_id AS beerId,
      r.score AS score
    FROM ratings r
    INNER JOIN players p
      ON p.id = r.player_id
    WHERE r.game_id = ?
      AND p.game_id = ?
      AND p.client_id = ?
    ORDER BY r.beer_id ASC
  `)
    .bind(gameId, gameId, cleanClientId)
    .all<{ beerId: number; score: number }>();

  const ratings: Array<{ beerId: number; score: number }> = [];
  for (const row of rows.results ?? []) {
    const beerId = Number(row?.beerId);
    const score = normalizeScore(row?.score);
    if (!Number.isInteger(beerId) || score == null) continue;
    ratings.push({ beerId, score });
  }

  return ratings;
}

export async function saveRatings(
  env: Env,
  gameId: number,
  playerId: number,
  ratings: RatingInput[],
): Promise<void> {
  const stmt = env.DB.prepare(`
    INSERT INTO ratings (game_id, beer_id, player_id, score, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(game_id, beer_id, player_id)
    DO UPDATE SET score = excluded.score, updated_at = datetime('now')
  `);

  await env.DB.batch(ratings.map((r) => stmt.bind(gameId, r.beerId, playerId, r.score)));
}
