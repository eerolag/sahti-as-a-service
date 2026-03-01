import {
  MAX_IMAGE_HEIGHT,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_IMAGE_WIDTH,
} from "../../shared/image-upload";

async function tryReadImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      const dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return dimensions;
    } catch {
      return null;
    }
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const dimensions = { width: image.naturalWidth, height: image.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dimensions);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });
}

export async function validateImageFileBeforeUpload(file: File): Promise<void> {
  if (!file.type || !file.type.toLowerCase().startsWith("image/")) {
    throw new Error("Valitse kuvatiedosto (image/*).");
  }

  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error("Kuvatiedosto liian iso (max 10 MB).");
  }

  const dimensions = await tryReadImageDimensions(file);
  if (!dimensions) return;

  if (dimensions.width > MAX_IMAGE_WIDTH || dimensions.height > MAX_IMAGE_HEIGHT) {
    throw new Error(`Kuvan resoluutio liian suuri (max ${MAX_IMAGE_WIDTH}x${MAX_IMAGE_HEIGHT} px).`);
  }
}
