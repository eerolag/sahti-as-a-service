import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_IMAGE_UPLOAD_BYTES } from "@breview/shared/image-upload";
import worker from "../../apps/api/src/index";
import type { Env } from "../../apps/api/src/env";
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
    expect(gamePayload.beers[0].untappd_url).toBe("https://untappd.com/search?q=Beer%20A");
    expect(gamePayload.beers[0].untappd_source).toBe("search-link");
    expect(gamePayload.beers[0].untappd_confidence).toBeNull();
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

  it("orders results by average score then sort order and includes players", async () => {
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
        nickname: "Aatu",
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
        nickname: "Bea",
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
    expect(results.summary.players).toBe(2);
    expect(results.players).toEqual([{ nickname: "Aatu" }, { nickname: "Bea" }]);
  });

  it("returns latest nickname value in results player list", async () => {
    await call(env, "/api/create-game", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Results nickname update",
        beers: [{ name: "Beer A", image_url: null }],
      }),
    });

    const game = await json(await call(env, "/api/games/1"));
    const beerA = game.beers[0].id;

    await call(env, "/api/games/1/ratings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientId: "shared-client",
        nickname: "Vanhanimi",
        ratings: [{ beerId: beerA, score: 7.2 }],
      }),
    });

    await call(env, "/api/games/1/ratings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientId: "shared-client",
        nickname: "Uusin nimi",
        ratings: [{ beerId: beerA, score: 8.4 }],
      }),
    });

    const resultsRes = await call(env, "/api/games/1/results");
    expect(resultsRes.status).toBe(200);
    const results = await json(resultsRes);
    expect(results.summary.players).toBe(1);
    expect(results.players).toEqual([{ nickname: "Uusin nimi" }]);
  });

  it("does not expose the paid image search endpoint", async () => {
    const response = await call(env, "/api/image-search?q=sahti");
    expect(response.status).toBe(404);
    const payload = await json(response);
    expect(payload.error).toBe("Not found");
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

  it("returns 503 from image identify when Workers AI binding is missing", async () => {
    const form = new FormData();
    form.set("file", new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }), "beer.jpg");

    const response = await call(env, "/api/images/identify-beer-name", {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(503);
    const payload = await json(response);
    expect(payload.error).toContain("AI");
  });

  it("rejects image identify when file is missing or invalid", async () => {
    const form = new FormData();
    form.set("file", new Blob(["hello"], { type: "text/plain" }), "note.txt");

    const response = await call(env, "/api/images/identify-beer-name", {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(400);
  });

  it("identifies beer name from uploaded image via Workers AI", async () => {
    const aiRun = vi.fn(async (_model: string, _input: Record<string, unknown>) => {
      return {
        choices: [
          {
            message: {
              content: "Karhu III",
            },
          },
        ],
      };
    });
    env.AI = { run: aiRun };

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
    expect(payload.model).toBe("@cf/google/gemma-4-26b-a4b-it");

    expect(aiRun).toHaveBeenCalledTimes(1);
    const firstCall = aiRun.mock.calls[0];
    expect(firstCall).toBeTruthy();
    expect(firstCall?.[0]).toBe("@cf/google/gemma-4-26b-a4b-it");
    const requestBody = (firstCall?.[1] ?? {}) as Record<string, any>;
    expect(requestBody.response_format).toEqual({ type: "json_object" });
    expect(requestBody.messages?.[1]?.content?.[1]?.image_url?.url).toMatch(/^data:image\/jpeg;base64,/);
    expect(requestBody.messages?.[1]?.content?.[1]?.image_url?.detail).toBe("high");
  });

  it("identifies beer name from JSON Workers AI response", async () => {
    env.AI = {
      run: vi.fn(async () => {
        return {
          choices: [
            {
              message: {
                content: "{\"beerName\":\"Karhu\"}",
              },
            },
          ],
        };
      }),
    };

    const form = new FormData();
    form.set("file", new Blob([new Uint8Array([1, 2])], { type: "image/jpeg" }), "beer.jpg");

    const response = await call(env, "/api/images/identify-beer-name", {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(200);
    const payload = await json(response);
    expect(payload.beerName).toBe("Karhu");
  });

  it("reads Kimi reasoning field and disables Kimi thinking in fallback request", async () => {
    const aiRun = vi.fn(async (model: string, _input: Record<string, unknown>) => {
      if (model === "@cf/google/gemma-4-26b-a4b-it") {
        return {
          choices: [
            {
              message: {
                content: "{\"beerName\":null}",
              },
            },
          ],
        };
      }

      return {
        choices: [
          {
            message: {
              content: "",
              reasoning: "{\"beerName\":\"Karhu III\"}",
            },
          },
        ],
      };
    });
    env.AI = { run: aiRun };

    const form = new FormData();
    form.set("file", new Blob([new Uint8Array([1, 2])], { type: "image/jpeg" }), "beer.jpg");

    const response = await call(env, "/api/images/identify-beer-name", {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(200);
    const payload = await json(response);
    expect(payload.beerName).toBe("Karhu III");

    expect(aiRun).toHaveBeenCalledTimes(2);
    const fallbackBody = aiRun.mock.calls[1]?.[1] as Record<string, any>;
    expect(fallbackBody.chat_template_kwargs).toEqual({ thinking: false });
  });

  it("treats empty Workers AI responses as service failures", async () => {
    env.AI = {
      run: vi.fn(async () => {
        return {
          choices: [
            {
              message: {
                content: "",
              },
            },
          ],
        };
      }),
    };

    const form = new FormData();
    form.set("file", new Blob([new Uint8Array([8, 8])], { type: "image/jpeg" }), "beer.jpg");

    const response = await call(env, "/api/images/identify-beer-name", {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(502);
    const payload = await json(response);
    expect(String(payload.error)).toContain("ei palauttanut tekstivastausta");
  });

  it("returns 422 when Workers AI cannot identify a reliable beer name", async () => {
    env.AI = {
      run: vi.fn(async () => {
        return {
          choices: [
            {
              message: {
                content: "UNKNOWN",
              },
            },
          ],
        };
      }),
    };

    const form = new FormData();
    form.set("file", new Blob([new Uint8Array([9, 9])], { type: "image/png" }), "beer.png");

    const response = await call(env, "/api/images/identify-beer-name", {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(422);
    const payload = await json(response);
    expect(String(payload.error)).toContain("vastasi");
  });

  it("extracts beer name from best-guess style model response", async () => {
    env.AI = {
      run: vi.fn(async () => {
        return {
          choices: [
            {
              message: {
                content: "I cannot determine this with full certainty. Best guess: Karhu III",
              },
            },
          ],
        };
      }),
    };

    const form = new FormData();
    form.set("file", new Blob([new Uint8Array([5, 5])], { type: "image/jpeg" }), "beer.jpg");

    const response = await call(env, "/api/images/identify-beer-name", {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(200);
    const payload = await json(response);
    expect(payload.beerName).toBe("Karhu III");
  });

  it("does not accept model process headings as beer names", async () => {
    env.AI = {
      run: vi.fn(async () => {
        return {
          choices: [
            {
              message: {
                content: "**Scan for text:**",
              },
            },
          ],
        };
      }),
    };

    const form = new FormData();
    form.set("file", new Blob([new Uint8Array([6, 6])], { type: "image/jpeg" }), "beer.jpg");

    const response = await call(env, "/api/images/identify-beer-name", {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(422);
  });

  it("does not accept app form text as beer names", async () => {
    env.AI = {
      run: vi.fn(async () => {
        return {
          choices: [
            {
              message: {
                content: "Pelin nimi ja oluen nimi ovat pak",
              },
            },
          ],
        };
      }),
    };

    const form = new FormData();
    form.set("file", new Blob([new Uint8Array([2, 4])], { type: "image/jpeg" }), "screen.jpg");

    const response = await call(env, "/api/images/identify-beer-name", {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(422);
  });

  it("does not accept generic image text descriptions as beer names", async () => {
    env.AI = {
      run: vi.fn(async () => {
        return {
          choices: [
            {
              message: {
                content: "The text is in Finnish.",
              },
            },
          ],
        };
      }),
    };

    const form = new FormData();
    form.set("file", new Blob([new Uint8Array([2, 5])], { type: "image/jpeg" }), "screen.jpg");

    const response = await call(env, "/api/images/identify-beer-name", {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(422);
  });

  it("does not accept model instruction prose as beer names", async () => {
    env.AI = {
      run: vi.fn(async () => {
        return {
          choices: [
            {
              message: {
                content: "The user wants me to extract a beer name from the provided image.",
              },
            },
          ],
        };
      }),
    };

    const form = new FormData();
    form.set("file", new Blob([new Uint8Array([2, 6])], { type: "image/jpeg" }), "screen.jpg");

    const response = await call(env, "/api/images/identify-beer-name", {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(422);
  });

  it("extracts embedded beer names from explanatory model text", async () => {
    env.AI = {
      run: vi.fn(async () => {
        return {
          choices: [
            {
              message: {
                content: "**Scan for text:**\nThe beer name is Karhu III.",
              },
            },
          ],
        };
      }),
    };

    const form = new FormData();
    form.set("file", new Blob([new Uint8Array([4, 4])], { type: "image/jpeg" }), "beer.jpg");

    const response = await call(env, "/api/images/identify-beer-name", {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(200);
    const payload = await json(response);
    expect(payload.beerName).toBe("Karhu III");
  });

  it("maps Workers AI 429 to API 429", async () => {
    env.AI = {
      run: vi.fn(async () => {
        throw Object.assign(new Error("rate limit"), { status: 429 });
      }),
    };

    const form = new FormData();
    form.set("file", new Blob([new Uint8Array([7, 7])], { type: "image/webp" }), "beer.webp");

    const response = await call(env, "/api/images/identify-beer-name", {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(429);
  });

  it("returns helpful timeout message when Workers AI request is aborted", async () => {
    env.AI = {
      run: vi.fn(async () => {
        throw Object.assign(new Error("The operation was aborted."), { name: "AbortError" });
      }),
    };

    const form = new FormData();
    form.set("file", new Blob([new Uint8Array([3, 1, 4])], { type: "image/jpeg" }), "beer.jpg");

    const response = await call(env, "/api/images/identify-beer-name", {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(502);
    const payload = await json(response);
    expect(String(payload.error)).toContain("aikakatkaistiin");
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
