import type { AccountUserDto } from "@breview/shared/api-contracts";

export interface AccountSession {
  sessionToken: string;
  user: AccountUserDto;
}

const ACCOUNT_SESSION_STORAGE_KEY = "breview_account_session_v1";

export function loadAccountSession(): AccountSession | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_SESSION_STORAGE_KEY);
    if (!raw) return null;

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

export function saveAccountSession(session: AccountSession): void {
  try {
    localStorage.setItem(ACCOUNT_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Account still works for the current request, but cannot persist without storage.
  }
}

export function clearAccountSession(): void {
  try {
    localStorage.removeItem(ACCOUNT_SESSION_STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
}
