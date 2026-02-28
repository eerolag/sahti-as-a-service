import type { ResultBeerDto } from "../../shared/api-contracts";
import type { D1PreparedStatement, Env } from "../env";

export interface BeerRow {
  id: number;
  name: string;
  image_url: string | null;
  sort_order: number;
  untappd_url: string | null;
  untappd_source: string | null;
  untappd_confidence: number | null;
  untappd_resolved_at: string | null;
}

export interface BeerWriteInput {
  id?: number;
  name: string;
  image_url: string | null;
  sort_order: number;
  untappd_url: string;
  untappd_source: string;
  untappd_confidence: number | null;
  untappd_resolved_at: string;
}

export async function getBeersByGameId(env: Env, gameId: number): Promise<BeerRow[]> {
  const beersRes = await env.DB.prepare(
    "SELECT id, name, image_url, sort_order, untappd_url, untappd_source, untappd_confidence, untappd_resolved_at FROM beers WHERE game_id = ? ORDER BY sort_order ASC, id ASC",
  )
    .bind(gameId)
    .all<BeerRow>();
  return beersRes.results ?? [];
}

export async function listBeerIdsByGameId(env: Env, gameId: number): Promise<number[]> {
  const res = await env.DB.prepare("SELECT id FROM beers WHERE game_id = ? ORDER BY sort_order ASC, id ASC")
    .bind(gameId)
    .all<{ id: number }>();
  return (res.results ?? []).map((b) => Number(b.id));
}

export async function insertBeers(env: Env, gameId: number, beers: BeerWriteInput[]): Promise<void> {
  const stmt = env.DB.prepare(
    "INSERT INTO beers (game_id, name, image_url, sort_order, untappd_url, untappd_source, untappd_confidence, untappd_resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );

  const batch = beers.map((beer) =>
    stmt.bind(
      gameId,
      beer.name,
      beer.image_url,
      beer.sort_order,
      beer.untappd_url,
      beer.untappd_source,
      beer.untappd_confidence,
      beer.untappd_resolved_at,
    ),
  );

  await env.DB.batch(batch);
}

export async function upsertBeersForGame(env: Env, gameId: number, beers: BeerWriteInput[]): Promise<void> {
  const statements: D1PreparedStatement[] = [];
  const insertStmt = env.DB.prepare(
    "INSERT INTO beers (game_id, name, image_url, sort_order, untappd_url, untappd_source, untappd_confidence, untappd_resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const updateStmt = env.DB.prepare(
    "UPDATE beers SET name = ?, image_url = ?, sort_order = ?, untappd_url = ?, untappd_source = ?, untappd_confidence = ?, untappd_resolved_at = ? WHERE game_id = ? AND id = ?",
  );

  for (const beer of beers) {
    if (beer.id == null) {
      statements.push(
        insertStmt.bind(
          gameId,
          beer.name,
          beer.image_url,
          beer.sort_order,
          beer.untappd_url,
          beer.untappd_source,
          beer.untappd_confidence,
          beer.untappd_resolved_at,
        ),
      );
      continue;
    }

    statements.push(
      updateStmt.bind(
        beer.name,
        beer.image_url,
        beer.sort_order,
        beer.untappd_url,
        beer.untappd_source,
        beer.untappd_confidence,
        beer.untappd_resolved_at,
        gameId,
        beer.id,
      ),
    );
  }

  if (statements.length) {
    await env.DB.batch(statements);
  }
}

export async function deleteBeersByIds(env: Env, gameId: number, ids: number[]): Promise<void> {
  if (!ids.length) return;
  const deleteStmt = env.DB.prepare("DELETE FROM beers WHERE game_id = ? AND id = ?");
  await env.DB.batch(ids.map((id) => deleteStmt.bind(gameId, id)));
}

export async function listBeersForUntappdMaintenance(
  env: Env,
  gameId: number,
): Promise<Array<{ id: number; name: string; untappd_url: string | null; untappd_source: string | null; untappd_resolved_at: string | null }>> {
  const rows = await env.DB.prepare(
    "SELECT id, name, untappd_url, untappd_source, untappd_resolved_at FROM beers WHERE game_id = ?",
  )
    .bind(gameId)
    .all<{
      id: number;
      name: string;
      untappd_url: string | null;
      untappd_source: string | null;
      untappd_resolved_at: string | null;
    }>();

  return rows.results ?? [];
}

export async function updateBeerUntappdMeta(
  env: Env,
  gameId: number,
  updates: Array<{
    beerId: number;
    untappd_url: string;
    untappd_source: string;
    untappd_confidence: number | null;
    untappd_resolved_at: string;
  }>,
): Promise<void> {
  if (!updates.length) return;

  const stmt = env.DB.prepare(
    "UPDATE beers SET untappd_url = ?, untappd_source = ?, untappd_confidence = ?, untappd_resolved_at = ? WHERE game_id = ? AND id = ?",
  );

  await env.DB.batch(
    updates.map((u) =>
      stmt.bind(
        u.untappd_url,
        u.untappd_source,
        u.untappd_confidence,
        u.untappd_resolved_at,
        gameId,
        u.beerId,
      ),
    ),
  );
}

export async function getResultsForGame(env: Env, gameId: number): Promise<ResultBeerDto[]> {
  const rows = await env.DB.prepare(`
    SELECT
      b.id,
      b.name,
      b.image_url,
      b.untappd_url,
      b.untappd_source,
      b.untappd_confidence,
      b.untappd_resolved_at,
      b.sort_order,
      ROUND(COALESCE(AVG(r.score), 0), 2) AS avg_score,
      COUNT(r.player_id) AS rating_count
    FROM beers b
    LEFT JOIN ratings r
      ON r.beer_id = b.id AND r.game_id = b.game_id
    WHERE b.game_id = ?
    GROUP BY
      b.id,
      b.name,
      b.image_url,
      b.untappd_url,
      b.untappd_source,
      b.untappd_confidence,
      b.untappd_resolved_at,
      b.sort_order
    ORDER BY avg_score DESC, b.sort_order ASC, b.id ASC
  `)
    .bind(gameId)
    .all<ResultBeerDto>();

  return rows.results ?? [];
}
