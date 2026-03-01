export const MAX_GAME_NAME_LENGTH = 120;
export const MAX_NICKNAME_LENGTH = 40;

export function normalizeGameName(raw: unknown): { value: string } | { error: string } {
  const name = String(raw ?? "").trim();
  if (!name) return { error: "Anna pelille nimi" };
  if (name.length > MAX_GAME_NAME_LENGTH) {
    return { error: `Pelin nimi on liian pitkä (max ${MAX_GAME_NAME_LENGTH} merkkiä)` };
  }
  return { value: name };
}

export function normalizeImageUrl(raw: unknown): { value: string | null } | { error: string } {
  const value = String(raw ?? "").trim();
  if (!value) return { value: null };

  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(value)) {
    return { value };
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { error: "Virheellinen kuva-URL" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { error: "Kuva-URL:ssa sallitaan vain http/https tai data:image/*" };
  }

  return { value };
}

export function normalizeClientId(clientId: unknown): string | null {
  const cleanClientId = String(clientId ?? "").trim();
  if (!cleanClientId || cleanClientId.length > 200) return null;
  return cleanClientId;
}

export function normalizeNickname(raw: unknown): { value: string | null } | { error: string } {
  const value = String(raw ?? "").trim();
  if (!value) return { value: null };
  if (value.length > MAX_NICKNAME_LENGTH) {
    return { error: `Nimimerkki on liian pitkä (max ${MAX_NICKNAME_LENGTH} merkkiä)` };
  }
  return { value };
}

export function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const int = Math.trunc(num);
  if (int < min) return min;
  if (int > max) return max;
  return int;
}

export function parseNumericPathParam(value: string | undefined): number | null {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}
