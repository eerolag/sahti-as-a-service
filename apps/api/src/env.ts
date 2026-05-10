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

export interface WorkersAiBinding {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

export interface EmailMessageBuilder {
  to: string | string[];
  from: string | { email: string; name: string };
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string | { email: string; name: string };
  headers?: Record<string, string>;
}

export interface EmailSendResult {
  messageId: string;
}

export interface SendEmailBinding {
  send(message: EmailMessageBuilder): Promise<EmailSendResult>;
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
  AI?: WorkersAiBinding;
  EMAIL?: SendEmailBinding;
  AUTH_EMAIL_FROM?: string;
  AUTH_EMAIL_FROM_NAME?: string;
  AUTH_SECRET?: string;
  IOS_APPLE_TEAM_ID?: string;
  IOS_BUNDLE_IDENTIFIER?: string;
  ANDROID_PACKAGE_NAME?: string;
  ANDROID_SHA256_CERT_FINGERPRINTS?: string;
}
