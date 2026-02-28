import { describe, expect, it } from "vitest";
import {
  buildUntappdBeerUrl,
  createSearchLinkUntappdMeta,
  isUntappdApiRecordExpired,
  sanitizeUntappdUrl,
} from "../../src/shared/untappd";

describe("shared/untappd", () => {
  it("sanitizes untappd url", () => {
    expect(sanitizeUntappdUrl("http://untappd.com/b/beer/1")).toBe("https://untappd.com/b/beer/1");
    expect(sanitizeUntappdUrl("https://example.com")).toBeNull();
  });

  it("builds fallback untappd metadata", () => {
    const meta = createSearchLinkUntappdMeta("Sahti Lager");
    expect(meta.untappd_url).toContain("untappd.com/search");
    expect(meta.untappd_source).toBe("search-link");
  });

  it("builds beer url from api object", () => {
    const url = buildUntappdBeerUrl({ beer: { beer_slug: "sahti", bid: 123 } });
    expect(url).toBe("https://untappd.com/b/sahti/123");
  });

  it("checks api cache expiration", () => {
    const now = new Date().toISOString();
    const old = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();
    expect(isUntappdApiRecordExpired(now)).toBe(false);
    expect(isUntappdApiRecordExpired(old)).toBe(true);
  });
});
