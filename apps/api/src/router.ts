import type { Env } from "./env";
import { json } from "./http";
import {
  handleCreateGame,
  handleGetGame,
  handleGetSession,
  handleRevealSessionResults,
  handleUpdateGame,
  handleUpdateSession,
} from "./handlers/games";
import { handleGetRatings, handleSaveRatings } from "./handlers/ratings";
import { handleGetResults } from "./handlers/results";
import { handleCreateReport } from "./handlers/reports";
import { handleGetQr } from "./handlers/qr";
import { handleGetImage, handleUploadImage } from "./handlers/images";
import { handleIdentifyBeerNameFromImage } from "./handlers/image-identify";
import { handleAndroidAssetLinks, handleAppleAppSiteAssociation } from "./handlers/app-links";
import { getGameByPublicId } from "./repositories/games-repo";
import {
  handleDeleteAccount,
  handleGetAccount,
  handleLogout,
  handleRequestLoginCode,
  handleVerifyLoginCode,
} from "./handlers/auth";

export async function routeApi(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  const { pathname } = url;

  if (pathname === "/.well-known/apple-app-site-association") {
    if (request.method === "GET" || request.method === "HEAD") {
      return handleAppleAppSiteAssociation(request, env);
    }
    return json({ error: "Not found" }, 404);
  }

  if (pathname === "/.well-known/assetlinks.json") {
    if (request.method === "GET" || request.method === "HEAD") {
      return handleAndroidAssetLinks(request, env);
    }
    return json({ error: "Not found" }, 404);
  }

  if (pathname === "/api/create-game" && request.method === "POST") {
    return handleCreateGame(request, env);
  }

  const sessionMatch = pathname.match(/^\/api\/sessions\/([A-Za-z0-9_-]+)$/);
  if (sessionMatch) {
    const publicId = sessionMatch[1];
    if (request.method === "GET") {
      return handleGetSession(publicId, env);
    }
    if (request.method === "PUT") {
      return handleUpdateSession(publicId, request, env);
    }
    return json({ error: "Not found" }, 404);
  }

  const sessionRatingsMatch = pathname.match(/^\/api\/sessions\/([A-Za-z0-9_-]+)\/ratings$/);
  if (sessionRatingsMatch) {
    const game = await getGameByPublicId(env, sessionRatingsMatch[1]);
    if (!game) return json({ error: "Sessiota ei löytynyt" }, 404);
    if (request.method === "POST") {
      return handleSaveRatings(game.id, request, env);
    }
    if (request.method === "GET") {
      return handleGetRatings(game.id, request, env);
    }
    return json({ error: "Not found" }, 404);
  }

  const sessionResultsMatch = pathname.match(/^\/api\/sessions\/([A-Za-z0-9_-]+)\/results$/);
  if (sessionResultsMatch) {
    const game = await getGameByPublicId(env, sessionResultsMatch[1]);
    if (!game) return json({ error: "Sessiota ei löytynyt" }, 404);
    if (request.method === "GET") {
      return handleGetResults(game.id, request, env, game);
    }
    return json({ error: "Not found" }, 404);
  }

  const revealResultsMatch = pathname.match(/^\/api\/sessions\/([A-Za-z0-9_-]+)\/reveal-results$/);
  if (revealResultsMatch) {
    if (request.method === "POST") {
      return handleRevealSessionResults(revealResultsMatch[1], request, env);
    }
    return json({ error: "Not found" }, 404);
  }

  const sessionReportMatch = pathname.match(/^\/api\/sessions\/([A-Za-z0-9_-]+)\/reports$/);
  if (sessionReportMatch) {
    const game = await getGameByPublicId(env, sessionReportMatch[1]);
    if (!game) return json({ error: "Sessiota ei löytynyt" }, 404);
    if (request.method === "POST") {
      return handleCreateReport(game, request, env);
    }
    return json({ error: "Not found" }, 404);
  }

  if (pathname === "/api/auth/request-code") {
    if (request.method === "POST") {
      return handleRequestLoginCode(request, env);
    }
    return json({ error: "Not found" }, 404);
  }

  if (pathname === "/api/auth/verify-code") {
    if (request.method === "POST") {
      return handleVerifyLoginCode(request, env);
    }
    return json({ error: "Not found" }, 404);
  }

  if (pathname === "/api/auth/logout") {
    if (request.method === "POST") {
      return handleLogout(request, env);
    }
    return json({ error: "Not found" }, 404);
  }

  if (pathname === "/api/account/me") {
    if (request.method === "GET") {
      return handleGetAccount(request, env);
    }
    if (request.method === "DELETE") {
      return handleDeleteAccount(request, env);
    }
    return json({ error: "Not found" }, 404);
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
      return handleGetResults(Number(resultsMatch[1]), request, env);
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
