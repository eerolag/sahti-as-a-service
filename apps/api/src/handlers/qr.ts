import type { Env } from "../env";
import { json } from "../http";
import { generateQrSvg } from "../services/qr-service";

export async function handleGetQr(url: URL, _env: Env): Promise<Response> {
  const target = String(url.searchParams.get("url") ?? "").trim();
  if (!target) {
    return json({ error: "url-parametri puuttuu" }, 400);
  }
  if (target.length > 2048) {
    return json({ error: "URL on liian pitkä" }, 400);
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return json({ error: "Virheellinen URL" }, 400);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return json({ error: "Vain http/https URL:t sallitaan" }, 400);
  }

  const svg = await generateQrSvg(target);
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
