import { MAX_IMAGE_UPLOAD_BYTES } from "@breview/shared/image-upload";
import type { Env } from "../env";

export const WORKERS_AI_BEER_RECOGNITION_MODEL = "@cf/google/gemma-4-26b-a4b-it";
const WORKERS_AI_BEER_RECOGNITION_FALLBACK_MODEL = "@cf/moonshotai/kimi-k2.6";
const WORKERS_AI_REQUEST_TIMEOUT_MS = 45_000;

const BEER_NAME_JSON_KEYS = ["beerName", "beer_name", "name", "productName", "product_name"] as const;

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

function extractCandidateFromObject(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  for (const key of BEER_NAME_JSON_KEYS) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return sanitizeCandidate(candidate);
    }
  }

  const result = record.result;
  if (result && typeof result === "object" && !Array.isArray(result)) {
    return extractCandidateFromObject(result);
  }

  return null;
}

function extractCandidateFromJson(raw: string): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;

  const candidates = [value];
  const objectMatch = value.match(/\{[\s\S]*\}/);
  if (objectMatch?.[0] && objectMatch[0] !== value) {
    candidates.push(objectMatch[0]);
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      const name = extractCandidateFromObject(parsed);
      if (name) return name;
    } catch {
      // Fall back to the line-based parser below.
    }
  }

  return null;
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

function isLikelyVisionUnsupportedResponse(value: string): boolean {
  const normalized = sanitizeCandidate(value).toLowerCase();
  if (!normalized) return false;

  return /\b(cannot see image|can't see image|can't view image|cannot view image|no visual access|text-only model|cannot analyze images?)\b/i.test(
    normalized,
  );
}

