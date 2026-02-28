import { scoreUntappdCandidate } from "../../shared/scoring";
import {
  UNTAPPD_API_SOURCE,
  UNTAPPD_MATCH_THRESHOLD,
  UNTAPPD_RESOLVE_CONCURRENCY,
  UNTAPPD_RESOLVE_LIMIT,
  UNTAPPD_RESOLVE_TIMEOUT_MS,
  UNTAPPD_SEARCH_SOURCE,
  buildUntappdBeerUrl,
  createSearchLinkUntappdMeta,
  isUntappdApiRecordExpired,
} from "../../shared/untappd";
import type { NormalizedBeer } from "../../shared/game-domain";
import type { Env } from "../env";
import {
  listBeersForUntappdMaintenance,
  updateBeerUntappdMeta,
} from "../repositories/beers-repo";
import { runWithConcurrency } from "./common";

interface UntappdResolvedMeta {
  untappd_url: string;
  untappd_source: string;
  untappd_confidence: number | null;
  untappd_resolved_at: string;
}

export async function resolveUntappdFromApi(env: Env, beerName: string): Promise<UntappdResolvedMeta | null> {
  const clientId = String(env.UNTAPPD_CLIENT_ID ?? "").trim();
  const clientSecret = String(env.UNTAPPD_CLIENT_SECRET ?? "").trim();
  const name = String(beerName ?? "").trim();
  if (!clientId || !clientSecret || !name) return null;

  const endpoint = new URL("https://api.untappd.com/v4/search/beer");
  endpoint.searchParams.set("q", name);
  endpoint.searchParams.set("limit", "10");
  endpoint.searchParams.set("client_id", clientId);
  endpoint.searchParams.set("client_secret", clientSecret);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UNTAPPD_RESOLVE_TIMEOUT_MS);

  let data: Record<string, any> | null = null;
  try {
    const res = await fetch(endpoint.toString(), {
      method: "GET",
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    data = (await res.json()) as Record<string, any>;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }

  const items = Array.isArray(data?.response?.beers?.items) ? data.response.beers.items : [];
  let best: { score: number; url: string } | null = null;
  for (const item of items) {
    const beer = item?.beer ?? item ?? {};
    const brewery = item?.brewery ?? {};
    const candidateName = String(beer?.beer_name ?? item?.beer_name ?? "").trim();
    const candidateUrl = buildUntappdBeerUrl(item);
    if (!candidateName || !candidateUrl) continue;

    const breweryName = String(brewery?.brewery_name ?? "").trim();
    const combinedName = breweryName ? `${candidateName} ${breweryName}` : candidateName;
    const score = Math.max(
      scoreUntappdCandidate(name, candidateName),
      scoreUntappdCandidate(name, combinedName),
    );

    if (!best || score > best.score) {
      best = { score, url: candidateUrl };
    }
  }

  if (!best || best.score < UNTAPPD_MATCH_THRESHOLD) return null;

  return {
    untappd_url: best.url,
    untappd_source: UNTAPPD_API_SOURCE,
    untappd_confidence: Number(best.score.toFixed(3)),
    untappd_resolved_at: new Date().toISOString(),
  };
}

export async function enrichBeersWithUntappd(
  env: Env,
  beers: NormalizedBeer[],
): Promise<Array<NormalizedBeer & UntappdResolvedMeta>> {
  const enriched = beers.map((beer) => ({
    ...beer,
    ...createSearchLinkUntappdMeta(beer.name),
  }));

  const hasUntappdCredentials =
    String(env.UNTAPPD_CLIENT_ID ?? "").trim() && String(env.UNTAPPD_CLIENT_SECRET ?? "").trim();

  if (!hasUntappdCredentials) {
    return enriched;
  }

  const resolveTargets = enriched
    .map((beer, idx) => ({ idx, beer }))
    .slice(0, UNTAPPD_RESOLVE_LIMIT);

  await runWithConcurrency(resolveTargets, UNTAPPD_RESOLVE_CONCURRENCY, async (target) => {
    const resolved = await resolveUntappdFromApi(env, target.beer.name);
    if (!resolved) return;
    enriched[target.idx] = {
      ...enriched[target.idx],
      ...resolved,
    };
  });

  return enriched;
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
    const hasLink = Boolean(String(beer?.untappd_url ?? "").trim());
    const sourceKnown = source === UNTAPPD_SEARCH_SOURCE || source === UNTAPPD_API_SOURCE;
    const expiredApiRecord =
      source === UNTAPPD_API_SOURCE && isUntappdApiRecordExpired(beer?.untappd_resolved_at);

    if ((hasLink && sourceKnown && !expiredApiRecord) || !beer?.name) continue;

    const fallback = createSearchLinkUntappdMeta(beer.name, nowIso);
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
