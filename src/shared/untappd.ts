export const UNTAPPD_SEARCH_SOURCE = "search-link";

export interface UntappdMeta {
  untappd_url: string;
  untappd_source: string;
  untappd_confidence: number | null;
  untappd_resolved_at: string;
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
