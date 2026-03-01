import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_IMAGE_UPLOAD_BYTES } from "../../src/shared/image-upload";
import worker from "../../src/worker/index";
import type { Env } from "../../src/worker/env";
import { MockD1Database } from "./mock-d1";
import { MockR2Bucket } from "./mock-r2";

function createEnv() {
  const db = new MockD1Database();
  const images = new MockR2Bucket();
  const assetsFetch = vi.fn(async () => {
    return new Response("<!doctype html><div id=\"root\"></div>", {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  });

  const env: Env = {
    DB: db,
    IMAGES_BUCKET: images,
    ASSETS: {
      fetch: assetsFetch,
    },
    BRAVE_SEARCH_API_KEY: "",
    UNTAPPD_CLIENT_ID: "",
    UNTAPPD_CLIENT_SECRET: "",
  };

  return { env, assetsFetch, images };
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
  let db: MockD1Database;
  let images: MockR2Bucket;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();

    const setup = createEnv();
    env = setup.env;
    assetsFetch = setup.assetsFetch;
    images = setup.images;
    db = setup.env.DB as MockD1Database;
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
        nickname: "Maistelija",
        ratings: [
          { beerId: game.beers[0].id, score: 8.5, comment: "Toimii hyvin sahtina" },
          { beerId: game.beers[1].id, score: 7.25, comment: "" },
        ],
      }),
    });

    expect(saveRes.status).toBe(200);
    const getRes = await call(env, "/api/games/1/ratings?clientId=client-1");
    expect(getRes.status).toBe(200);
    const payload = await json(getRes);
    expect(payload.ok).toBe(true);
    expect(payload.ratings).toHaveLength(2);
    expect(payload.ratings[0].comment).toBe("Toimii hyvin sahtina");
    expect(payload.ratings[1].comment).toBeNull();
  });

  it("rejects save ratings when nickname is too long", async () => {
    await call(env, "/api/create-game", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Ratings nickname check",
        beers: [{ name: "Beer A", image_url: null }],
      }),
    });

    const game = await json(await call(env, "/api/games/1"));
    const response = await call(env, "/api/games/1/ratings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientId: "client-long",
        nickname: "x".repeat(41),
        ratings: [{ beerId: game.beers[0].id, score: 7 }],
      }),
    });

    expect(response.status).toBe(400);
    const payload = await json(response);
    expect(payload.error).toContain("Nimimerkki on liian pitkä");
  });

  it("rejects save ratings when comment is too long", async () => {
    await call(env, "/api/create-game", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Ratings comment check",
        beers: [{ name: "Beer A", image_url: null }],
      }),
    });

    const game = await json(await call(env, "/api/games/1"));
    const response = await call(env, "/api/games/1/ratings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientId: "client-comment",
        ratings: [{ beerId: game.beers[0].id, score: 7, comment: "x".repeat(256) }],
      }),
    });

    expect(response.status).toBe(400);
    const payload = await json(response);
    expect(payload.error).toContain("Kommentti on liian pitkä");
  });

  it("updates player nickname for an existing client id", async () => {
    await call(env, "/api/create-game", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Nickname update",
        beers: [{ name: "Beer A", image_url: null }],
      }),
    });

    const game = await json(await call(env, "/api/games/1"));
    const beerId = game.beers[0].id;

    const firstSave = await call(env, "/api/games/1/ratings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientId: "same-client",
        nickname: "Ensimmäinen",
        ratings: [{ beerId, score: 7 }],
      }),
    });
    expect(firstSave.status).toBe(200);

    const secondSave = await call(env, "/api/games/1/ratings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientId: "same-client",
        nickname: "Toinen",
        ratings: [{ beerId, score: 8 }],
      }),
    });
    expect(secondSave.status).toBe(200);

    const player = db.getPlayer(1, "same-client");
    expect(player).not.toBeNull();
    expect(player?.nickname).toBe("Toinen");
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

  it("uploads an image to R2 and returns proxy url", async () => {
    const form = new FormData();
    form.set("file", new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/jpeg" }), "beer.jpg");

    const response = await call(env, "/api/images/upload", {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(200);
    const payload = await json(response);
    expect(payload.ok).toBe(true);
    expect(payload.contentType).toBe("image/jpeg");
    expect(payload.bytes).toBe(4);
    expect(payload.imageUrl).toMatch(/^https:\/\/example\.com\/api\/images\//);
    expect(images.has(String(payload.key))).toBe(true);
  });

  it("rejects too large image upload", async () => {
    const form = new FormData();
    form.set(
      "file",
      new Blob([new Uint8Array(MAX_IMAGE_UPLOAD_BYTES + 1)], { type: "image/jpeg" }),
      "large.jpg",
    );

    const response = await call(env, "/api/images/upload", {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(413);
  });

  it("rejects non-image upload", async () => {
    const form = new FormData();
    form.set("file", new Blob(["hello"], { type: "text/plain" }), "note.txt");

    const response = await call(env, "/api/images/upload", {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(400);
  });

  it("returns 503 from image identify when KILO_API_KEY is missing", async () => {
    const form = new FormData();
    form.set("file", new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }), "beer.jpg");

    const response = await call(env, "/api/images/identify-beer-name", {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(503);
    const payload = await json(response);
    expect(payload.error).toContain("KILO_API_KEY");
  });

  it("rejects image identify when file is missing or invalid", async () => {
    env.KILO_API_KEY = "kilo-test-key";
    const form = new FormData();
    form.set("file", new Blob(["hello"], { type: "text/plain" }), "note.txt");

    const response = await call(env, "/api/images/identify-beer-name", {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(400);
  });

  it("identifies beer name from uploaded image via Kilo gateway", async () => {
    env.KILO_API_KEY = "kilo-test-key";
    const upstreamFetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: "Karhu III",
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    });
    vi.stubGlobal("fetch", upstreamFetch);

    const form = new FormData();
    form.set("file", new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/jpeg" }), "beer.jpg");

    const response = await call(env, "/api/images/identify-beer-name", {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(200);
    const payload = await json(response);
    expect(payload.ok).toBe(true);
    expect(payload.beerName).toBe("Karhu III");
    expect(payload.model).toBe("moonshotai/kimi-k2.5");

    expect(upstreamFetch).toHaveBeenCalledTimes(1);
    const firstCall = upstreamFetch.mock.calls[0];
    expect(firstCall).toBeTruthy();
    const url = String(firstCall?.[0] ?? "");
    const init = (firstCall?.[1] ?? {}) as RequestInit;
    expect(url).toBe("https://api.kilo.ai/api/gateway/openai/chat/completions");
    const requestBody = JSON.parse(String(init.body)) as Record<string, any>;
    expect(requestBody.model).toBe("moonshotai/kimi-k2.5");
    expect(requestBody.messages?.[0]?.content?.[1]?.image_url?.url).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("returns 422 when Kilo cannot identify a reliable beer name", async () => {
    env.KILO_API_KEY = "kilo-test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "UNKNOWN",
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }),
    );

    const form = new FormData();
    form.set("file", new Blob([new Uint8Array([9, 9])], { type: "image/png" }), "beer.png");

    const response = await call(env, "/api/images/identify-beer-name", {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(422);
  });

  it("maps Kilo 429 to API 429", async () => {
    env.KILO_API_KEY = "kilo-test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(JSON.stringify({ error: { message: "rate limit" } }), {
          status: 429,
          headers: { "content-type": "application/json" },
        });
      }),
    );

    const form = new FormData();
    form.set("file", new Blob([new Uint8Array([7, 7])], { type: "image/webp" }), "beer.webp");

    const response = await call(env, "/api/images/identify-beer-name", {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(429);
  });

  it("serves uploaded image from /api/images/:key", async () => {
    const uploadForm = new FormData();
    uploadForm.set("file", new Blob([new Uint8Array([7, 8, 9])], { type: "image/webp" }), "beer.webp");

    const uploadResponse = await call(env, "/api/images/upload", {
      method: "POST",
      body: uploadForm,
    });
    const uploadPayload = await json(uploadResponse);

    const imagePath = new URL(String(uploadPayload.imageUrl)).pathname;
    const getResponse = await call(env, imagePath);
    expect(getResponse.status).toBe(200);
    expect(getResponse.headers.get("content-type")).toContain("image/webp");
    const bytes = new Uint8Array(await getResponse.arrayBuffer());
    expect(Array.from(bytes)).toEqual([7, 8, 9]);
  });

  it("deletes old R2 image key when beer image is replaced", async () => {
    const firstUploadForm = new FormData();
    firstUploadForm.set("file", new Blob([new Uint8Array([1])], { type: "image/jpeg" }), "one.jpg");
    const firstUpload = await json(await call(env, "/api/images/upload", { method: "POST", body: firstUploadForm }));

    const createResponse = await call(env, "/api/create-game", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Replace Image",
        beers: [{ name: "Beer A", image_url: firstUpload.imageUrl }],
      }),
    });
    expect(createResponse.status).toBe(200);

    const game = await json(await call(env, "/api/games/1"));
    const beerId = game.beers[0].id;

    const secondUploadForm = new FormData();
    secondUploadForm.set("file", new Blob([new Uint8Array([2])], { type: "image/jpeg" }), "two.jpg");
    const secondUpload = await json(await call(env, "/api/images/upload", { method: "POST", body: secondUploadForm }));

    const updateResponse = await call(env, "/api/games/1", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Replace Image",
        beers: [{ id: beerId, name: "Beer A", image_url: secondUpload.imageUrl }],
      }),
    });
    expect(updateResponse.status).toBe(200);

    expect(images.has(String(firstUpload.key))).toBe(false);
    expect(images.has(String(secondUpload.key))).toBe(true);
  });

  it("deletes R2 image key when beer row is removed", async () => {
    const uploadForm = new FormData();
    uploadForm.set("file", new Blob([new Uint8Array([3, 3])], { type: "image/jpeg" }), "drop.jpg");
    const upload = await json(await call(env, "/api/images/upload", { method: "POST", body: uploadForm }));

    await call(env, "/api/create-game", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Delete Image Row",
        beers: [
          { name: "Beer A", image_url: upload.imageUrl },
          { name: "Beer B", image_url: null },
        ],
      }),
    });

    const game = await json(await call(env, "/api/games/1"));
    const beerB = game.beers.find((row: Record<string, any>) => row.name === "Beer B");
    expect(beerB).toBeTruthy();

    const updateResponse = await call(env, "/api/games/1", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Delete Image Row",
        beers: [{ id: beerB.id, name: "Beer B", image_url: null }],
      }),
    });
    expect(updateResponse.status).toBe(200);
    expect(images.has(String(upload.key))).toBe(false);
  });

  it("keeps supporting legacy data:image URLs in create/update", async () => {
    const legacyImage = "data:image/png;base64,abc123";

    const createResponse = await call(env, "/api/create-game", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Legacy Data URL",
        beers: [{ name: "Beer A", image_url: legacyImage }],
      }),
    });
    expect(createResponse.status).toBe(200);

    const game = await json(await call(env, "/api/games/1"));
    const beerId = game.beers[0].id;

    const updateResponse = await call(env, "/api/games/1", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Legacy Data URL Updated",
        beers: [{ id: beerId, name: "Beer A+", image_url: legacyImage }],
      }),
    });
    expect(updateResponse.status).toBe(200);
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
