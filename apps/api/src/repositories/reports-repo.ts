import type { Env } from "../env";

export async function createContentReport(
  env: Env,
  input: {
    gameId: number;
    targetType: string;
    targetId: string | null;
    reason: string;
    details: string | null;
    clientId: string | null;
  },
): Promise<number | null> {
  const result = await env.DB.prepare(
    [
      "INSERT INTO content_reports",
      "(game_id, target_type, target_id, reason, details, client_id)",
      "VALUES (?, ?, ?, ?, ?, ?)",
    ].join(" "),
  )
    .bind(input.gameId, input.targetType, input.targetId, input.reason, input.details, input.clientId)
    .run();

  return (result.meta?.last_row_id as number | undefined) ?? null;
}
