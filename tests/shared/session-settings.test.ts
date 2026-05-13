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
        ratingConfig: { mode: "stars", scoreMin: 0, scoreMax: 5, scoreStep: 1 },
        resultsVisibility: "host_reveal",
      },
    });
  });

  it("snaps scores to the configured scale", () => {
    expect(normalizeScore(4.4, { mode: "stars", scoreMin: 0, scoreMax: 5, scoreStep: 1 })).toBe(4);
    expect(normalizeScore(0, { mode: "slider", scoreMin: 1, scoreMax: 10, scoreStep: 0.25 })).toBe(1);
  });

  it("only allows 5 or 10 whole-star rating scales", () => {
    expect(
      normalizeSessionSettings({
        ratingMode: "stars",
        scoreMax: 10,
        scoreStep: 0.25,
      }),
    ).toEqual({
      value: {
        ratingConfig: { mode: "stars", scoreMin: 0, scoreMax: 10, scoreStep: 1 },
        resultsVisibility: "live",
      },
    });

    expect(
      normalizeSessionSettings({
        ratingMode: "stars",
        scoreMax: 7,
      }),
    ).toEqual({ error: "Tähtiarvostelun määrä voi olla vain 5 tai 10" });
  });

  it("resolves supported locales with a stable Finnish fallback", () => {
    expect(resolveLocale(["fi-FI", "en-US"])).toBe("fi");
    expect(resolveLocale(["sv-SE"])).toBe("sv");
    expect(resolveLocale(["nl-BE"])).toBe("nl");
    expect(resolveLocale(["xx-YY"])).toBe("en");
  });
});
