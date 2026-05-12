import {
  SESSION_HOST_TOKEN_BYTES,
  SESSION_PUBLIC_ID_BYTES,
  type NormalizedSessionSettings,
} from "@breview/shared";
import type { Env } from "../env";
import type { GameRow } from "../repositories/games-repo";

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomToken(bytes: number): string {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return base64Url(data);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createSessionPublicId(): string {
  return randomToken(SESSION_PUBLIC_ID_BYTES);
}

export function createSessionHostToken(): string {
  return randomToken(SESSION_HOST_TOKEN_BYTES);
}

export async function hashSessionHostToken(env: Env, publicId: string, token: string): Promise<string> {
  return sha256Hex(`breview.creator:${publicId}:${token}:${env.AUTH_SECRET ?? ""}`);
}

export async function isValidCreatorToken(
  env: Env,
  game: GameRow,
  request: Request,
  options: { allowMissingCreatorToken?: boolean } = {},
): Promise<boolean> {
  if (!game.creatorTokenHash) return Boolean(options.allowMissingCreatorToken);
  if (!game.publicId) return false;

  const token = request.headers.get("x-breview-creator-token")?.trim() || "";
  if (!token) return false;

  const expected = await hashSessionHostToken(env, game.publicId, token);
  return expected === game.creatorTokenHash;
}

export function buildSessionUrls(request: Request, publicId: string, hostToken: string): { shareUrl: string; hostUrl: string } {
  const origin = new URL(request.url).origin;
  return {
    shareUrl: new URL(`/s/${encodeURIComponent(publicId)}`, origin).toString(),
    hostUrl: `${new URL(`/h/${encodeURIComponent(publicId)}`, origin).toString()}#${encodeURIComponent(hostToken)}`,
  };
}

export function shouldHideResults(game: GameRow, isHost: boolean, hasSubmitted: boolean): boolean {
  if (isHost) return false;
  if (game.resultsVisibility === "live") return false;
  if (game.resultsVisibility === "host_reveal") return !game.resultsRevealedAt;
  if (game.resultsVisibility === "after_submit") return !hasSubmitted;
  return false;
}

export function settingsFromGame(game: GameRow): NormalizedSessionSettings {
  return {
    ratingConfig: game.ratingConfig,
    resultsVisibility: game.resultsVisibility,
  };
}