function isInvalidCandidateShape(value: string): boolean {
  const normalized = sanitizeCandidate(value);
  const lower = normalized.toLowerCase();
  if (!normalized) return true;
  if (!/[a-zåäö0-9]/i.test(normalized)) return true;
  if (/[{}[\]`*]/.test(normalized)) return true;
  if (/:\s*$/.test(normalized) || /\*\*\s*$/.test(normalized)) return true;
  if (/^(scan|analy[sz]e|read|look|inspect|identify|extract|ocr|text visible|visible text|the text|text is)\b/i.test(lower)) {
    return true;
  }
  if (/^(the image|image shows|i can see|there is|there are|the user|user wants|i need|we need)\b/i.test(lower)) return true;
  if (/\b(text is|text appears|in finnish|in english|screenshot|form|button|field|label)\b/i.test(lower)) return true;
  if (/\b(pelin nimi|oluen nimi|pakollisia|kuva tiedostona|choose file|tunnista nimi|tallenna ja luo peli)\b/i.test(lower)) {
    return true;
  }
  return false;
}

function isPlausibleBeerNameCandidate(value: string): boolean {
  const candidate = sanitizeCandidate(value);
  if (isInvalidCandidateShape(candidate)) return false;
  if (isStrictUnknown(candidate)) return false;
  if (isClearlyUncertainSentence(candidate)) return false;
  if (candidate.split(/\s+/).filter(Boolean).length > 8) return false;
  if (/^https?:\/\//i.test(candidate)) return false;
  return true;
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

  const embeddedName = line.match(
    /\b(?:beer(?:\s+name)?|brand|product|oluen\s+nimi|nimi)\b[^a-zåäö0-9]{0,12}(?:is|on|appears\s+to\s+be|looks\s+like|:)\s*['"]?([^'".,;:()]+)['"]?/i,
  );
  if (embeddedName?.[1]) {
    return sanitizeCandidate(embeddedName[1]);
  }

  return null;
}

function extractCandidateBeerName(raw: string): string {
  const structured = extractCandidateFromJson(raw);
  if (structured) return structured;

  const normalized = String(raw ?? "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\r/g, "\n")
    .replace(/```/g, "")
    .trim();

  if (/^\{[\s\S]*\}$/.test(normalized)) {
    return "";
  }

  const lines = normalized
    .split("\n")
    .map((line) => sanitizeCandidate(line))
    .filter(Boolean);

  for (const line of lines) {
    const guessed = extractBestGuessFromLine(line);
    const candidate = guessed ?? line;

    if (!candidate) continue;
    if (!isPlausibleBeerNameCandidate(candidate)) continue;

    return candidate;
  }

  const fallback = cleanupCandidateName(normalized);
  return isPlausibleBeerNameCandidate(fallback) ? fallback : "";
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
  const directName = extractCandidateFromObject(payload);
  if (directName) {
    return directName;
  }

  const directResponse = payload?.response;
  if (typeof directResponse === "string" && directResponse.trim()) {
    return directResponse.trim();
  }

  const resultResponse = payload?.result?.response;
  if (typeof resultResponse === "string" && resultResponse.trim()) {
    return resultResponse.trim();
  }

  const message = payload?.choices?.[0]?.message;
  const messageContent = message?.content;
  if (typeof messageContent === "string" && messageContent.trim()) return messageContent;

  if (Array.isArray(messageContent)) {
    const joined = messageContent
      .map((part) => {
        if (typeof part === "string") return part;
        if (typeof part?.text === "string") return part.text;
        if (typeof part?.text?.value === "string") return part.text.value;
        if (typeof part?.content === "string") return part.content;
        return "";
      })
      .join("\n")
      .trim();
    if (joined) return joined;
  }

  const choiceText = payload?.choices?.[0]?.text;
  if (typeof choiceText === "string" && choiceText.trim()) {
    return choiceText.trim();
  }

  const messageReasoning = message?.reasoning ?? message?.reasoning_content;
  if (typeof messageReasoning === "string" && messageReasoning.trim()) {
    return messageReasoning.trim();
  }

  const outputText = payload?.output_text;
  if (typeof outputText === "string" && outputText.trim()) {
    return outputText.trim();
  }

  if (Array.isArray(payload?.output)) {
    const joined = payload.output
      .map((part: any) => {
        if (typeof part === "string") return part;
        if (typeof part?.content === "string") return part.content;
        if (Array.isArray(part?.content)) {
          return part.content
            .map((item: any) => {
              if (typeof item === "string") return item;
              if (typeof item?.text === "string") return item.text;
              return "";
            })
            .join("\n");
        }
        return "";
      })
      .join("\n")
      .trim();
    if (joined) return joined;
  }

  return "";
}

function shouldRetryWithFallbackForError(error: unknown): boolean {
  const statusCode = Number((error as any)?.statusCode) || 0;
  if (statusCode === 429) return false;

  const upstreamStatus = Number((error as any)?.upstreamStatus) || 0;
  if (upstreamStatus === 400 || upstreamStatus === 404 || upstreamStatus === 422) {
    return true;
  }

  const message = String((error as Error)?.message ?? "").toLowerCase();
  if (/(image|vision|multimodal|text-only|cannot view)/.test(message)) {
    return true;
  }

  return true;
}

function createUncertainResultError(rawContent: string, model: string): Error {
  const preview = sanitizeCandidate(rawContent).slice(0, 200);
  const detail = preview ? ` (malli ${model} vastasi: ${preview})` : ` (malli: ${model})`;
  const err = new Error(`Nimea ei saatu tunnistettua kuvasta luotettavasti${detail}`);
  (err as any).statusCode = 422;
  return err;
}

function createEmptyModelResultError(model: string): Error {
  const err = new Error(`Nimen tunnistus epaonnistui: Workers AI ei palauttanut tekstivastausta (malli: ${model})`);
  (err as any).statusCode = 502;
  return err;
}

interface ModelAttempt {
  model: string;
  rawContent: string;
  beerName: string | null;
}

function timeoutError(): Error {
  const err = new Error(
    "Nimen tunnistus aikakatkaistiin. Kokeile JPG/PNG/WebP-kuvaa tai rajaa kuvaa lahemmas etikettia.",
  );
  (err as any).statusCode = 502;
  return err;
}

async function runWithTimeout<T>(work: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    timeout = setTimeout(() => reject(timeoutError()), WORKERS_AI_REQUEST_TIMEOUT_MS);
  });

  try {
    return await Promise.race([work, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function normalizeWorkersAiError(error: unknown): Error {
  if ((error as any)?.statusCode) {
    return error as Error;
  }

  const errorName = String((error as any)?.name ?? "");
  const rawMessage = String((error as Error)?.message ?? "").trim();
  if (errorName === "AbortError" || /\b(abort|aborted|timeout|timed out)\b/i.test(rawMessage)) {
    return timeoutError();
  }

  const status = Number((error as any)?.status ?? (error as any)?.code) || 0;
  const details = rawMessage;
  const statusCode = status === 429 ? 429 : 502;
  const message = details
    ? `Nimen tunnistus epaonnistui (Workers AI): ${details}`
    : "Nimen tunnistus epaonnistui (Workers AI)";
  const err = new Error(message);
  (err as any).statusCode = statusCode;
  (err as any).upstreamStatus = status;
  return err;
}

async function runModelAttempt(env: Env, model: string, imageDataUrl: string): Promise<ModelAttempt> {
  const prompt = [
    "Read the beer can, bottle, label, tap list, or package in the image.",
    "Return JSON only in this exact shape: {\"beerName\":\"...\"}.",
    "Use the clearest visible beer brand or product name.",
    "Ignore app UI, browser UI, form labels, buttons, filenames, and screenshot instructions.",
    "If the image is only an app/web form screenshot and not beer packaging or a tap list, return {\"beerName\":null}.",
    "If the exact beer style/version is unclear, the visible brand name alone is acceptable.",
    "If there are no usable beer-name clues, return {\"beerName\":null}.",
    "Do not include explanations.",
  ].join(" ");

  const body: Record<string, unknown> = {
    temperature: 0,
    max_completion_tokens: 64,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You extract beer names from images for a beer tasting app. Answer only with the requested JSON.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
          {
            type: "image_url",
            image_url: {
              url: imageDataUrl,
              detail: "high",
            },
          },
        ],
      },
    ],
  };

  if (model.includes("@cf/moonshotai/kimi-")) {
    body.chat_template_kwargs = { thinking: false };
  }

  let payload: Record<string, any> | null = null;

  try {
    const result = await runWithTimeout(env.AI!.run(model, body));
    payload = result && typeof result === "object" ? (result as Record<string, any>) : { response: String(result ?? "") };
  } catch (error) {
    throw normalizeWorkersAiError(error);
  }

  const rawContent = parseModelContent(payload ?? {});
  const beerName = extractCandidateBeerName(rawContent);

  if (!rawContent.trim()) {
    return { model, rawContent, beerName: null };
  }

  if (!beerName || beerName.length < 2 || beerName.length > 120 || isUncertainName(beerName)) {
    return { model, rawContent, beerName: null };
  }

  return { model, rawContent, beerName };
}

