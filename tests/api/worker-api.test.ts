import { beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../../src/worker/index";
import type { Env } from "../../src/worker/env";
import { MockD1Database } from "./mock-d1";

function createEnv() {
  const db = new MockD1Database();
  const assetsFetch = vi.fn(async () => {
    return new Response("<!doctype html><div id=\"root\"></div>", {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  });

  const env: Env = {
    DB: db,
    ASSETS: {
      fetch: assetsFetch,
    },
    BRAVE_SEARCH_API_KEY: "",
    UNTAPPD_CLIENT_ID: "",
    UNTAPPD_CLIENT_SECRET: "",
  };

  return { env, assetsFetch };
}

async function call(env: Env, path: string, init?: RequestInit): Promise<Response> {
  const request = new Request(`https://example.com${path}`, init);
  return worker.fetch(request, env);
}

async function json(response: Response): Promise<Record<string, any>> {
  return (await response.json()) as Record<string, any>;
}

describe("worker api", () => {
  let env: Env;
  let assetsFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const setup = createEnv();
    env = setup.env;
    assetsFetch = setup.assetsFetch;
  });

  it("creates a game and returns it", async () => {
    const createRes = await call(env, "/api/create-game", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Sahti Night",
        beers: [
          { name: "Beer A", image_url: null },
          { name: "Beer B", image_url: "https://example.com/b.jpg" },
        ],
      }),
    });

    expect(createRes.status).toBe(200);
    const created = await json(createRes);
    expect(created.ok).toBe(true);
    expect(created.gameId).toBe(1);

    const gameRes = await call(env, "/api/games/1");
    expect(gameRes.status).toBe(200);
    const gamePayload = await json(gameRes);
    expect(gamePayload.game.name).toBe("Sahti Night");
    expect(gamePayload.beers).toHaveLength(2);
  });

  it("rejects create when a beer name is empty", async () => {
    const response = await call(env, "/api/create-game", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Invalid Create",
        beers: [
          { name: "Beer A", image_url: null },
          { name: "   ", image_url: null },
        ],
      }),
    });

    expect(response.status).toBe(400);
    const payload = await json(response);
    expect(payload.error).toBe("Anna nimi kaikille oluille (rivi 2)");
  });

  it("updates game and validates beer ids", async () => {
    await call(env, "/api/create-game", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Update Test",
        beers: [{ name: "Beer A", image_url: null }],
      }),
    });

    const invalidUpdate = await call(env, "/api/games/1", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Updated",
        beers: [{ id: 999, name: "Beer A", image_url: null }],
      }),
    });

    expect(invalidUpdate.status).toBe(400);

    const current = await json(await call(env, "/api/games/1"));
    const existingId = current.beers[0].id;

    const validUpdate = await call(env, "/api/games/1", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Updated",
        beers: [
          { id: existingId, name: "Beer A+", image_url: null },
          { name: "Beer B", image_url: null },
        ],
      }),
    });

    expect(validUpdate.status).toBe(200);
    const payload = await json(validUpdate);
    expect(payload.ok).toBe(true);
    expect(payload.game.name).toBe("Updated");
    expect(payload.beers).toHaveLength(2);
  });

  it("rejects update when an existing beer name is emptied", async () => {
    await call(env, "/api/create-game", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Update Empty Name",
        beers: [{ name: "Beer A", image_url: null }],
      }),
    });

    const current = await json(await call(env, "/api/games/1"));
    const existingId = current.beers[0].id;

    const response = await call(env, "/api/games/1", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Updated",
        beers: [{ id: existingId, name: " ", image_url: null }],
      }),
    });

    expect(response.status).toBe(400);
    const payload = await json(response);
    expect(payload.error).toBe("Anna nimi kaikille oluille (rivi 1)");
  });

  it("saves ratings and returns per-client ratings", async () => {
    await call(env, "/api/create-game", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Ratings",
        beers: [
          { name: "Beer A", image_url: null },
          { name: "Beer B", image_url: null },
        ],
      }),
    });

    const game = await json(await call(env, "/api/games/1"));

    const saveRes = await call(env, "/api/games/1/ratings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientId: "client-1",
        ratings: [
          { beerId: game.beers[0].id, score: 8.5 },
          { beerId: game.beers[1].id, score: 7.25 },
        ],
      }),
    });

    expect(saveRes.status).toBe(200);
    const getRes = await call(env, "/api/games/1/ratings?clientId=client-1");
    expect(getRes.status).toBe(200);
    const payload = await json(getRes);
    expect(payload.ok).toBe(true);
    expect(payload.ratings).toHaveLength(2);
  });

  it("orders results by average score then sort order", async () => {
    await call(env, "/api/create-game", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Results",
        beers: [
          { name: "Beer A", image_url: null },
          { name: "Beer B", image_url: null },
        ],
      }),
    });

    const game = await json(await call(env, "/api/games/1"));
    const beerA = game.beers[0].id;
    const beerB = game.beers[1].id;

    await call(env, "/api/games/1/ratings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientId: "p1",
        ratings: [
          { beerId: beerA, score: 6 },
          { beerId: beerB, score: 9 },
        ],
      }),
    });

    await call(env, "/api/games/1/ratings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientId: "p2",
        ratings: [
          { beerId: beerA, score: 6 },
          { beerId: beerB, score: 8 },
        ],
      }),
    });

    const resultsRes = await call(env, "/api/games/1/results");
    expect(resultsRes.status).toBe(200);
    const results = await json(resultsRes);
    expect(results.beers[0].id).toBe(beerB);
    expect(results.beers[1].id).toBe(beerA);
  });

  it("returns 503 from image search when API key missing", async () => {
    const response = await call(env, "/api/image-search?q=sahti");
    expect(response.status).toBe(503);
    const payload = await json(response);
    expect(payload.error).toContain("BRAVE_SEARCH_API_KEY");
  });

  it("validates qr endpoint and returns SVG", async () => {
    const bad = await call(env, "/api/qr");
    expect(bad.status).toBe(400);

    const ok = await call(env, "/api/qr?url=https%3A%2F%2Fexample.com%2F1");
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toContain("image/svg+xml");
    const body = await ok.text();
    expect(body).toContain("<svg");
  });

  it("serves assets for non-api routes", async () => {
    const response = await call(env, "/123");
    expect(response.status).toBe(200);
    expect(assetsFetch).toHaveBeenCalledTimes(1);
    const html = await response.text();
    expect(html).toContain("root");
  });
});
