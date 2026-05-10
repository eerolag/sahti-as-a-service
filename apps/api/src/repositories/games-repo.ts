import type { RatingConfig, ResultsVisibility } from "@breview/shared";
import type { Env } from "../env";

export interface GameRow {
  id: number;
  name: string;
  created_at: string;
  publicId: string;
  creatorTokenHash: string | null;
  ratingConfig: RatingConfig;
  resultsVisibility: ResultsVisibility;
  resultsRevealedAt: string | null;
}

interface DbGameRow {
  id: number;
  name: string;
  created_at: string;
  publicId: string | null;
  creatorTokenHash: string | null;
  ratingMode: string | null;
  scoreMin: number | null;
  scoreMax: number | null;
  scoreStep: number | null;
  resultsVisibility: string | null;
  resultsRevealedAt: string | null;
}

const GAME_SELECT = [
  "SELECT",
  "id,",
  "name,",
  "created_at,",
  "COALESCE(public_id, CAST(id AS TEXT)) AS publicId,",
  "creator_token_hash AS creatorTokenHash,",
  "COALESCE(rating_mode, 'slider') AS ratingMode,",
  "COALESCE(score_min, 0) AS scoreMin,",
  "COALESCE(score_max, 10) AS scoreMax,",
  "COALESCE(score_step, 0.25) AS scoreStep,",
  "COALESCE(results_visibility, 'live') AS resultsVisibility,",
  "results_revealed_at AS resultsRevealedAt",
  "FROM games",
].join(" ");

function toGameRow(row: DbGameRow | null | undefined): GameRow | null {
  if (!row) return null;
  const ratingMode = row.ratingMode === "stars" ? "stars" : "slider";
  const visibility =
    row.resultsVisibility === "after_submit" || row.resultsVisibility === "host_reveal"
      ? row.resultsVisibility
      : "live";

  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    created_at: String(row.created_at ?? ""),
    publicId: String(row.publicId ?? row.id),
    creatorTokenHash: row.creatorTokenHash ? String(row.creatorTokenHash) : null,
    ratingConfig: {
      mode: ratingMode,
      scoreMin: Number(row.scoreMin ?? 0),
      scoreMax: Number(row.scoreMax ?? 10),
      scoreStep: Number(row.scoreStep ?? 0.25),
    },
    resultsVisibility: visibility,
    resultsRevealedAt: row.resultsRevealedAt ? String(row.resultsRevealedAt) : null,
  };
}

export async function createGame(
  env: Env,
  name: string,
  publicId: string,
  creatorTokenHash: string,
  ratingConfig: RatingConfig,
  resultsVisibility: ResultsVisibility,
): Promise<number | null> {
  const result = await env.DB.prepare(
    [
      "INSERT INTO games",
      "(name, public_id, creator_token_hash, rating_mode, score_min, score_max, score_step, results_visibility)",
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ].join(" "),
  )
    .bind(
      name,
      publicId,
      creatorTokenHash,
      ratingConfig.mode,
      ratingConfig.scoreMin,
      ratingConfig.scoreMax,
      ratingConfig.scoreStep,
      resultsVisibility,
    )
    .run();
  return (result.meta?.last_row_id as number | undefined) ?? null;
}

export async function getGameById(env: Env, gameId: number): Promise<GameRow | null> {
  const game = await env.DB.prepare(`${GAME_SELECT} WHERE id = ?`)
    .bind(gameId)
    .first<DbGameRow>();
  return toGameRow(game);
}

export async function getGameByPublicId(env: Env, publicId: string): Promise<GameRow | null> {
  const game = await env.DB.prepare(`${GAME_SELECT} WHERE public_id = ?`)
    .bind(publicId)
    .first<DbGameRow>();
  return toGameRow(game);
}

export async function gameExists(env: Env, gameId: number): Promise<boolean> {
  const row = await env.DB.prepare("SELECT id FROM games WHERE id = ?").bind(gameId).first<{ id: number }>();
  return Boolean(row?.id);
}

export async function updateGame(
  env: Env,
  gameId: number,
  name: string,
  ratingConfig: RatingConfig,
  resultsVisibility: ResultsVisibility,
): Promise<void> {
  await env.DB.prepare(
    [
      "UPDATE games SET",
      "name = ?,",
      "rating_mode = ?,",
      "score_min = ?,",
      "score_max = ?,",
      "score_step = ?,",
      "results_visibility = ?",
      "WHERE id = ?",
    ].join(" "),
  )
    .bind(
      name,
      ratingConfig.mode,
      ratingConfig.scoreMin,
      ratingConfig.scoreMax,
      ratingConfig.scoreStep,
      resultsVisibility,
      gameId,
    )
    .run();
}

export async function revealGameResults(env: Env, gameId: number): Promise<void> {
  await env.DB.prepare("UPDATE games SET results_revealed_at = datetime('now') WHERE id = ?").bind(gameId).run();
}
