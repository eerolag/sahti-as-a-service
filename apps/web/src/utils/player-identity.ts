export interface PlayerIdentity {
  clientId: string;
  nickname: string;
}

const CLIENT_ID_STORAGE_KEY = "saas_client_id";
const PLAYER_IDENTITY_PREFIX = "saas_player_identity_v1";

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore storage failures
  }
}

function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore storage failures
  }
}

function playerIdentityStorageKey(gameId: number): string {
  return `${PLAYER_IDENTITY_PREFIX}:${gameId}`;
}

function randomRange(min: number, maxInclusive: number): number {
  const range = maxInclusive - min + 1;

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return min + (buffer[0] % range);
  }

  return min + Math.floor(Math.random() * range);
}

export function getOrCreateClientId(): string {
  const existing = readStorage(CLIENT_ID_STORAGE_KEY);
  if (existing) return existing;

  const next = `c_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  writeStorage(CLIENT_ID_STORAGE_KEY, next);
  return next;
}

export function generateAnonymousNickname(): string {
  const suffix = randomRange(100, 999);
  return `Nimetön nimimerkki ${suffix}`;
}

export function loadPlayerIdentity(gameId: number): PlayerIdentity | null {
  const raw = readStorage(playerIdentityStorageKey(gameId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const clientId = String(parsed.clientId ?? "").trim();
    const nickname = String(parsed.nickname ?? "").trim();
    if (!clientId || !nickname) {
      removeStorage(playerIdentityStorageKey(gameId));
      return null;
    }
    return { clientId, nickname };
  } catch {
    removeStorage(playerIdentityStorageKey(gameId));
    return null;
  }
}

export function savePlayerIdentity(gameId: number, identity: PlayerIdentity): void {
  writeStorage(playerIdentityStorageKey(gameId), JSON.stringify(identity));
}
