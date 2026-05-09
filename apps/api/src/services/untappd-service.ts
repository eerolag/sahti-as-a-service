import {
  UNTAPPD_SEARCH_SOURCE,
  createSearchLinkUntappdMeta,
} from "@breview/shared/untappd";
import type { NormalizedBeer } from "@breview/shared/game-domain";
import type { Env } from "../env";
import {
  listBeersForUntappdMaintenance,
  updateBeerUntappdMeta,
} from "../repositories/beers-repo";

interface UntappdResolvedMeta {
  untappd_url: string;
  untappd_source: string;
  untappd_confidence: number | null;
  untappd_resolved_at: string;
}

export function enrichBeersWithUntappd(beers: NormalizedBeer[]): Array<NormalizedBeer & UntappdResolvedMeta> {
  return beers.map((beer) => ({
    ...beer,
    ...createSearchLinkUntappdMeta(beer.name),
  }));
}

export async function ensureUntappdLinksForGame(env: Env, gameId: number): Promise<void> {
  const beers = await listBeersForUntappdMaintenance(env, gameId);
  if (!beers.length) return;

  const nowIso = new Date().toISOString();
  const updates = [] as Array<{
    beerId: number;
    untappd_url: string;
    untappd_source: string;
    untappd_confidence: number | null;
    untappd_resolved_at: string;
  }>;

  for (const beer of beers) {
    const source = String(beer?.untappd_source ?? "").trim();
    if (!beer?.name) continue;
    const fallback = createSearchLinkUntappdMeta(beer.name, nowIso);
    const existingUrl = String(beer?.untappd_url ?? "").trim();
    if (source === UNTAPPD_SEARCH_SOURCE && existingUrl === fallback.untappd_url) continue;

    updates.push({
      beerId: beer.id,
      untappd_url: fallback.untappd_url,
      untappd_source: fallback.untappd_source,
      untappd_confidence: fallback.untappd_confidence,
      untappd_resolved_at: fallback.untappd_resolved_at,
    });
  }

  await updateBeerUntappdMeta(env, gameId, updates);
}
