import type { Env } from "./env";
import { json } from "./http";
import { handleCreateGame, handleGetGame, handleUpdateGame } from "./handlers/games";
import { handleGetRatings, handleSaveRatings } from "./handlers/ratings";
import { handleGetResults } from "./handlers/results";
import { handleImageSearch } from "./handlers/image-search";
import { handleGetQr } from "./handlers/qr";
import { handleGetImage, handleUploadImage } from "./handlers/images";
import { handleIdentifyBeerNameFromImage } from "./handlers/image-identify";

export async function routeApi(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  const { pathname } = url;

  if (pathname === "/api/create-game" && request.method === "POST") {
    return handleCreateGame(request, env);
  }

  const gameMatch = pathname.match(/^\/api\/games\/(\d+)$/);
  if (gameMatch) {
    const gameId = Number(gameMatch[1]);
    if (request.method === "GET") {
      return handleGetGame(gameId, env);
    }
    if (request.method === "PUT") {
      return handleUpdateGame(gameId, request, env);
    }
    return json({ error: "Not found" }, 404);
  }

  const ratingsMatch = pathname.match(/^\/api\/games\/(\d+)\/ratings$/);
  if (ratingsMatch) {
    const gameId = Number(ratingsMatch[1]);
    if (request.method === "POST") {
      return handleSaveRatings(gameId, request, env);
    }
    if (request.method === "GET") {
      return handleGetRatings(gameId, request, env);
    }
    return json({ error: "Not found" }, 404);
  }

  const resultsMatch = pathname.match(/^\/api\/games\/(\d+)\/results$/);
  if (resultsMatch) {
    if (request.method === "GET") {
      return handleGetResults(Number(resultsMatch[1]), env);
    }
    return json({ error: "Not found" }, 404);
  }

  if (pathname === "/api/image-search") {
    if (request.method === "GET") {
      return handleImageSearch(url, env);
    }
    return json({ error: "Not found" }, 404);
  }

  if (pathname === "/api/images/upload") {
    if (request.method === "POST") {
      return handleUploadImage(request, env);
    }
    return json({ error: "Not found" }, 404);
  }

  if (pathname === "/api/images/identify-beer-name") {
    if (request.method === "POST") {
      return handleIdentifyBeerNameFromImage(request, env);
    }
    return json({ error: "Not found" }, 404);
  }

  const imageMatch = pathname.match(/^\/api\/images\/([^/]+)$/);
  if (imageMatch) {
    if (request.method === "GET") {
      let key: string;
      try {
        key = decodeURIComponent(imageMatch[1]);
      } catch {
        return json({ error: "Kuvaa ei löytynyt" }, 404);
      }
      return handleGetImage(key, env);
    }
    return json({ error: "Not found" }, 404);
  }

  if (pathname === "/api/qr") {
    if (request.method === "GET") {
      return handleGetQr(url, env);
    }
    return json({ error: "Not found" }, 404);
  }

  if (pathname.startsWith("/api/")) {
    return json({ error: "Not found" }, 404);
  }

  return null;
}
