import { createApiClient } from "@breview/api-client";

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://breview.ing";

export const apiClient = createApiClient({
  baseUrl: apiBaseUrl,
});
