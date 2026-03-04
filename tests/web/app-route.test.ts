import { describe, expect, it } from "vitest";
import { parsePath } from "../../src/web/App";

describe("web route parser", () => {
  it("parses game rate route", () => {
    expect(parsePath("/123")).toEqual({ type: "game", gameId: 123, section: "rate" });
    expect(parsePath("/123/")).toEqual({ type: "game", gameId: 123, section: "rate" });
  });

  it("parses game results route", () => {
    expect(parsePath("/123/results")).toEqual({ type: "game", gameId: 123, section: "results" });
    expect(parsePath("/123/results/")).toEqual({ type: "game", gameId: 123, section: "results" });
  });

  it("returns not-found for unknown routes", () => {
    expect(parsePath("/foo")).toEqual({ type: "not-found" });
    expect(parsePath("/123/other")).toEqual({ type: "not-found" });
  });
});
