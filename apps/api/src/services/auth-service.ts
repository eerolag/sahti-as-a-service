import { normalizeClientId } from "@breview/shared/validation";
import type { AccountUserDto } from "@breview/shared/api-contracts";
import type { Env } from "../env";
import { getUserBySessionHash } from "../repositories/auth-repo";

export const LOGIN_CODE_EXPIRES_IN_SECONDS = 10 * 60;
export const LOGIN_CODE_MAX_ATTEMPTS = 5;
export const LOGIN_CODE_RECENT_LIMIT = 5;
export const LOGIN_CODE_RECENT_WINDOW_SECONDS = 15 * 60;
export const SESSION_EXPIRES_IN_DAYS = 180;

const textEncoder = new TextEncoder();
const base64UrlAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) {
    out += base64UrlAlphabet[byte % base64UrlAlphabet.length];
  }
  return out;
}

export function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

export function addDays(date: Date, days: number): Date {
  return addSeconds(date, days * 24 * 60 * 60);
}

export function createLoginCode(): string {
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => String(value % 10)).join("");
}

export function createSecretToken(bytes = 32): string {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return bytesToBase64Url(values);
}

export function createChallengeId(): string {
  return crypto.randomUUID();
}

export async function sha256Hex(input: string): Promise<string> {
  return bytesToHex(await crypto.subtle.digest("SHA-256", textEncoder.encode(input)));
}

export async function hashLoginCode(
  email: string,
  code: string,
  salt: string,
  env: Env,
): Promise<string> {
  return sha256Hex(`login-code:${email}:${code}:${salt}:${env.AUTH_SECRET ?? ""}`);
}

export async function hashSessionToken(token: string, env: Env): Promise<string> {
  return sha256Hex(`session:${token}:${env.AUTH_SECRET ?? ""}`);
}

export function constantTimeEqual(a: string, b: string): boolean {
  const maxLength = Math.max(a.length, b.length);
  let diff = a.length === b.length ? 0 : 1;

  for (let index = 0; index < maxLength; index += 1) {
    diff |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }

  return diff === 0;
}

export function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = String(match?.[1] ?? "").trim();
  return token || null;
}

export async function getSessionUser(
  request: Request,
  env: Env,
): Promise<AccountUserDto | null> {
  const token = readBearerToken(request);
  if (!token) return null;

  const tokenHash = await hashSessionToken(token, env);
  return getUserBySessionHash(env, tokenHash, new Date().toISOString());
}

export function uniqueClientIds(input: unknown): string[] {
  const values = Array.isArray(input) ? input : [input];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const clientId = normalizeClientId(value);
    if (!clientId || seen.has(clientId)) continue;
    seen.add(clientId);
    out.push(clientId);
  }

  return out;
}

export async function sendLoginCodeEmail(env: Env, email: string, code: string): Promise<void> {
  if (!env.EMAIL) {
    throw new Error("Sähköpostilähetys ei ole käytössä tässä ympäristössä");
  }

  const fromEmail = env.AUTH_EMAIL_FROM ?? "login@breview.ing";
  const fromName = env.AUTH_EMAIL_FROM_NAME ?? "Breview";
  const subject = "Breview-kirjautumiskoodi";
  const text = [
    `Breview-koodisi on ${code}.`,
    "",
    "Koodi on voimassa 10 minuuttia. Jos et pyytänyt koodia, voit ohittaa tämän viestin.",
  ].join("\n");
  const html = [
    "<p>Breview-koodisi on:</p>",
    `<p style="font-size: 28px; font-weight: 700; letter-spacing: 0.2em;">${code}</p>`,
    "<p>Koodi on voimassa 10 minuuttia. Jos et pyytänyt koodia, voit ohittaa tämän viestin.</p>",
  ].join("");

  await env.EMAIL.send({
    to: email,
    from: { email: fromEmail, name: fromName },
    subject,
    text,
    html,
  });
}
