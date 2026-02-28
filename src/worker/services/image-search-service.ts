import { clampInteger } from "../../shared/validation";
import { readUpstreamErrorMessage } from "../http";
import type { Env } from "../env";

export interface ImageSearchResult {
  imageUrl: string;
  thumbnailUrl: string;
  title: string;
  sourceUrl: string | null;
  sourceDomain: string;
}

function pickFirstHttpsUrl(candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    const raw = String(candidate ?? "").trim();
    if (!raw) continue;

    let parsed: URL;
    try {
      parsed = new URL(raw.startsWith("//") ? `https:${raw}` : raw);
    } catch {
      continue;
    }

    if (parsed.protocol !== "https:") continue;
    return parsed.toString();
  }
  return null;
}

function getUrlDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

function normalizeBraveImageResult(row: Record<string, any>): ImageSearchResult | null {
  const imageUrl = pickFirstHttpsUrl([row?.properties?.url, row?.image?.url, row?.src, row?.url]);
  if (!imageUrl) return null;

  const thumbnailUrl =
    pickFirstHttpsUrl([
      row?.thumbnail?.src,
      row?.thumbnail?.url,
      row?.thumbnail,
      row?.properties?.thumbnail,
    ]) ?? imageUrl;

  const sourceUrl = pickFirstHttpsUrl([
    row?.page_url,
    row?.meta_url?.url,
    row?.source?.url,
    row?.source_url,
    row?.url,
  ]);

  return {
    imageUrl,
    thumbnailUrl,
    title: String(row?.title ?? row?.description ?? "").trim(),
    sourceUrl: sourceUrl ?? null,
    sourceDomain: getUrlDomain(sourceUrl ?? imageUrl),
  };
}

export function buildImageSearchQuery(query: string): string {
  const base = String(query ?? "").replace(/"/g, " ").trim();
  if (!base) return "";

  const normalized = base.toLowerCase();
  const hints: string[] = [];

  if (!/\b(beer|olut|lager|ipa|stout|sahti)\b/i.test(normalized)) {
    hints.push("beer", "olut");
  }
  if (!/\b(bottle|pullo|can|tölkki)\b/i.test(normalized)) {
    hints.push("bottle");
  }
  if (!/\b(label|etiketti)\b/i.test(normalized)) {
    hints.push("label", "etiketti");
  }
  if (!/\b(brand|product|packaging)\b/i.test(normalized)) {
    hints.push("brand", "product", "packaging");
  }

  return `"${base}" ${hints.join(" ")}`.trim();
}

export async function searchImages(
  env: Env,
  query: string,
  countParam: unknown,
): Promise<{ ok: true; provider: "brave"; results: ImageSearchResult[] }> {
  if (query.length < 2 || query.length > 120) {
    throw new Error("Kyselyn pituuden tulee olla 2-120 merkkiä");
  }

  const effectiveQuery = buildImageSearchQuery(query);
  const count = clampInteger(countParam, 1, 12, 10);
  const apiKey = String(env.BRAVE_SEARCH_API_KEY ?? "").trim();

  if (!apiKey) {
    const err = new Error("Kuvahaku ei ole kaytossa (BRAVE_SEARCH_API_KEY puuttuu)");
    (err as any).statusCode = 503;
    throw err;
  }

  const endpoint = new URL("https://api.search.brave.com/res/v1/images/search");
  endpoint.searchParams.set("q", effectiveQuery);
  endpoint.searchParams.set("count", String(count));
  endpoint.searchParams.set("safesearch", "strict");

  let payload: Record<string, any> | null = null;
  try {
    const res = await fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        accept: "application/json",
        "X-Subscription-Token": apiKey,
      },
    });

    if (!res.ok) {
      const upstreamMessage = await readUpstreamErrorMessage(res);
      const status = res.status === 429 ? 429 : 502;
      const message = upstreamMessage
        ? `Kuvahaun pyynto epannistui (Brave ${res.status}): ${upstreamMessage}`
        : `Kuvahaun pyynto epannistui (Brave ${res.status})`;
      const err = new Error(message);
      (err as any).statusCode = status;
      throw err;
    }

    payload = (await res.json()) as Record<string, any>;
  } catch (error) {
    if ((error as any)?.statusCode) {
      throw error;
    }

    const details = String((error as Error)?.message ?? "").trim();
    const message = details
      ? `Kuvahaku ei onnistunut juuri nyt: ${details}`
      : "Kuvahaku ei onnistunut juuri nyt";
    const err = new Error(message);
    (err as any).statusCode = 502;
    throw err;
  }

  const rawResults = Array.isArray(payload?.results) ? payload.results : [];
  const unique = new Set<string>();
  const results: ImageSearchResult[] = [];

  for (const row of rawResults) {
    const normalized = normalizeBraveImageResult(row);
    if (!normalized) continue;
    if (unique.has(normalized.imageUrl)) continue;
    unique.add(normalized.imageUrl);
    results.push(normalized);
    if (results.length >= count) break;
  }

  return {
    ok: true,
    provider: "brave",
    results,
  };
}
