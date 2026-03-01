import { normalizeScore } from "../../shared/scoring";
import { normalizeClientId, normalizeRatingComment } from "../../shared/validation";
import type { Env } from "../env";

export interface RatingInput {
  beerId: number;
  score: number;
  comment: string | null;
}

export async function getRatingsForClient(
  env: Env,
  gameId: number,
  clientId: unknown,
): Promise<Array<{ beerId: number; score: number; comment: string | null }>> {
  const cleanClientId = normalizeClientId(clientId);
  if (!cleanClientId) {
    return [];
  }

  const rows = await env.DB.prepare(`
    SELECT
      r.beer_id AS beerId,
      r.score AS score,
      r.comment AS comment
    FROM ratings r
    INNER JOIN players p
      ON p.id = r.player_id
    WHERE r.game_id = ?
      AND p.game_id = ?
      AND p.client_id = ?
    ORDER BY r.beer_id ASC
  `)
    .bind(gameId, gameId, cleanClientId)
    .all<{ beerId: number; score: number; comment: string | null }>();

  const ratings: Array<{ beerId: number; score: number; comment: string | null }> = [];
  for (const row of rows.results ?? []) {
    const beerId = Number(row?.beerId);
    const score = normalizeScore(row?.score);
    const comment = normalizeRatingComment(row?.comment);
    if (!Number.isInteger(beerId) || score == null) continue;
    ratings.push({ beerId, score, comment: "error" in comment ? null : comment.value });
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
    INSERT INTO ratings (game_id, beer_id, player_id, score, comment, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(game_id, beer_id, player_id)
    DO UPDATE SET score = excluded.score, comment = excluded.comment, updated_at = datetime('now')
  `);

  await env.DB.batch(ratings.map((r) => stmt.bind(gameId, r.beerId, playerId, r.score, r.comment)));
}
