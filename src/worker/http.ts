export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function parseJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export async function readUpstreamErrorMessage(response: Response): Promise<string> {
  const bodyText = await response.text().catch(() => "");
  if (!bodyText) return "";

  try {
    const body = JSON.parse(bodyText) as Record<string, any>;
    const nestedError = body?.error;
    const code = String(nestedError?.code ?? body?.code ?? "").trim();
    const message = String(
      nestedError?.message ?? body?.message ?? nestedError ?? body?.detail ?? "",
    ).trim();
    const merged = [code, message].filter(Boolean).join(": ");
    return merged.slice(0, 240);
  } catch {
    return bodyText.trim().slice(0, 240);
  }
}
