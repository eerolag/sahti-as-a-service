import { describe, expect, it } from "vitest";
import {
  buildImageApiUrl,
  createManagedImageKey,
  extractImageKeyFromUrl,
  isManagedImageKey,
} from "../../src/shared/image-upload";

describe("shared/image-upload", () => {
  it("creates managed key for image mime types", () => {
    const key = createManagedImageKey("image/jpeg");
    expect(isManagedImageKey(key)).toBe(true);
    expect(key.endsWith(".jpg")).toBe(true);
  });

  it("builds and extracts api image key from URL", () => {
    const key = "img_123e4567-e89b-12d3-a456-426614174000.webp";
    const url = buildImageApiUrl("https://example.com", key);
    expect(url).toBe("https://example.com/api/images/img_123e4567-e89b-12d3-a456-426614174000.webp");
    expect(extractImageKeyFromUrl(url)).toBe(key);
  });

  it("returns null for non-managed image urls", () => {
    expect(extractImageKeyFromUrl("https://example.com/image.jpg")).toBeNull();
    expect(extractImageKeyFromUrl("data:image/png;base64,abc")).toBeNull();
    expect(extractImageKeyFromUrl("https://example.com/api/images/not-ours")).toBeNull();
  });
});
