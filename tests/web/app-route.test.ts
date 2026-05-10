import { describe, expect, it } from "vitest";
import { parsePath } from "../../apps/web/src/App";

describe("web route parser", () => {
  it("parses game rate route", () => {
    expect(parsePath("/123")).toEqual({ type: "game", gameId: 123, section: "rate", legacy: true });
    expect(parsePath("/123/")).toEqual({ type: "game", gameId: 123, section: "rate", legacy: true });
  });

  it("parses game results route", () => {
    expect(parsePath("/123/results")).toEqual({ type: "game", gameId: 123, section: "results", legacy: true });
    expect(parsePath("/123/results/")).toEqual({ type: "game", gameId: 123, section: "results", legacy: true });
  });

  it("parses unguessable session routes", () => {
    expect(parsePath("/s/abc_123")).toEqual({ type: "session", shareId: "abc_123", section: "rate", host: false });
    expect(parsePath("/s/abc_123/results")).toEqual({
      type: "session",
      shareId: "abc_123",
      section: "results",
      host: false,
    });
    expect(parsePath("/h/abc_123")).toEqual({ type: "session", shareId: "abc_123", section: "rate", host: true });
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
