import { describe, expect, it } from "vitest";
import { parsePath } from "../../apps/web/src/App";

describe("web route parser", () => {
  it("parses game rate route", () => {
    expect(parsePath("/123")).toEqual({ type: "game", gameId: 123, section: "rate" });
    expect(parsePath("/123/")).toEqual({ type: "game", gameId: 123, section: "rate" });
  });

  it("parses game results route", () => {
    expect(parsePath("/123/results")).toEqual({ type: "game", gameId: 123, section: "results" });
    expect(parsePath("/123/results/")).toEqual({ type: "game", gameId: 123, section: "results" });
  });

  it("parses makers route", () => {
    expect(parsePath("/makers")).toEqual({ type: "makers" });
    expect(parsePath("/makers/")).toEqual({ type: "makers" });
  });

  it("parses account route", () => {
    expect(parsePath("/account")).toEqual({ type: "account" });
    expect(parsePath("/account/")).toEqual({ type: "account" });
  });

  it("parses public reviewer pages", () => {
    expect(parsePath("/privacy")).toEqual({ type: "public-info", page: "privacy" });
    expect(parsePath("/support/")).toEqual({ type: "public-info", page: "support" });
    expect(parsePath("/delete-account")).toEqual({ type: "public-info", page: "delete-account" });
  });

  it("returns not-found for unknown routes", () => {
    expect(parsePath("/foo")).toEqual({ type: "not-found" });
    expect(parsePath("/123/other")).toEqual({ type: "not-found" });
  });
});
