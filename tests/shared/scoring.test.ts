import { describe, expect, it } from "vitest";
import { normalizeScore } from "@breview/shared/scoring";

describe("shared/scoring", () => {
  it("normalizes and clamps score", () => {
    expect(normalizeScore(8.123)).toBe(8.12);
    expect(normalizeScore(999)).toBe(10);
    expect(normalizeScore(-2)).toBe(0);
    expect(normalizeScore("x")).toBeNull();
  });
});
