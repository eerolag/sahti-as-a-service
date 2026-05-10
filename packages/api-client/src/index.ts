import type {
  AccountMeResponse,
  CreateGameRequest,
  CreateGameResponse,
  DeleteAccountResponse,
  GetGameResponse,
  GetRatingsResponse,
  GetResultsResponse,
  IdentifyBeerNameResponse,
  LogoutResponse,
  RequestLoginCodeRequest,
  RequestLoginCodeResponse,
  SaveRatingsRequest,
  SaveRatingsResponse,
  UploadImageResponse,
  UpdateGameRequest,
  UpdateGameResponse,
  VerifyLoginCodeRequest,
  VerifyLoginCodeResponse,
} from "@breview/shared/api-contracts";

type ApiOptions = RequestInit & {
  bodyJson?: unknown;
};

export interface ApiClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

function resolveApiUrl(path: string, baseUrl?: string): string {
  if (!baseUrl) return path;
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

function createRequest(options: ApiClientOptions = {}) {
  const fetcher = options.fetchImpl ?? fetch;

  return async function request<T>(path: string, requestOptions: ApiOptions = {}): Promise<T> {
    const headers = new Headers(requestOptions.headers ?? {});
    let body = requestOptions.body;

    if (requestOptions.bodyJson !== undefined) {
      headers.set("content-type", "application/json");
      body = JSON.stringify(requestOptions.bodyJson);
    }

    const res = await fetcher(resolveApiUrl(path, options.baseUrl), {
      ...requestOptions,
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

    return undefined as T;
  };
}

function authHeaders(sessionToken?: string): HeadersInit | undefined {
  return sessionToken ? { authorization: `Bearer ${sessionToken}` } : undefined;
}

export function createApiClient(options: ApiClientOptions = {}) {
  const request = createRequest(options);
  const fetcher = options.fetchImpl ?? fetch;

  return {
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

    saveRatings(gameId: number, payload: SaveRatingsRequest, sessionToken?: string) {
      return request<SaveRatingsResponse>(`/api/games/${gameId}/ratings`, {
        method: "POST",
        headers: authHeaders(sessionToken),
        bodyJson: payload,
      });
    },

    getRatings(gameId: number, clientId: string, sessionToken?: string) {
      const q = encodeURIComponent(clientId);
      return request<GetRatingsResponse>(`/api/games/${gameId}/ratings?clientId=${q}`, {
        headers: authHeaders(sessionToken),
      });
    },

    getResults(gameId: number) {
      return request<GetResultsResponse>(`/api/games/${gameId}/results`);
    },

    uploadImage(file: File) {
      const formData = new FormData();
      formData.set("file", file);
      return request<UploadImageResponse>("/api/images/upload", {
        method: "POST",
        body: formData,
      });
    },

    identifyBeerName(file: File, clientId?: string) {
      const formData = new FormData();
      formData.set("file", file);
      if (clientId) formData.set("clientId", clientId);
      return request<IdentifyBeerNameResponse>("/api/images/identify-beer-name", {
        method: "POST",
        body: formData,
      });
    },

    requestLoginCode(payload: RequestLoginCodeRequest) {
      return request<RequestLoginCodeResponse>("/api/auth/request-code", {
        method: "POST",
        bodyJson: payload,
      });
    },

    verifyLoginCode(payload: VerifyLoginCodeRequest) {
      return request<VerifyLoginCodeResponse>("/api/auth/verify-code", {
        method: "POST",
        bodyJson: payload,
      });
    },

    getAccount(sessionToken: string) {
      return request<AccountMeResponse>("/api/account/me", {
        headers: authHeaders(sessionToken),
      });
    },

    logout(sessionToken: string) {
      return request<LogoutResponse>("/api/auth/logout", {
        method: "POST",
        headers: authHeaders(sessionToken),
      });
    },

    deleteAccount(sessionToken: string) {
      return request<DeleteAccountResponse>("/api/account/me", {
        method: "DELETE",
        headers: authHeaders(sessionToken),
      });
    },

    async qrSvgDataUrl(url: string): Promise<string> {
      const res = await fetcher(resolveApiUrl(`/api/qr?url=${encodeURIComponent(url)}`, options.baseUrl));
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as Record<string, any> | null;
        throw new Error(String(err?.error ?? "QR-koodin lataus epäonnistui"));
      }

      const svg = await res.text();
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

export const apiClient = createApiClient();
