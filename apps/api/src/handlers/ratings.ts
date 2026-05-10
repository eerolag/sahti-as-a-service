import type { GetRatingsResponse, SaveRatingsRequest, SaveRatingsResponse } from "@breview/shared/api-contracts";
import { normalizeScore } from "@breview/shared/scoring";
import { normalizeClientId, normalizeNickname, normalizeRatingComment } from "@breview/shared/validation";
import type { Env } from "../env";
import { json, parseJson } from "../http";
import {
  getAccountPlayerIdForGame,
  getRatingsForUserAndGame,
  linkPlayerToUser,
} from "../repositories/auth-repo";
import { listBeerIdsByGameId } from "../repositories/beers-repo";
import { gameExists, getGameById } from "../repositories/games-repo";
import { getOrCreatePlayerId, updatePlayerNickname } from "../repositories/players-repo";
import { getRatingsForClient, saveRatings } from "../repositories/ratings-repo";
import { getSessionUser } from "../services/auth-service";

export async function handleGetRatings(gameId: number, request: Request, env: Env): Promise<Response> {
  const exists = await gameExists(env, gameId);
  if (!exists) return json({ error: "Sessiota ei löytynyt" }, 404);

  const url = new URL(request.url);
  const clientId = normalizeClientId(url.searchParams.get("clientId"));
  if (!clientId) {
    return json({ error: "clientId puuttuu tai virheellinen" }, 400);
  }

  const user = await getSessionUser(request, env);
  const accountRatings = user ? await getRatingsForUserAndGame(env, user.id, gameId) : [];
  const ratings = accountRatings.length ? accountRatings : await getRatingsForClient(env, gameId, clientId);
  const response: GetRatingsResponse = { ok: true, ratings };
  return json(response);
}

export async function handleSaveRatings(gameId: number, request: Request, env: Env): Promise<Response> {
  const body = await parseJson<SaveRatingsRequest>(request);
  if (!body || !Array.isArray(body.ratings)) {
    return json({ error: "Invalid payload" }, 400);
  }

  const exists = await gameExists(env, gameId);
  if (!exists) return json({ error: "Sessiota ei löytynyt" }, 404);
  const game = await getGameById(env, gameId);
  if (!game) return json({ error: "Sessiota ei löytynyt" }, 404);

  const normalizedNickname = normalizeNickname(body.nickname);
  if ("error" in normalizedNickname) {
    return json({ error: normalizedNickname.error }, 400);
  }

  const user = await getSessionUser(request, env);
  let playerId = user ? await getAccountPlayerIdForGame(env, user.id, gameId) : null;
  if (!playerId) {
    playerId = await getOrCreatePlayerId(env, gameId, body.clientId, normalizedNickname.value);
    if (playerId && user) {
      await linkPlayerToUser(env, user.id, playerId, new Date().toISOString());
    }
  } else if (normalizedNickname.value) {
    await updatePlayerNickname(env, playerId, normalizedNickname.value);
  }

  if (!playerId) return json({ error: "clientId puuttuu" }, 400);

  const validBeerIds = new Set(await listBeerIdsByGameId(env, gameId));
  const normalized: Array<{ beerId: number; score: number; comment: string | null }> = [];

  for (let index = 0; index < body.ratings.length; index += 1) {
    const r = body.ratings[index];
    const beerId = Number(r?.beerId);
    const score = normalizeScore(r?.score, game.ratingConfig);
    const comment = normalizeRatingComment(r?.comment);
    if ("error" in comment) {
      return json({ error: `${comment.error} (rivi ${index + 1})` }, 400);
    }
    if (!Number.isInteger(beerId) || !validBeerIds.has(beerId)) continue;
    if (score == null) continue;
    normalized.push({ beerId, score, comment: comment.value });
  }

  if (!normalized.length) {
    return json({ error: "Ei tallennettavia arvosanoja" }, 400);
  }

  await saveRatings(env, gameId, playerId, normalized);

  const response: SaveRatingsResponse = { ok: true, saved: normalized.length };
  return json(response);
}
