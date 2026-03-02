const AI_SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const AI_TARGET_MAX_DIMENSION = 1600;
const AI_TARGET_MIN_DIMENSION = 768;
const AI_TARGET_MAX_BYTES = 2.5 * 1024 * 1024;
const AI_JPEG_QUALITY = 0.9;

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
};

function replaceExtension(fileName: string, extension: string): string {
  const safeName = String(fileName ?? "").trim() || "beer-image";
  const base = safeName.replace(/\.[a-z0-9]+$/i, "");
  return `${base}${extension}`;
}

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      cleanup: () => bitmap.close(),
    };
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        cleanup: () => URL.revokeObjectURL(url),
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Kuvan avaaminen epaonnistui selaimessa."));
    };
    image.src = url;
  });
}

async function renderAsJpegFile(file: File): Promise<File> {
  const decoded = await decodeImage(file);
  try {
    const maxDimension = Math.max(decoded.width, decoded.height);
    const minDimension = Math.min(decoded.width, decoded.height);

    const downscale = maxDimension > AI_TARGET_MAX_DIMENSION ? AI_TARGET_MAX_DIMENSION / maxDimension : 1;
    const upscale = minDimension < AI_TARGET_MIN_DIMENSION ? AI_TARGET_MIN_DIMENSION / minDimension : 1;

    let scale = downscale;
    if (scale === 1 && upscale > 1) {
      // Mild upscaling helps OCR on tiny labels.
      scale = Math.min(upscale, 2);
    }

    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Kuvan kasittely epaonnistui (canvas).");
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(decoded.source, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", AI_JPEG_QUALITY));
    if (!blob) {
      throw new Error("Kuvan muunnos JPG-muotoon epaonnistui.");
    }

    return new File([blob], replaceExtension(file.name, ".jpg"), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    decoded.cleanup();
  }
}

export async function prepareImageForBeerNameRecognition(file: File): Promise<File> {
  const type = String(file.type ?? "").trim().toLowerCase();
  const alreadyGood = AI_SUPPORTED_IMAGE_TYPES.has(type) && file.size <= AI_TARGET_MAX_BYTES;
  if (alreadyGood) return file;

  try {
    return await renderAsJpegFile(file);
  } catch (error) {
    // Some browsers cannot decode HEIC/HEIF/AVIF locally. Send original image as a fallback.
    if (type.startsWith("image/")) {
      return file;
    }

    throw new Error(
      `Kuvatiedostoa ei voitu kasitella tunnistusta varten (${String((error as Error)?.message ?? "tuntematon virhe")}). Kokeile JPG/PNG/WebP-kuvaa.`,
    );
  }
}
