import type { GetGameResponse } from "@breview/shared/api-contracts";

export interface RecentGame {
  id: number;
  name: string;
  beerCount: number;
  updatedAt: string;
}

const STORAGE_KEY = "breview.recent-games.v1";
const MAX_RECENT_GAMES = 8;

type KeyValueStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

let memoryRecentGames: RecentGame[] = [];

function getStorage(): KeyValueStorage | null {
  const maybeStorage = (globalThis as { localStorage?: KeyValueStorage }).localStorage;
  return maybeStorage ?? null;
}

function isRecentGame(value: unknown): value is RecentGame {
  const game = value as Partial<RecentGame>;
  return (
    Number.isInteger(game.id) &&
    typeof game.name === "string" &&
    typeof game.beerCount === "number" &&
    typeof game.updatedAt === "string"
  );
}

export function loadRecentGames(): RecentGame[] {
  const storage = getStorage();
  if (!storage) return memoryRecentGames;

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return memoryRecentGames;

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return memoryRecentGames;

    memoryRecentGames = parsed.filter(isRecentGame).slice(0, MAX_RECENT_GAMES);
    return memoryRecentGames;
  } catch {
    return memoryRecentGames;
  }
}

export function saveRecentGame(game: RecentGame): RecentGame[] {
  const next = [game, ...loadRecentGames().filter((item) => item.id !== game.id)].slice(0, MAX_RECENT_GAMES);
  memoryRecentGames = next;

  try {
    getStorage()?.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // In-memory history still keeps the current session usable when storage is unavailable.
  }

  return next;
}

export function recentGameFromPayload(payload: GetGameResponse): RecentGame {
  return {
    id: payload.game.id,
    name: payload.game.name,
    beerCount: payload.beers.length,
    updatedAt: new Date().toISOString(),
  };
}
