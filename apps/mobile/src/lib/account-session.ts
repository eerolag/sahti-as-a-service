import type { AccountUserDto } from "@breview/shared/api-contracts";
import * as SecureStore from "expo-secure-store";

export interface AccountSession {
  sessionToken: string;
  user: AccountUserDto;
}

const ACCOUNT_SESSION_STORAGE_KEY = "breview_account_session_v1";
const memoryStore = new Map<string, string>();

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

async function removeStorage(key: string): Promise<void> {
  memoryStore.delete(key);
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore storage failures
  }
}

export async function loadAccountSession(): Promise<AccountSession | null> {
  const raw = await readStorage(ACCOUNT_SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const sessionToken = String(parsed.sessionToken ?? "").trim();
    const user = parsed.user as Record<string, unknown> | undefined;
    const id = Number(user?.id);
    const email = String(user?.email ?? "").trim();
    if (!sessionToken || !Number.isInteger(id) || !email) return null;
    return { sessionToken, user: { id, email } };
  } catch {
    return null;
  }
}

export async function saveAccountSession(session: AccountSession): Promise<void> {
  await writeStorage(ACCOUNT_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export async function clearAccountSession(): Promise<void> {
  await removeStorage(ACCOUNT_SESSION_STORAGE_KEY);
}
