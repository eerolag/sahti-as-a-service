import type {
  CreateGameRequest,
  CreateGameResponse,
  GetGameResponse,
  RevealResultsResponse,
  UpdateGameRequest,
  UpdateGameResponse,
} from "@breview/shared/api-contracts";
import { normalizeBeersPayload } from "@breview/shared/game-domain";
import { extractImageKeyFromUrl } from "@breview/shared/image-upload";
import { normalizeSessionSettings, type NormalizedSessionSettings } from "@breview/shared";
import { normalizeGameName } from "@breview/shared/validation";
import type { Env } from "../env";
import { json, parseJson } from "../http";
import {
  deleteBeersByIds,
  getBeersByGameId,
  insertBeers,
  listBeerIdsByGameId,
  upsertBeersForGame,
} from "../repositories/beers-repo";
import {
  createGame,
  gameExists,
  getGameById,
  getGameByPublicId,
  revealGameResults,
  updateGame,
  type GameRow,
} from "../repositories/games-repo";
import {
  buildSessionUrls,
  createSessionHostToken,
  createSessionPublicId,
  hashSessionHostToken,
  isValidCreatorToken,
} from "../services/session-security-service";
import { ensureUntappdLinksForGame, enrichBeersWithUntappd } from "../services/untappd-service";

const PUBLIC_ID_ATTEMPTS = 5;

async function createGameWithPublicId(
  request: Request,
  env: Env,
  name: string,
  settings: NormalizedSessionSettings,
): Promise<CreateGameResponse | null> {
  for (let attempt = 0; attempt < PUBLIC_ID_ATTEMPTS; attempt += 1) {
    const publicId = createSessionPublicId();
    const hostToken = createSessionHostToken();
    const hostTokenHash = await hashSessionHostToken(env, publicId, hostToken);
    let gameId: number | null;
    try {
      gameId = await createGame(
        env,
        name,
        publicId,
        hostTokenHash,
        settings.ratingConfig,
        settings.resultsVisibility,
      );
    } catch (error) {
      if (String((error as Error)?.message ?? error).toLowerCase().includes("unique")) continue;
      throw error;
    }

    if (gameId) {
      const urls = buildSessionUrls(request, publicId, hostToken);
      return {
        ok: true,
        gameId,
        shareId: publicId,
        shareUrl: urls.shareUrl,
        hostToken,
        hostUrl: urls.hostUrl,
      };
    }
  }

  return null;
}

async function getGameWithBeers(env: Env, gameOrId: number | GameRow): Promise<GetGameResponse | null> {
  const game = typeof gameOrId === "number" ? await getGameById(env, gameOrId) : gameOrId;
  if (!game) return null;

  const beers = await getBeersByGameId(env, game.id);
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

  const settings = normalizeSessionSettings(body.settings);
  if ("error" in settings) {
    return json({ error: settings.error }, 400);
  }

  const beers = enrichBeersWithUntappd(normalizedBeers.beers);

  const response = await createGameWithPublicId(request, env, gameName.value, settings.value);
  if (!response) {
    return json({ error: "Session luonti epäonnistui" }, 500);
  }

  await insertBeers(env, response.gameId, beers);

  return json(response);
}

export async function handleGetGame(gameId: number, env: Env): Promise<Response> {
  await ensureUntappdLinksForGame(env, gameId);
  const payload = await getGameWithBeers(env, gameId);
  if (!payload) {
    return json({ error: "Sessiota ei löytynyt" }, 404);
  }

  return json(payload);
}

export async function handleGetSession(publicId: string, env: Env): Promise<Response> {
  const game = await getGameByPublicId(env, publicId);
  if (!game) {
    return json({ error: "Sessiota ei löytynyt" }, 404);
  }

  await ensureUntappdLinksForGame(env, game.id);
  const payload = await getGameWithBeers(env, game);
  if (!payload) {
    return json({ error: "Sessiota ei löytynyt" }, 404);
  }

  return json(payload);
}

async function updateGameByRow(game: GameRow, request: Request, env: Env): Promise<Response> {
  if (!(await isValidCreatorToken(env, game, request))) {
    return json({ error: "Vain session luoja voi muokata tätä sessiota" }, 403);
  }

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
  const beers = enrichBeersWithUntappd(normalizedBeers.beers);

  const settings = normalizeSessionSettings({
    ratingMode: body.settings?.ratingMode ?? game.ratingConfig.mode,
    scoreMin: body.settings?.scoreMin ?? game.ratingConfig.scoreMin,
    scoreMax: body.settings?.scoreMax ?? game.ratingConfig.scoreMax,
    scoreStep: body.settings?.scoreStep ?? game.ratingConfig.scoreStep,
    resultsVisibility: body.settings?.resultsVisibility ?? game.resultsVisibility,
  });
  if ("error" in settings) {
    return json({ error: settings.error }, 400);
  }

  const existingIds = new Set(await listBeerIdsByGameId(env, game.id));
  const previousBeers = await getBeersByGameId(env, game.id);
  const previousImageKeys = new Set<string>();
  for (const beer of previousBeers) {
    const key = extractImageKeyFromUrl(beer.image_url);
    if (key) previousImageKeys.add(key);
  }

  const seenIds = new Set<number>();
  for (const beer of beers) {
    if (beer.id == null) continue;
    if (!existingIds.has(beer.id)) {
      return json({ error: `Virheellinen juoma-ID: ${beer.id}` }, 400);
    }
    if (seenIds.has(beer.id)) {
      return json({ error: `Juoma-ID esiintyy kahdesti: ${beer.id}` }, 400);
    }
    seenIds.add(beer.id);
  }

  await updateGame(env, game.id, gameName.value, settings.value.ratingConfig, settings.value.resultsVisibility);
  await upsertBeersForGame(env, game.id, beers);

  const deleteIds: number[] = [];
  for (const id of existingIds) {
    if (!seenIds.has(id)) {
      deleteIds.push(id);
    }
  }
  await deleteBeersByIds(env, game.id, deleteIds);

  const updated = await getGameWithBeers(env, game.id);
  if (!updated) return json({ error: "Sessiota ei löytynyt" }, 404);

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

export async function handleUpdateGame(gameId: number, request: Request, env: Env): Promise<Response> {
  const exists = await gameExists(env, gameId);
  if (!exists) return json({ error: "Sessiota ei löytynyt" }, 404);

  const game = await getGameById(env, gameId);
  if (!game) return json({ error: "Sessiota ei löytynyt" }, 404);

  return updateGameByRow(game, request, env);
}

export async function handleUpdateSession(publicId: string, request: Request, env: Env): Promise<Response> {
  const game = await getGameByPublicId(env, publicId);
  if (!game) return json({ error: "Sessiota ei löytynyt" }, 404);
  return updateGameByRow(game, request, env);
}

export async function handleRevealSessionResults(publicId: string, request: Request, env: Env): Promise<Response> {
  const game = await getGameByPublicId(env, publicId);
  if (!game) return json({ error: "Sessiota ei löytynyt" }, 404);
  if (!(await isValidCreatorToken(env, game, request))) {
    return json({ error: "Vain session luoja voi paljastaa tulokset" }, 403);
  }

  await revealGameResults(env, game.id);
  const updated = await getGameById(env, game.id);
  if (!updated) return json({ error: "Sessiota ei löytynyt" }, 404);

  const response: RevealResultsResponse = { ok: true, game: updated };
  return json(response);
}
