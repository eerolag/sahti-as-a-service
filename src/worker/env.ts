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

export interface Env {
  DB: D1Database;
  ASSETS: AssetBinding;
  BRAVE_SEARCH_API_KEY?: string;
  UNTAPPD_CLIENT_ID?: string;
  UNTAPPD_CLIENT_SECRET?: string;
}
