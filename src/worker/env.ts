export interface D1RunResult {
  success?: boolean;
  meta?: {
    last_row_id?: number;
    [key: string]: unknown;
  };
}

export interface D1QueryResult<T> {
  results?: T[];
  success?: boolean;
  meta?: Record<string, unknown>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run<T = Record<string, unknown>>(): Promise<D1RunResult & T>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1QueryResult<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
}

export interface AssetBinding {
  fetch(request: Request): Promise<Response>;
}

export interface R2HttpMetadata {
  contentType?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
  cacheExpiry?: string;
}

export interface R2Object {
  key: string;
  size: number;
  body?: ReadableStream | null;
  httpMetadata?: R2HttpMetadata;
}

export interface R2PutOptions {
  httpMetadata?: R2HttpMetadata;
  customMetadata?: Record<string, string>;
}

export interface R2Bucket {
  get(key: string): Promise<R2Object | null>;
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob,
    options?: R2PutOptions,
  ): Promise<R2Object | null>;
  delete(keys: string | string[]): Promise<void>;
}

export interface Env {
  DB: D1Database;
  ASSETS: AssetBinding;
  IMAGES_BUCKET: R2Bucket;
  KILO_API_KEY?: string;
  BRAVE_SEARCH_API_KEY?: string;
  UNTAPPD_CLIENT_ID?: string;
  UNTAPPD_CLIENT_SECRET?: string;
}
