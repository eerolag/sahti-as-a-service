import * as SecureStore from "expo-secure-store";

export interface PlayerIdentity {
  clientId: string;
  nickname: string;
}

const CLIENT_ID_STORAGE_KEY = "breview_client_id";
const PLAYER_IDENTITY_PREFIX = "breview_player_identity_v1";

const memoryStore = new Map<string, string>();

function playerIdentityStorageKey(gameId: number): string {
  return `${PLAYER_IDENTITY_PREFIX}:${gameId}`;
}

async function readStorage(key: string): Promise<string | null> {
  try {
    return (await SecureStore.getItemAsync(key)) ?? memoryStore.get(key) ?? null;
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

async function writeStorage(key: string, value: string): Promise<void> {
  memoryStore.set(key, value);
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // The in-memory fallback keeps Expo web and restricted simulator sessions usable.
  }
}

function randomRange(min: number, maxInclusive: number): number {
  const range = maxInclusive - min + 1;
  return min + Math.floor(Math.random() * range);
}

export async function getOrCreateClientId(): Promise<string> {
  const existing = await readStorage(CLIENT_ID_STORAGE_KEY);
  if (existing) return existing;

  const next = `c_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  await writeStorage(CLIENT_ID_STORAGE_KEY, next);
  return next;
}

export function generateAnonymousNickname(): string {
  return `Nimetön nimimerkki ${randomRange(100, 999)}`;
}

export async function loadPlayerIdentity(gameId: number): Promise<PlayerIdentity | null> {
  const raw = await readStorage(playerIdentityStorageKey(gameId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const clientId = String(parsed.clientId ?? "").trim();
    const nickname = String(parsed.nickname ?? "").trim();
    if (!clientId || !nickname) return null;
    return { clientId, nickname };
  } catch {
    return null;
  }
}

export async function savePlayerIdentity(gameId: number, identity: PlayerIdentity): Promise<void> {
  await writeStorage(playerIdentityStorageKey(gameId), JSON.stringify(identity));
}
