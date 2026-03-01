import type {
  CreateGameRequest,
  CreateGameResponse,
  GetGameResponse,
  UpdateGameRequest,
  UpdateGameResponse,
} from "../../shared/api-contracts";
import { normalizeBeersPayload } from "../../shared/game-domain";
import { extractImageKeyFromUrl } from "../../shared/image-upload";
import { normalizeGameName } from "../../shared/validation";
import type { Env } from "../env";
import { json, parseJson } from "../http";
import {
  deleteBeersByIds,
  getBeersByGameId,
  insertBeers,
  listBeerIdsByGameId,
  upsertBeersForGame,
} from "../repositories/beers-repo";
import { createGame, gameExists, getGameById, updateGameName } from "../repositories/games-repo";
import { ensureUntappdLinksForGame, enrichBeersWithUntappd } from "../services/untappd-service";

async function getGameWithBeers(env: Env, gameId: number): Promise<GetGameResponse | null> {
  const game = await getGameById(env, gameId);
  if (!game) return null;

  const beers = await getBeersByGameId(env, gameId);
  return { game, beers };
}

export async function handleCreateGame(request: Request, env: Env): Promise<Response> {
  const body = await parseJson<CreateGameRequest>(request);
  if (!body) {
    return json({ error: "Invalid payload" }, 400);
  }

  const gameName = normalizeGameName(body.name);
  if ("error" in gameName) {
    return json({ error: gameName.error }, 400);
  }

  const normalizedBeers = normalizeBeersPayload(body.beers);
  if ("error" in normalizedBeers) {
    return json({ error: normalizedBeers.error }, 400);
  }

  const beers = await enrichBeersWithUntappd(env, normalizedBeers.beers);

  const gameId = await createGame(env, gameName.value);
  if (!gameId) {
    return json({ error: "Pelin luonti epäonnistui" }, 500);
  }

  await insertBeers(env, gameId, beers);

  const response: CreateGameResponse = { ok: true, gameId };
  return json(response);
}

export async function handleGetGame(gameId: number, env: Env): Promise<Response> {
  await ensureUntappdLinksForGame(env, gameId);
  const payload = await getGameWithBeers(env, gameId);
  if (!payload) {
    return json({ error: "Peliä ei löytynyt" }, 404);
  }

  return json(payload);
}

export async function handleUpdateGame(gameId: number, request: Request, env: Env): Promise<Response> {
  const body = await parseJson<UpdateGameRequest>(request);
  if (!body) {
    return json({ error: "Invalid payload" }, 400);
  }

  const gameName = normalizeGameName(body.name);
  if ("error" in gameName) {
    return json({ error: gameName.error }, 400);
  }

  const normalizedBeers = normalizeBeersPayload(body.beers, { allowIds: true });
  if ("error" in normalizedBeers) {
    return json({ error: normalizedBeers.error }, 400);
  }
  const beers = await enrichBeersWithUntappd(env, normalizedBeers.beers);

  const exists = await gameExists(env, gameId);
  if (!exists) return json({ error: "Peliä ei löytynyt" }, 404);

  const existingIds = new Set(await listBeerIdsByGameId(env, gameId));
  const previousBeers = await getBeersByGameId(env, gameId);
  const previousImageKeys = new Set<string>();
  for (const beer of previousBeers) {
    const key = extractImageKeyFromUrl(beer.image_url);
    if (key) previousImageKeys.add(key);
  }

  const seenIds = new Set<number>();
  for (const beer of beers) {
    if (beer.id == null) continue;
    if (!existingIds.has(beer.id)) {
      return json({ error: `Virheellinen olut-ID: ${beer.id}` }, 400);
    }
    if (seenIds.has(beer.id)) {
      return json({ error: `Olut-ID esiintyy kahdesti: ${beer.id}` }, 400);
    }
    seenIds.add(beer.id);
  }

  await updateGameName(env, gameId, gameName.value);
  await upsertBeersForGame(env, gameId, beers);

  const deleteIds: number[] = [];
  for (const id of existingIds) {
    if (!seenIds.has(id)) {
      deleteIds.push(id);
    }
  }
  await deleteBeersByIds(env, gameId, deleteIds);

  const updated = await getGameWithBeers(env, gameId);
  if (!updated) return json({ error: "Peliä ei löytynyt" }, 404);

  const nextImageKeys = new Set<string>();
  for (const beer of updated.beers) {
    const key = extractImageKeyFromUrl(beer.image_url);
    if (key) nextImageKeys.add(key);
  }

  const keysToDelete = [...previousImageKeys].filter((key) => !nextImageKeys.has(key));
  if (keysToDelete.length) {
    await Promise.allSettled(keysToDelete.map((key) => env.IMAGES_BUCKET.delete(key)));
  }

  const response: UpdateGameResponse = { ok: true, ...updated };
  return json(response);
}
