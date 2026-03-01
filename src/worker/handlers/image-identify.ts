import type { IdentifyBeerNameResponse } from "../../shared/api-contracts";
import { MAX_IMAGE_UPLOAD_BYTES } from "../../shared/image-upload";
import type { Env } from "../env";
import { json } from "../http";
import { identifyBeerNameFromImage } from "../services/beer-name-recognition-service";

function asImageFile(value: FormDataEntryValue | null): File | null {
  if (!value) return null;
  if (typeof value === "string") return null;
  if (!value.type || !value.type.toLowerCase().startsWith("image/")) return null;
  return value;
}

export async function handleIdentifyBeerNameFromImage(request: Request, env: Env): Promise<Response> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: "Virheellinen multipart-payload" }, 400);
  }

  const file = asImageFile(formData.get("file"));
  if (!file) {
    return json({ error: "Puuttuva tai virheellinen kuvatiedosto (kentta: file)" }, 400);
  }

  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    return json({ error: `Kuvatiedosto on liian suuri (max ${MAX_IMAGE_UPLOAD_BYTES} tavua)` }, 413);
  }

  try {
    const payload: IdentifyBeerNameResponse = await identifyBeerNameFromImage(env, file);
    return json(payload);
  } catch (error) {
    const status = Number((error as any)?.statusCode) || 502;
    const message = String((error as Error)?.message ?? "Nimen tunnistus epaonnistui");
    return json({ error: message }, status);
  }
}
