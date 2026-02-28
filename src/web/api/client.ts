import type {
  CreateGameRequest,
  CreateGameResponse,
  GetGameResponse,
  GetRatingsResponse,
  GetResultsResponse,
  ImageSearchResponse,
  SaveRatingsRequest,
  SaveRatingsResponse,
  UpdateGameRequest,
  UpdateGameResponse,
} from "../../shared/api-contracts";

type ApiOptions = RequestInit & {
  bodyJson?: unknown;
};

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  let body = options.body;

  if (options.bodyJson !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(options.bodyJson);
  }

  const res = await fetch(path, {
    ...options,
    headers,
    body,
  });

  if (res.headers.get("content-type")?.includes("application/json")) {
    const data = (await res.json().catch(() => ({}))) as Record<string, any>;
    if (!res.ok) {
      throw new Error(String(data?.error ?? `HTTP ${res.status}`));
    }
    return data as T;
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return (undefined as unknown) as T;
}

export const apiClient = {
  createGame(payload: CreateGameRequest) {
    return request<CreateGameResponse>("/api/create-game", {
      method: "POST",
      bodyJson: payload,
    });
  },

  getGame(gameId: number) {
    return request<GetGameResponse>(`/api/games/${gameId}`);
  },

  updateGame(gameId: number, payload: UpdateGameRequest) {
    return request<UpdateGameResponse>(`/api/games/${gameId}`, {
      method: "PUT",
      bodyJson: payload,
    });
  },

  saveRatings(gameId: number, payload: SaveRatingsRequest) {
    return request<SaveRatingsResponse>(`/api/games/${gameId}/ratings`, {
      method: "POST",
      bodyJson: payload,
    });
  },

  getRatings(gameId: number, clientId: string) {
    const q = encodeURIComponent(clientId);
    return request<GetRatingsResponse>(`/api/games/${gameId}/ratings?clientId=${q}`);
  },

  getResults(gameId: number) {
    return request<GetResultsResponse>(`/api/games/${gameId}/results`);
  },

  imageSearch(query: string, count = 10) {
    const q = encodeURIComponent(query);
    return request<ImageSearchResponse>(`/api/image-search?q=${q}&count=${count}`);
  },

  async qrSvgDataUrl(url: string): Promise<string> {
    const res = await fetch(`/api/qr?url=${encodeURIComponent(url)}`);
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as Record<string, any> | null;
      throw new Error(String(err?.error ?? "QR-koodin lataus epäonnistui"));
    }

    const svg = await res.text();
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  },
};
