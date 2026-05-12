import { describe, expect, it } from "vitest";
import { normalizeScore, normalizeSessionSettings, resolveLocale } from "@breview/shared";

describe("session settings", () => {
  it("normalizes default and custom rating settings", () => {
    expect(normalizeSessionSettings(undefined)).toEqual({
      value: {
        ratingConfig: { mode: "slider", scoreMin: 0, scoreMax: 10, scoreStep: 0.25 },
        resultsVisibility: "live",
      },
    });

    expect(
      normalizeSessionSettings({
        ratingMode: "stars",
        resultsVisibility: "host_reveal",
      }),
    ).toEqual({
      value: {
        ratingConfig: { mode: "stars", scoreMin: 0, scoreMax: 5, scoreStep: 0.5 },
        resultsVisibility: "host_reveal",
      },
    });
  });

  it("snaps scores to the configured scale", () => {
    expect(normalizeScore(4.76, { mode: "stars", scoreMin: 0, scoreMax: 5, scoreStep: 0.5 })).toBe(5);
    expect(normalizeScore(0, { mode: "slider", scoreMin: 1, scoreMax: 10, scoreStep: 0.25 })).toBe(1);
  });

  it("resolves supported locales with a stable Finnish fallback", () => {
    expect(resolveLocale(["fi-FI", "en-US"])).toBe("fi");
    expect(resolveLocale(["sv-SE"])).toBe("sv");
    expect(resolveLocale(["nl-BE"])).toBe("nl");
    expect(resolveLocale(["xx-YY"])).toBe("en");
  });
});
