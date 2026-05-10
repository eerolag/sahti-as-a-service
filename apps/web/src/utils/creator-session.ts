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
