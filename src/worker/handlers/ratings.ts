import type { GetRatingsResponse, SaveRatingsRequest, SaveRatingsResponse } from "../../shared/api-contracts";
import { normalizeScore } from "../../shared/scoring";
import { normalizeClientId } from "../../shared/validation";
import type { Env } from "../env";
import { json, parseJson } from "../http";
import { listBeerIdsByGameId } from "../repositories/beers-repo";
import { gameExists } from "../repositories/games-repo";
import { getOrCreatePlayerId } from "../repositories/players-repo";
import { getRatingsForClient, saveRatings } from "../repositories/ratings-repo";

export async function handleGetRatings(gameId: number, request: Request, env: Env): Promise<Response> {
  const exists = await gameExists(env, gameId);
  if (!exists) return json({ error: "Peliä ei löytynyt" }, 404);

  const url = new URL(request.url);
  const clientId = normalizeClientId(url.searchParams.get("clientId"));
  if (!clientId) {
    return json({ error: "clientId puuttuu tai virheellinen" }, 400);
  }

  const ratings = await getRatingsForClient(env, gameId, clientId);
  const response: GetRatingsResponse = { ok: true, ratings };
  return json(response);
}

export async function handleSaveRatings(gameId: number, request: Request, env: Env): Promise<Response> {
  const body = await parseJson<SaveRatingsRequest>(request);
  if (!body || !Array.isArray(body.ratings)) {
    return json({ error: "Invalid payload" }, 400);
  }

  const exists = await gameExists(env, gameId);
  if (!exists) return json({ error: "Peliä ei löytynyt" }, 404);

  const playerId = await getOrCreatePlayerId(env, gameId, body.clientId);
  if (!playerId) return json({ error: "clientId puuttuu" }, 400);

  const validBeerIds = new Set(await listBeerIdsByGameId(env, gameId));
  const normalized: Array<{ beerId: number; score: number }> = [];

  for (const r of body.ratings) {
    const beerId = Number(r?.beerId);
    const score = normalizeScore(r?.score);
    if (!Number.isInteger(beerId) || !validBeerIds.has(beerId)) continue;
    if (score == null) continue;
    normalized.push({ beerId, score });
  }

  if (!normalized.length) {
    return json({ error: "Ei tallennettavia arvosanoja" }, 400);
  }

  await saveRatings(env, gameId, playerId, normalized);

  const response: SaveRatingsResponse = { ok: true, saved: normalized.length };
  return json(response);
}
