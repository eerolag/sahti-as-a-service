import type { UploadImageResponse } from "../../shared/api-contracts";
import {
  MAX_IMAGE_UPLOAD_BYTES,
  buildImageApiUrl,
  createManagedImageKey,
  isManagedImageKey,
} from "../../shared/image-upload";
import type { Env } from "../env";
import { json } from "../http";

function asImageFile(value: FormDataEntryValue | null): File | null {
  if (!value) return null;
  if (typeof value === "string") return null;
  if (!value.type || !value.type.toLowerCase().startsWith("image/")) return null;
  return value;
}

export async function handleUploadImage(request: Request, env: Env): Promise<Response> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: "Virheellinen multipart-payload" }, 400);
  }

  const file = asImageFile(formData.get("file"));
  if (!file) {
    return json({ error: "Puuttuva tai virheellinen kuvatiedosto (kenttä: file)" }, 400);
  }

  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    return json({ error: `Kuvatiedosto on liian suuri (max ${MAX_IMAGE_UPLOAD_BYTES} tavua)` }, 413);
  }

  const contentType = file.type.toLowerCase().trim();
  const key = createManagedImageKey(contentType);

  try {
    await env.IMAGES_BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType,
      },
    });
  } catch {
    return json({ error: "Kuvan tallennus epäonnistui" }, 500);
  }

  const response: UploadImageResponse = {
    ok: true,
    imageUrl: buildImageApiUrl(new URL(request.url).origin, key),
    key,
    contentType,
    bytes: file.size,
  };
  return json(response);
}

export async function handleGetImage(key: string, env: Env): Promise<Response> {
  if (!isManagedImageKey(key)) {
    return json({ error: "Kuvaa ei löytynyt" }, 404);
  }

  const object = await env.IMAGES_BUCKET.get(key);
  if (!object?.body) {
    return json({ error: "Kuvaa ei löytynyt" }, 404);
  }

  const headers = new Headers();
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("content-type", object.httpMetadata?.contentType ?? "application/octet-stream");
  if (typeof object.size === "number" && Number.isFinite(object.size)) {
    headers.set("content-length", String(object.size));
  }

  return new Response(object.body, {
    status: 200,
    headers,
  });
}
