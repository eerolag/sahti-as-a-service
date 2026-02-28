import type { Env } from "../env";
import { json } from "../http";
import { searchImages } from "../services/image-search-service";

export async function handleImageSearch(url: URL, env: Env): Promise<Response> {
  try {
    const query = String(url.searchParams.get("q") ?? "").trim();
    const count = url.searchParams.get("count");
    const payload = await searchImages(env, query, count);
    return json(payload);
  } catch (error) {
    const status = Number((error as any)?.statusCode) || 400;
    const message = String((error as Error)?.message ?? "Kuvahaku epäonnistui");
    return json({ error: message }, status);
  }
}
