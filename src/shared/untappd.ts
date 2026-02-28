export const UNTAPPD_SEARCH_SOURCE = "search-link";
export const UNTAPPD_API_SOURCE = "untappd-api";
export const UNTAPPD_MAX_API_AGE_MS = 24 * 60 * 60 * 1000;
export const UNTAPPD_RESOLVE_LIMIT = 25;
export const UNTAPPD_RESOLVE_CONCURRENCY = 4;
export const UNTAPPD_RESOLVE_TIMEOUT_MS = 3500;
export const UNTAPPD_MATCH_THRESHOLD = 0.9;

export interface UntappdMeta {
  untappd_url: string;
  untappd_source: string;
  untappd_confidence: number | null;
  untappd_resolved_at: string;
}

export function sanitizeHttpsUrl(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw.startsWith("//") ? `https:${raw}` : raw);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;
  return parsed.toString();
}

export function sanitizeUntappdUrl(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw.startsWith("//") ? `https:${raw}` : raw);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!parsed.hostname.toLowerCase().endsWith("untappd.com")) return null;
  parsed.protocol = "https:";
  return parsed.toString();
}

export function createUntappdSearchUrl(name: unknown): string {
  return `https://untappd.com/search?q=${encodeURIComponent(String(name ?? "").trim())}`;
}

export function createSearchLinkUntappdMeta(
  name: string,
  resolvedAt = new Date().toISOString(),
): UntappdMeta {
  return {
    untappd_url: createUntappdSearchUrl(name),
    untappd_source: UNTAPPD_SEARCH_SOURCE,
    untappd_confidence: null,
    untappd_resolved_at: resolvedAt,
  };
}

export function buildUntappdBeerUrl(item: Record<string, any>): string | null {
  const beer = item?.beer ?? item ?? {};

  const directUrl = sanitizeUntappdUrl(
    beer?.beer_url ?? beer?.url ?? item?.url ?? item?.beer_url,
  );
  if (directUrl) return directUrl;

  const slug = String(beer?.beer_slug ?? "").trim();
  const bid = Number(beer?.bid ?? item?.bid);
  if (!slug || !Number.isInteger(bid) || bid <= 0) return null;

  return `https://untappd.com/b/${encodeURIComponent(slug)}/${bid}`;
}

export function isUntappdApiRecordExpired(resolvedAt: unknown): boolean {
  const ts = Date.parse(String(resolvedAt ?? ""));
  if (!Number.isFinite(ts)) return true;
  return Date.now() - ts > UNTAPPD_MAX_API_AGE_MS;
}
