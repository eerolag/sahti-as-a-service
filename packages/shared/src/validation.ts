export const MAX_GAME_NAME_LENGTH = 120;
export const MAX_NICKNAME_LENGTH = 40;
export const MAX_RATING_COMMENT_LENGTH = 255;
export const MAX_EMAIL_LENGTH = 254;

const ABUSIVE_TEXT_PATTERNS = [
  /\bkys\b/i,
  /kill\s+yourself/i,
  /tapa\s+itsesi/i,
  /hirtt[aä]ydy/i,
  /raiska/i,
  /terroris/i,
  /natsi/i,
];

export function validateUserGeneratedText(value: string): { ok: true } | { error: string } {
  const text = value.normalize("NFKC");
  if (ABUSIVE_TEXT_PATTERNS.some((pattern) => pattern.test(text))) {
    return { error: "Sisältö vaikuttaa asiattomalta. Muokkaa tekstiä ja yritä uudelleen." };
  }
  return { ok: true };
}

export function normalizeGameName(raw: unknown): { value: string } | { error: string } {
  const name = String(raw ?? "").trim();
  if (!name) return { error: "Anna sessiolle nimi" };
  if (name.length > MAX_GAME_NAME_LENGTH) {
    return { error: `Session nimi on liian pitkä (max ${MAX_GAME_NAME_LENGTH} merkkiä)` };
  }
  const safety = validateUserGeneratedText(name);
  if ("error" in safety) return safety;
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

export function normalizeEmail(raw: unknown): { value: string } | { error: string } {
  const value = String(raw ?? "").trim().toLowerCase();
  if (!value) return { error: "Anna sähköpostiosoite" };
  if (value.length > MAX_EMAIL_LENGTH) {
    return { error: `Sähköpostiosoite on liian pitkä (max ${MAX_EMAIL_LENGTH} merkkiä)` };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { error: "Anna toimiva sähköpostiosoite" };
  }
  return { value };
}

export function normalizeNickname(raw: unknown): { value: string | null } | { error: string } {
  const value = String(raw ?? "").trim();
  if (!value) return { value: null };
  if (value.length > MAX_NICKNAME_LENGTH) {
    return { error: `Nimimerkki on liian pitkä (max ${MAX_NICKNAME_LENGTH} merkkiä)` };
  }
  const safety = validateUserGeneratedText(value);
  if ("error" in safety) return safety;
  return { value };
}

export function normalizeRatingComment(raw: unknown): { value: string | null } | { error: string } {
  const value = String(raw ?? "");
  if (!value.trim()) return { value: null };
  if (value.length > MAX_RATING_COMMENT_LENGTH) {
    return { error: `Kommentti on liian pitkä (max ${MAX_RATING_COMMENT_LENGTH} merkkiä)` };
  }
  const safety = validateUserGeneratedText(value);
  if ("error" in safety) return safety;
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
