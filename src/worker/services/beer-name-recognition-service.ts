import { MAX_IMAGE_UPLOAD_BYTES } from "../../shared/image-upload";
import { readUpstreamErrorMessage } from "../http";
import type { Env } from "../env";

const KILO_GATEWAY_ENDPOINT = "https://api.kilo.ai/api/gateway/chat/completions";
export const KILO_BEER_RECOGNITION_MODEL = "moonshotai/kimi-k2.5";

function bytesToBase64(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";

  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;

    const triple = (a << 16) | (b << 8) | c;
    out += alphabet[(triple >> 18) & 63];
    out += alphabet[(triple >> 12) & 63];
    out += i + 1 < bytes.length ? alphabet[(triple >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? alphabet[triple & 63] : "=";
  }

  return out;
}

function toDataUrl(file: File, bytes: Uint8Array): string {
  const contentType = String(file.type ?? "").trim().toLowerCase();
  const safeType = contentType.startsWith("image/") ? contentType : "image/jpeg";
  return `data:${safeType};base64,${bytesToBase64(bytes)}`;
}

function cleanupCandidateName(raw: string): string {
  const normalized = String(raw ?? "")
    .replace(/```/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\r/g, "\n")
    .trim();

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean);

  const firstLine = lines[0] ?? "";
  return firstLine.replace(/^['"]+|['"]+$/g, "").trim();
}

function sanitizeCandidate(value: string): string {
  return String(value ?? "")
    .replace(/^[-*•\d.)\s]+/, "")
    .replace(/^['"]+|['"]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isStrictUnknown(value: string): boolean {
  const normalized = sanitizeCandidate(value).toLowerCase();
  return (
    normalized === "unknown" ||
    normalized === "tuntematon" ||
    normalized === "en osaa" ||
    normalized === "en tunnista"
  );
}

function isClearlyUncertainSentence(value: string): boolean {
  const normalized = sanitizeCandidate(value).toLowerCase();
  if (!normalized) return true;

  return (
    /\b(cannot identify|can't identify|cannot determine|unable to identify|not sure|en pysty tunnistamaan)\b/i.test(
      normalized,
    ) && !/\b(best guess|maybe|ehka)\b/i.test(normalized)
  );
}

function extractBestGuessFromLine(value: string): string | null {
  const line = sanitizeCandidate(value);
  if (!line) return null;

  const labeled = line.match(/^(?:beer\s*name|name|oluen\s*nimi|nimi|best\s*guess)\s*[:\-]\s*(.+)$/i);
  if (labeled?.[1]) {
    return sanitizeCandidate(labeled[1]);
  }

  const maybeGuess = line.match(/\b(?:best guess|maybe|ehka)\s*[:\-]?\s*(.+)$/i);
  if (maybeGuess?.[1]) {
    return sanitizeCandidate(maybeGuess[1]);
  }

  return null;
}

function extractCandidateBeerName(raw: string): string {
  const normalized = String(raw ?? "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\r/g, "\n")
    .replace(/```/g, "")
    .trim();

  const lines = normalized
    .split("\n")
    .map((line) => sanitizeCandidate(line))
    .filter(Boolean);

  for (const line of lines) {
    const guessed = extractBestGuessFromLine(line);
    const candidate = guessed ?? line;

    if (!candidate) continue;
    if (isStrictUnknown(candidate)) continue;
    if (isClearlyUncertainSentence(candidate)) continue;

    const words = candidate.split(/\s+/).filter(Boolean).length;
    if (words > 8) continue;
    if (/^https?:\/\//i.test(candidate)) continue;

    return candidate;
  }

  return cleanupCandidateName(normalized);
}

function isUncertainName(candidate: string): boolean {
  const value = sanitizeCandidate(candidate);
  if (!value) return true;
  if (isStrictUnknown(value)) return true;
  if (isClearlyUncertainSentence(value)) return true;
  return false;
}

function ensureValidImage(file: File): void {
  if (!file.type || !file.type.toLowerCase().startsWith("image/")) {
    const err = new Error("Puuttuva tai virheellinen kuvatiedosto (kentta: file)");
    (err as any).statusCode = 400;
    throw err;
  }

  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    const err = new Error(`Kuvatiedosto on liian suuri (max ${MAX_IMAGE_UPLOAD_BYTES} tavua)`);
    (err as any).statusCode = 413;
    throw err;
  }
}

function parseModelContent(payload: Record<string, any>): string {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (typeof part?.text === "string") return part.text;
      return "";
    })
    .join("\n")
    .trim();
}

export interface IdentifyBeerNameResult {
  ok: true;
  beerName: string;
  model: string;
}

export async function identifyBeerNameFromImage(env: Env, file: File): Promise<IdentifyBeerNameResult> {
  ensureValidImage(file);

  const apiKey = String(env.KILO_API_KEY ?? "").trim();
  if (!apiKey) {
    const err = new Error("Nimen tunnistus ei ole kaytossa (KILO_API_KEY puuttuu)");
    (err as any).statusCode = 503;
    throw err;
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const imageDataUrl = toDataUrl(file, bytes);

  const body = {
    model: KILO_BEER_RECOGNITION_MODEL,
    temperature: 0,
    max_tokens: 32,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              "Identify the beer name in the image.",
              "Return exactly one line containing only the beer name.",
              "If you are not confident, reply exactly: UNKNOWN",
              "Do not include any explanation.",
            ].join(" "),
          },
          {
            type: "image_url",
            image_url: {
              url: imageDataUrl,
            },
          },
        ],
      },
    ],
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  let payload: Record<string, any> | null = null;

  try {
    const response = await fetch(KILO_GATEWAY_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${apiKey}`,
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const upstreamMessage = await readUpstreamErrorMessage(response);
      const status = response.status === 429 ? 429 : 502;
      const message = upstreamMessage
        ? `Nimen tunnistus epaonnistui (Kilo ${response.status}): ${upstreamMessage}`
        : `Nimen tunnistus epaonnistui (Kilo ${response.status})`;
      const err = new Error(message);
      (err as any).statusCode = status;
      throw err;
    }

    payload = (await response.json()) as Record<string, any>;
  } catch (error) {
    if ((error as any)?.statusCode) {
      throw error;
    }

    const details = String((error as Error)?.message ?? "").trim();
    const err = new Error(details ? `Nimen tunnistus epaonnistui juuri nyt: ${details}` : "Nimen tunnistus epaonnistui juuri nyt");
    (err as any).statusCode = 502;
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  const rawContent = parseModelContent(payload ?? {});
  const beerName = extractCandidateBeerName(rawContent);

  if (!beerName || beerName.length < 2 || beerName.length > 120 || isUncertainName(beerName)) {
    const preview = sanitizeCandidate(rawContent).slice(0, 160);
    const detail = preview ? ` (malli vastasi: ${preview})` : "";
    const err = new Error(`Nimea ei saatu tunnistettua kuvasta luotettavasti${detail}`);
    (err as any).statusCode = 422;
    throw err;
  }

  return {
    ok: true,
    beerName,
    model: KILO_BEER_RECOGNITION_MODEL,
  };
}
