import type { GetResultsResponse } from "@breview/shared/api-contracts";
import { normalizeClientId } from "@breview/shared/validation";
import type { Env } from "../env";
import { json } from "../http";
import { getResultsForGame } from "../repositories/beers-repo";
import { getGameById, type GameRow } from "../repositories/games-repo";
import { countPlayersByGameId, getPlayersByGameId } from "../repositories/players-repo";
import { getRatingsForClient } from "../repositories/ratings-repo";
import { isValidCreatorToken, shouldHideResults } from "../services/session-security-service";
import { ensureUntappdLinksForGame } from "../services/untappd-service";

export async function handleGetResults(gameId: number, request: Request, env: Env, resolvedGame?: GameRow): Promise<Response> {
  await ensureUntappdLinksForGame(env, gameId);
  const game = resolvedGame ?? (await getGameById(env, gameId));
  if (!game) return json({ error: "Sessiota ei löytynyt" }, 404);

  const url = new URL(request.url);
  const clientId = normalizeClientId(url.searchParams.get("clientId"));
  const isHost = await isValidCreatorToken(env, game, request);
  const hasSubmitted = clientId ? (await getRatingsForClient(env, game.id, clientId)).length > 0 : false;
  if (shouldHideResults(game, isHost, hasSubmitted)) {
    return json({ error: "Tulokset paljastetaan vasta session lopussa" }, 403);
  }

  const beers = await getResultsForGame(env, gameId);
  const players = await countPlayersByGameId(env, gameId);
  const playerRows = await getPlayersByGameId(env, gameId);

  const response: GetResultsResponse = {
    game,
    summary: {
      players,
    },
    players: playerRows,
    beers,
  };

  return json(response);
}
