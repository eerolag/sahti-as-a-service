export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_WIDTH = 6000;
export const MAX_IMAGE_HEIGHT = 6000;

export const IMAGE_API_PATH_PREFIX = "/api/images/";
const MANAGED_IMAGE_KEY_RE = /^img_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:\.[a-z0-9]+)?$/i;

const CONTENT_TYPE_EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "image/svg+xml": ".svg",
};

export function isManagedImageKey(key: string): boolean {
  return MANAGED_IMAGE_KEY_RE.test(String(key ?? "").trim());
}

export function extensionFromImageContentType(contentType: string): string {
  const normalized = String(contentType ?? "").toLowerCase().trim();
  if (!normalized.startsWith("image/")) return "";

  if (CONTENT_TYPE_EXTENSION_MAP[normalized]) {
    return CONTENT_TYPE_EXTENSION_MAP[normalized];
  }

  const subtype = normalized.slice("image/".length).split(";")[0].trim();
  if (!subtype) return "";

  const safe = subtype.replace(/[^a-z0-9.+-]/g, "").replace(/\+xml$/i, "");
  if (!safe) return "";

  return `.${safe}`;
}

export function createManagedImageKey(contentType: string): string {
  const ext = extensionFromImageContentType(contentType);
  return `img_${crypto.randomUUID()}${ext}`;
}

export function buildImageApiUrl(origin: string, key: string): string {
  return new URL(`${IMAGE_API_PATH_PREFIX}${encodeURIComponent(key)}`, origin).toString();
}

export function extractImageKeyFromUrl(imageUrl: string | null | undefined): string | null {
  const value = String(imageUrl ?? "").trim();
  if (!value) return null;
  if (/^data:/i.test(value)) return null;

  let path: string;
  try {
    path = new URL(value, "https://local.invalid").pathname;
  } catch {
    return null;
  }

  if (!path.startsWith(IMAGE_API_PATH_PREFIX)) return null;

  const encodedKey = path.slice(IMAGE_API_PATH_PREFIX.length);
  if (!encodedKey || encodedKey.includes("/")) return null;

  let key: string;
  try {
    key = decodeURIComponent(encodedKey);
  } catch {
    return null;
  }

  if (!isManagedImageKey(key)) return null;
  return key;
}
