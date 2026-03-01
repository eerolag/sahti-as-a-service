import type { R2Bucket, R2Object, R2PutOptions } from "../../src/worker/env";

type StoredObject = {
  key: string;
  body: Uint8Array;
  httpMetadata?: {
    contentType?: string;
  };
};

async function toUint8Array(value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob): Promise<Uint8Array> {
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }

  if (typeof value === "string") {
    return new TextEncoder().encode(value);
  }

  if (value instanceof Blob) {
    return new Uint8Array(await value.arrayBuffer());
  }

  return new Uint8Array(await new Response(value).arrayBuffer());
}

export class MockR2Bucket implements R2Bucket {
  private readonly objects = new Map<string, StoredObject>();

  async get(key: string): Promise<R2Object | null> {
    const stored = this.objects.get(key);
    if (!stored) return null;
    const bodyBuffer = new ArrayBuffer(stored.body.byteLength);
    new Uint8Array(bodyBuffer).set(stored.body);

    return {
      key: stored.key,
      size: stored.body.byteLength,
      body: new Blob([bodyBuffer]).stream(),
      httpMetadata: stored.httpMetadata,
    };
  }

  async put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob,
    options?: R2PutOptions,
  ): Promise<R2Object> {
    const body = await toUint8Array(value);
    const stored: StoredObject = {
      key,
      body: new Uint8Array(body),
      httpMetadata: options?.httpMetadata?.contentType
        ? {
            contentType: options.httpMetadata.contentType,
          }
        : undefined,
    };
    this.objects.set(key, stored);

    return {
      key: stored.key,
      size: stored.body.byteLength,
      httpMetadata: stored.httpMetadata,
    };
  }

  async delete(keys: string | string[]): Promise<void> {
    const list = Array.isArray(keys) ? keys : [keys];
    for (const key of list) {
      this.objects.delete(key);
    }
  }

  has(key: string): boolean {
    return this.objects.has(key);
  }
}
