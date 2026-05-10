import type { ReportSessionRequest, ReportSessionResponse } from "@breview/shared/api-contracts";
import { normalizeClientId } from "@breview/shared/validation";
import type { Env } from "../env";
import { json, parseJson } from "../http";
import type { GameRow } from "../repositories/games-repo";
import { createContentReport } from "../repositories/reports-repo";

const TARGET_TYPES = new Set(["session", "beer", "comment", "participant", "image"]);
const MAX_REASON_LENGTH = 80;
const MAX_DETAILS_LENGTH = 1000;

export async function handleCreateReport(game: GameRow, request: Request, env: Env): Promise<Response> {
  const body = await parseJson<ReportSessionRequest>(request);
  if (!body) return json({ error: "Invalid payload" }, 400);

  const targetType = String(body.targetType ?? "").trim();
  if (!TARGET_TYPES.has(targetType)) {
    return json({ error: "Virheellinen raportin kohde" }, 400);
  }

  const reason = String(body.reason ?? "").trim();
  if (!reason) return json({ error: "Anna raportille syy" }, 400);
  if (reason.length > MAX_REASON_LENGTH) {
    return json({ error: `Raportin syy on liian pitkä (max ${MAX_REASON_LENGTH} merkkiä)` }, 400);
  }

  const details = String(body.details ?? "").trim();
  if (details.length > MAX_DETAILS_LENGTH) {
    return json({ error: `Raportin lisätiedot ovat liian pitkät (max ${MAX_DETAILS_LENGTH} merkkiä)` }, 400);
  }

  const reportId = await createContentReport(env, {
    gameId: game.id,
    targetType,
    targetId: body.targetId == null ? null : String(body.targetId).trim().slice(0, 120) || null,
    reason,
    details: details || null,
    clientId: normalizeClientId(body.clientId) ?? null,
  });

  if (!reportId) return json({ error: "Raportin tallennus epäonnistui" }, 500);

  const response: ReportSessionResponse = { ok: true, reportId };
  return json(response);
}
