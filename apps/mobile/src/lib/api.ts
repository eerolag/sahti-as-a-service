import { createApiClient } from "@breview/api-client";
import type { IdentifyBeerNameResponse, UploadImageResponse } from "@breview/shared/api-contracts";

export const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://breview.ing";

export const apiClient = createApiClient({
  baseUrl: apiBaseUrl,
});

export interface MobileImageAsset {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}

function resolveApiUrl(path: string): string {
  return new URL(path, apiBaseUrl.endsWith("/") ? apiBaseUrl : `${apiBaseUrl}/`).toString();
}

function imageAssetName(asset: MobileImageAsset): string {
  const fromUri = asset.uri.split("/").pop()?.split("?")[0];
  return asset.fileName || fromUri || "beer-image.jpg";
}

function imageAssetType(asset: MobileImageAsset): string {
  return asset.mimeType || "image/jpeg";
}

function createImageFormData(asset: MobileImageAsset, clientId?: string): FormData {
  const formData = new FormData();
  formData.append("file", {
    uri: asset.uri,
    name: imageAssetName(asset),
    type: imageAssetType(asset),
  } as any);
  if (clientId) formData.append("clientId", clientId);
  return formData;
}

async function requestMultipart<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(resolveApiUrl(path), {
    method: "POST",
    body: formData,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? ((await response.json().catch(() => ({}))) as Record<string, unknown>)
    : {};

  if (!response.ok) {
    throw new Error(String(payload.error ?? `HTTP ${response.status}`));
  }

  return payload as T;
}

export function uploadImageAsset(asset: MobileImageAsset): Promise<UploadImageResponse> {
  return requestMultipart<UploadImageResponse>("/api/images/upload", createImageFormData(asset));
}

export function identifyBeerNameAsset(asset: MobileImageAsset, clientId?: string): Promise<IdentifyBeerNameResponse> {
  return requestMultipart<IdentifyBeerNameResponse>(
    "/api/images/identify-beer-name",
    createImageFormData(asset, clientId),
  );
}
