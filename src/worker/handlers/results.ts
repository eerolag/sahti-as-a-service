import type { GetResultsResponse } from "../../shared/api-contracts";
import type { Env } from "../env";
import { json } from "../http";
import { getResultsForGame } from "../repositories/beers-repo";
import { getGameById } from "../repositories/games-repo";
import { countPlayersByGameId } from "../repositories/players-repo";
import { ensureUntappdLinksForGame } from "../services/untappd-service";

export async function handleGetResults(gameId: number, env: Env): Promise<Response> {
  await ensureUntappdLinksForGame(env, gameId);
  const game = await getGameById(env, gameId);
  if (!game) return json({ error: "Peliä ei löytynyt" }, 404);

  const beers = await getResultsForGame(env, gameId);
  const players = await countPlayersByGameId(env, gameId);

  const response: GetResultsResponse = {
    game,
    summary: {
      players,
    },
    beers,
  };

  return json(response);
}
