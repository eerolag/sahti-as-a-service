import { describe, expect, it } from "vitest";
import {
  MAX_NICKNAME_LENGTH,
  MAX_RATING_COMMENT_LENGTH,
  normalizeClientId,
  normalizeGameName,
  normalizeImageUrl,
  normalizeNickname,
  normalizeRatingComment,
} from "../../src/shared/validation";
import { normalizeBeersPayload } from "../../src/shared/game-domain";

describe("shared/validation", () => {
  it("validates game name", () => {
    expect(normalizeGameName(" ")).toEqual({ error: "Anna pelille nimi" });
    const tooLong = "a".repeat(121);
    expect(normalizeGameName(tooLong)).toHaveProperty("error");
    expect(normalizeGameName("Testipeli")).toEqual({ value: "Testipeli" });
  });

  it("validates image urls", () => {
    expect(normalizeImageUrl("https://example.com/a.jpg")).toEqual({ value: "https://example.com/a.jpg" });
    expect(normalizeImageUrl("data:image/png;base64,abc")).toEqual({ value: "data:image/png;base64,abc" });
    expect(normalizeImageUrl("ftp://example.com")).toHaveProperty("error");
  });

  it("validates client id", () => {
    expect(normalizeClientId("client-1")).toBe("client-1");
    expect(normalizeClientId("")).toBeNull();
  });

  it("validates nickname", () => {
    expect(normalizeNickname("")).toEqual({ value: null });
    expect(normalizeNickname("  Maistelija ")).toEqual({ value: "Maistelija" });
    expect(normalizeNickname("a".repeat(MAX_NICKNAME_LENGTH + 1))).toHaveProperty("error");
  });

  it("validates rating comment", () => {
    expect(normalizeRatingComment("")).toEqual({ value: null });
    expect(normalizeRatingComment("  Hyvä sahti! ")).toEqual({ value: "  Hyvä sahti! " });
    expect(normalizeRatingComment("a".repeat(MAX_RATING_COMMENT_LENGTH + 1))).toHaveProperty("error");
  });

  it("normalizes beer payload and validates ids", () => {
    const ok = normalizeBeersPayload([
      { id: 1, name: "Beer 1", image_url: null },
      { id: 2, name: "Beer 2", image_url: "https://example.com/b.png" },
    ], { allowIds: true });
    expect("beers" in ok).toBe(true);

    const missingName = normalizeBeersPayload(
      [
        { id: 1, name: "Beer 1", image_url: null },
        { id: 2, name: "   ", image_url: null },
      ],
      { allowIds: true },
    );
    expect(missingName).toEqual({ error: "Anna nimi kaikille oluille (rivi 2)" });

    const bad = normalizeBeersPayload([{ id: -1, name: "Beer", image_url: null }], { allowIds: true });
    expect("error" in bad).toBe(true);
  });
});
