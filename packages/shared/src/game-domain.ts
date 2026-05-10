import { normalizeImageUrl, validateUserGeneratedText } from "./validation";

export interface BeerPayloadInput {
  id?: number | string;
  name?: string;
  image_url?: string | null;
}

export interface NormalizedBeer {
  id?: number;
  name: string;
  image_url: string | null;
  sort_order: number;
}

export function normalizeBeersPayload(
  input: unknown,
  options: { allowIds?: boolean } = {},
): { beers: NormalizedBeer[] } | { error: string } {
  const { allowIds = false } = options;
  if (!Array.isArray(input)) {
    return { error: "Invalid payload" };
  }

  const beers: NormalizedBeer[] = [];
  for (let i = 0; i < input.length; i += 1) {
    const b = input[i] as BeerPayloadInput;
    const name = String(b?.name ?? "").trim();
    if (!name) {
      return { error: `Anna nimi kaikille juomille (rivi ${i + 1})` };
    }
    const safety = validateUserGeneratedText(name);
    if ("error" in safety) {
      return { error: `${safety.error} (rivi ${i + 1})` };
    }

    const imageUrlRaw = typeof b?.image_url === "string" && b.image_url.trim() ? b.image_url.trim() : null;
    const normalizedImageUrl = normalizeImageUrl(imageUrlRaw);
    if ("error" in normalizedImageUrl) {
      return { error: `Virheellinen kuva juomalle "${name}": ${normalizedImageUrl.error}` };
    }

    const normalized: NormalizedBeer = {
      name,
      image_url: normalizedImageUrl.value,
      sort_order: beers.length,
    };

    if (allowIds && b?.id != null && b.id !== "") {
      const id = Number(b.id);
      if (!Number.isInteger(id) || id <= 0) {
        return { error: "Virheellinen juoma-ID" };
      }
      normalized.id = id;
    }

    beers.push(normalized);
  }

  if (beers.length < 1) {
    return { error: "Lisää vähintään yksi juoma" };
  }
  if (beers.length > 100) {
    return { error: "Liikaa juomia (max 100)" };
  }

  return { beers };
}
