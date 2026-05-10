import type { Env } from "../env";

const DAILY_IMAGE_RECOGNITION_LIMIT = 10;
const INAPPROPRIATE_IMAGE_LOCK_THRESHOLD = 2;

interface UsageRow {
  attempts: number;
  violations: number;
  locked_until: string | null;
}

export interface ImageRecognitionIdentity {
  identityHash: string;
  usageDay: string;
}

function dayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function endOfUtcDay(now: Date): string {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  return end.toISOString();
}

function usageError(message: string, statusCode: number, code: string): Error {
  const err = new Error(message);
  (err as any).statusCode = statusCode;
  (err as any).code = code;
  return err;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function readClientId(formData: FormData): string {
  const value = formData.get("clientId");
  return typeof value === "string" ? value.trim().slice(0, 160) : "";
}

function readIpAddress(request: Request): string {
  const cfConnectingIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfConnectingIp) return cfConnectingIp;

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor ?? "";
}

export async function resolveImageRecognitionIdentity(
  request: Request,
  formData: FormData,
  now = new Date(),
): Promise<ImageRecognitionIdentity> {
  const clientId = readClientId(formData);
  const ipAddress = readIpAddress(request);
  const userAgent = request.headers.get("user-agent")?.trim().slice(0, 160) ?? "";
  const source = clientId || ipAddress || userAgent || "anonymous";

  return {
    identityHash: await sha256Hex(`${clientId ? "client" : ipAddress ? "ip" : "fallback"}:${source}`),
    usageDay: dayKey(now),
  };
}

export async function assertImageRecognitionAllowed(env: Env, identity: ImageRecognitionIdentity): Promise<void> {
  const nowIso = new Date().toISOString();
  const row = await env.DB.prepare(
    "SELECT attempts, violations, locked_until FROM ai_recognition_usage WHERE identity_hash = ? AND usage_day = ?",
  )
    .bind(identity.identityHash, identity.usageDay)
    .first<UsageRow>();

  if (row?.locked_until && row.locked_until > nowIso) {
    throw usageError(
      "AI-tunnistus on lukittu tältä päivältä asiattomien kuvien takia.",
      423,
      "IMAGE_RECOGNITION_LOCKED",
    );
  }

  if (Number(row?.attempts ?? 0) >= DAILY_IMAGE_RECOGNITION_LIMIT) {
    throw usageError(
      `Päivän AI-tunnistusraja on täynnä (${DAILY_IMAGE_RECOGNITION_LIMIT} kuvaa).`,
      429,
      "IMAGE_RECOGNITION_DAILY_LIMIT",
    );
  }

  await env.DB.prepare(
    [
      "INSERT INTO ai_recognition_usage (identity_hash, usage_day, attempts, violations, locked_until, updated_at)",
      "VALUES (?, ?, 1, 0, NULL, datetime('now'))",
      "ON CONFLICT(identity_hash, usage_day) DO UPDATE SET",
      "attempts = ai_recognition_usage.attempts + 1,",
      "updated_at = datetime('now')",
    ].join(" "),
  )
    .bind(identity.identityHash, identity.usageDay)
    .run();
}

export async function recordInappropriateImage(env: Env, identity: ImageRecognitionIdentity): Promise<Error> {
  const now = new Date();
  const lockedUntil = endOfUtcDay(now);

  await env.DB.prepare(
    [
      "INSERT INTO ai_recognition_usage (identity_hash, usage_day, attempts, violations, locked_until, updated_at)",
      "VALUES (?, ?, 0, 1, NULL, datetime('now'))",
      "ON CONFLICT(identity_hash, usage_day) DO UPDATE SET",
      "violations = ai_recognition_usage.violations + 1,",
      "locked_until = CASE",
      "WHEN ai_recognition_usage.violations + 1 >= ? THEN ?",
      "ELSE ai_recognition_usage.locked_until",
      "END,",
      "updated_at = datetime('now')",
    ].join(" "),
  )
    .bind(identity.identityHash, identity.usageDay, INAPPROPRIATE_IMAGE_LOCK_THRESHOLD, lockedUntil)
    .run();

  const row = await env.DB.prepare(
    "SELECT attempts, violations, locked_until FROM ai_recognition_usage WHERE identity_hash = ? AND usage_day = ?",
  )
    .bind(identity.identityHash, identity.usageDay)
    .first<UsageRow>();

  if (row?.locked_until && row.locked_until > now.toISOString()) {
    return usageError(
      "AI-tunnistus lukittu tältä päivältä asiattomien kuvien takia.",
      423,
      "IMAGE_RECOGNITION_LOCKED",
    );
  }

  return usageError(
    "AI tunnistaa vain oluiden ja muiden juomien merkkejä etiketistä, hanamerkistä, pakkauksesta, hanalistasta tai juomamenusta. Seuraavasta asiattomasta kuvasta tunnistus lukitaan tältä päivältä.",
    422,
    "BEVERAGE_IMAGE_REQUIRED",
  );
}