export interface IdentifyBeerNameResult {
  ok: true;
  beerName: string;
  model: string;
}

export async function identifyBeerNameFromImage(env: Env, file: File): Promise<IdentifyBeerNameResult> {
  ensureValidImage(file);

  if (!env.AI?.run) {
    const err = new Error("Nimen tunnistus ei ole kaytossa (Cloudflare Workers AI binding AI puuttuu)");
    (err as any).statusCode = 503;
    throw err;
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const imageDataUrl = toDataUrl(file, bytes);

  const primaryModel: string = WORKERS_AI_BEER_RECOGNITION_MODEL;
  const fallbackModel: string = WORKERS_AI_BEER_RECOGNITION_FALLBACK_MODEL;
  const canFallback = Boolean(fallbackModel && fallbackModel !== primaryModel);

  let primaryAttempt: ModelAttempt | null = null;

  try {
    primaryAttempt = await runModelAttempt(env, primaryModel, imageDataUrl);
  } catch (error) {
    if (!canFallback || !shouldRetryWithFallbackForError(error)) {
      throw error;
    }

    const fallbackAttempt = await runModelAttempt(env, fallbackModel, imageDataUrl);
    if (fallbackAttempt.beerName) {
      return {
        ok: true,
        beerName: fallbackAttempt.beerName,
        model: fallbackAttempt.model,
      };
    }

    if (!fallbackAttempt.rawContent.trim()) {
      throw createEmptyModelResultError(fallbackAttempt.model);
    }

    throw createUncertainResultError(fallbackAttempt.rawContent, fallbackAttempt.model);
  }

  if (primaryAttempt?.beerName) {
    return {
      ok: true,
      beerName: primaryAttempt.beerName,
      model: primaryAttempt.model,
    };
  }

  if (canFallback) {
    const fallbackAttempt = await runModelAttempt(env, fallbackModel, imageDataUrl);
    if (fallbackAttempt.beerName) {
      return {
        ok: true,
        beerName: fallbackAttempt.beerName,
        model: fallbackAttempt.model,
      };
    }

    if (!fallbackAttempt.rawContent.trim()) {
      throw createEmptyModelResultError(fallbackAttempt.model);
    }

    if (isLikelyVisionUnsupportedResponse(primaryAttempt?.rawContent ?? "")) {
      throw createUncertainResultError(fallbackAttempt.rawContent, fallbackAttempt.model);
    }

    throw createUncertainResultError(fallbackAttempt.rawContent, fallbackAttempt.model);
  }

  if (!primaryAttempt?.rawContent.trim()) {
    throw createEmptyModelResultError(primaryModel);
  }

  throw createUncertainResultError(primaryAttempt?.rawContent ?? "", primaryModel);
}
