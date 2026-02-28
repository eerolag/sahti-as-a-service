import { describe, expect, it } from "vitest";
import { normalizeScore, scoreUntappdCandidate } from "../../src/shared/scoring";

describe("shared/scoring", () => {
  it("normalizes and clamps score", () => {
    expect(normalizeScore(8.123)).toBe(8.12);
    expect(normalizeScore(999)).toBe(10);
    expect(normalizeScore(-2)).toBe(0);
    expect(normalizeScore("x")).toBeNull();
  });

  it("scores exact and partial untappd matches", () => {
    expect(scoreUntappdCandidate("Sahti Lager", "Sahti Lager")).toBe(1);
    expect(scoreUntappdCandidate("Sahti", "Sahti Lager")).toBeGreaterThan(0.9);
    expect(scoreUntappdCandidate("Completely Different", "Sahti Lager")).toBe(0);
  });
});
