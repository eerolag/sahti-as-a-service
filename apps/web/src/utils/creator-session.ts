const HOST_TOKEN_PREFIX = "breview_host_token_v1";

function key(shareId: string): string {
  return `${HOST_TOKEN_PREFIX}:${shareId}`;
}

export function saveHostToken(shareId: string, token: string): void {
  try {
    localStorage.setItem(key(shareId), token);
  } catch {
    // Host links still work through the URL hash when storage is unavailable.
  }
}

export function loadHostToken(shareId: string): string {
  try {
    return localStorage.getItem(key(shareId)) ?? "";
  } catch {
    return "";
  }
}

export function getAllSavedHostTokens(): Array<{ publicId: string; hostToken: string }> {
  const tokens: Array<{ publicId: string; hostToken: string }> = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey && storageKey.startsWith(`${HOST_TOKEN_PREFIX}:`)) {
        const publicId = storageKey.slice(HOST_TOKEN_PREFIX.length + 1);
        const hostToken = localStorage.getItem(storageKey);
        if (publicId && hostToken) {
          tokens.push({ publicId, hostToken });
        }
      }
    }
  } catch {
    // Ignore errors if localStorage is unavailable
  }
  return tokens;
}

export function consumeHostTokenFromHash(): string {
  const raw = window.location.hash.replace(/^#/, "").trim();
  if (!raw) return "";

  try {
    const token = decodeURIComponent(raw);
    window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}`);
    return token;
  } catch {
    return "";
  }
}

export function sessionShareUrl(shareId: string): string {
  return `${window.location.origin}/s/${encodeURIComponent(shareId)}`;
}

export function sessionHostUrl(shareId: string, token: string): string {
  return `${window.location.origin}/h/${encodeURIComponent(shareId)}#${encodeURIComponent(token)}`;
}
