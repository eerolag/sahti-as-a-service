import { describe, expect, it } from "vitest";
import {
  createUntappdSearchUrl,
  createSearchLinkUntappdMeta,
} from "@breview/shared/untappd";

describe("shared/untappd", () => {
  it("builds fallback untappd metadata", () => {
    const meta = createSearchLinkUntappdMeta("Sahti Lager");
    expect(meta.untappd_url).toBe("https://untappd.com/search?q=Sahti%20Lager");
    expect(meta.untappd_source).toBe("search-link");
    expect(meta.untappd_confidence).toBeNull();
  });

  it("encodes the outbound search link query", () => {
    expect(createUntappdSearchUrl("Karhu III & IPA")).toBe(
      "https://untappd.com/search?q=Karhu%20III%20%26%20IPA",
    );
  });
});
