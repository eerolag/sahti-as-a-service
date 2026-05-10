import type {
  AccountMeResponse,
  DeleteAccountResponse,
  LogoutResponse,
  RequestLoginCodeRequest,
  RequestLoginCodeResponse,
  VerifyLoginCodeRequest,
  VerifyLoginCodeResponse,
} from "@breview/shared/api-contracts";
import { normalizeEmail } from "@breview/shared/validation";
import type { Env } from "../env";
import { json, parseJson } from "../http";
import {
  consumeLoginChallenge,
  countRecentLoginChallenges,
  createSession,
  deleteAccountAndLinkedPlayers,
  deleteLoginChallenge,
  getAccountHistory,
  getLatestValidLoginChallenge,
  getOrCreateUserByEmail,
  incrementLoginChallengeAttempts,
  insertLoginChallenge,
  linkPlayersForClientId,
  revokeSession,
} from "../repositories/auth-repo";
import {
  LOGIN_CODE_EXPIRES_IN_SECONDS,
  LOGIN_CODE_MAX_ATTEMPTS,
  LOGIN_CODE_RECENT_LIMIT,
  LOGIN_CODE_RECENT_WINDOW_SECONDS,
  LOGIN_CODE_RESEND_COOLDOWN_SECONDS,
  SESSION_EXPIRES_IN_DAYS,
  addDays,
  addSeconds,
  constantTimeEqual,
  createChallengeId,
  createLoginCode,
  createSecretToken,
  describeEmailSendFailure,
  getSessionUser,
  hashLoginCode,
  hashSessionToken,
  logAuthEvent,
  readBearerToken,
  sendLoginCodeEmail,
  uniqueClientIds,
} from "../services/auth-service";

function normalizeLoginCode(raw: unknown): string | null {
  const value = String(raw ?? "").replace(/\s+/g, "");
  return /^\d{6}$/.test(value) ? value : null;
}

function unauthorized(): Response {
  return json({ error: "Kirjautuminen puuttuu tai on vanhentunut" }, 401);
}

export async function handleRequestLoginCode(request: Request, env: Env): Promise<Response> {
  const body = await parseJson<RequestLoginCodeRequest>(request);
  const email = normalizeEmail(body?.email);
  if ("error" in email) {
    await logAuthEvent(env, "login_code_request", { outcome: "invalid_email" }, "warn");
    return json({ error: email.error }, 400);
  }

  await logAuthEvent(env, "login_code_request", { email: email.value, outcome: "accepted" });

  const now = new Date();
  const nowIso = now.toISOString();
  const recentAfter = addSeconds(now, -LOGIN_CODE_RECENT_WINDOW_SECONDS).toISOString();
  const recentCount = await countRecentLoginChallenges(env, email.value, recentAfter);
  if (recentCount >= LOGIN_CODE_RECENT_LIMIT) {
    await logAuthEvent(
      env,
      "login_code_request",
      { email: email.value, outcome: "rate_limited", recentCount },
      "warn",
    );
    return json({ error: "Liian monta koodipyyntöä. Odota hetki ja yritä uudelleen." }, 429);
  }

  const code = createLoginCode();
  const salt = createSecretToken(16);
  const codeHash = await hashLoginCode(email.value, code, salt, env);
  const expiresAt = addSeconds(now, LOGIN_CODE_EXPIRES_IN_SECONDS).toISOString();
  const challengeId = createChallengeId();

  await insertLoginChallenge(env, {
    id: challengeId,
    email: email.value,
    codeHash,
    salt,
    expiresAt,
    createdAt: nowIso,
  });

  try {
    await sendLoginCodeEmail(env, email.value, code);
  } catch (error) {
    await deleteLoginChallenge(env, challengeId);
    const emailError = describeEmailSendFailure(error, env.AUTH_EMAIL_FROM ?? "login@breview.ing");
    await logAuthEvent(
      env,
      "login_code_send_failure",
      {
        email: email.value,
        challengeId,
        status: emailError.status,
        diagnostic: emailError.diagnostic,
        hasEmailBinding: Boolean(env.EMAIL),
        error,
      },
      "error",
    );
    return json({ error: emailError.message }, emailError.status);
  }

  await logAuthEvent(env, "login_code_send_success", {
    email: email.value,
    challengeId,
    expiresInSeconds: LOGIN_CODE_EXPIRES_IN_SECONDS,
  });

  const response: RequestLoginCodeResponse = {
    ok: true,
    email: email.value,
    expiresInSeconds: LOGIN_CODE_EXPIRES_IN_SECONDS,
    resendAvailableInSeconds: LOGIN_CODE_RESEND_COOLDOWN_SECONDS,
  };
  return json(response);
}

export async function handleVerifyLoginCode(request: Request, env: Env): Promise<Response> {
  const body = await parseJson<VerifyLoginCodeRequest>(request);
  const email = normalizeEmail(body?.email);
  if ("error" in email) {
    await logAuthEvent(env, "login_code_verify_failure", { reason: "invalid_email" }, "warn");
    return json({ error: email.error }, 400);
  }

  const code = normalizeLoginCode(body?.code);
  if (!code) {
    await logAuthEvent(
      env,
      "login_code_verify_failure",
      { email: email.value, reason: "invalid_code_format" },
      "warn",
    );
    return json({ error: "Anna kuusinumeroinen koodi" }, 400);
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const challenge = await getLatestValidLoginChallenge(env, email.value, nowIso);
  if (!challenge) {
    await logAuthEvent(
      env,
      "login_code_verify_failure",
      { email: email.value, reason: "missing_or_expired_challenge" },
      "warn",
    );
    return json({ error: "Koodi on vanhentunut tai sitä ei löytynyt" }, 400);
  }

  if (Number(challenge.attempts ?? 0) >= LOGIN_CODE_MAX_ATTEMPTS) {
    await logAuthEvent(
      env,
      "login_code_verify_failure",
      { email: email.value, challengeId: challenge.id, reason: "max_attempts" },
      "warn",
    );
    return json({ error: "Liian monta yritystä. Pyydä uusi koodi." }, 429);
  }

  const codeHash = await hashLoginCode(email.value, code, challenge.salt, env);
  if (!constantTimeEqual(codeHash, challenge.codeHash)) {
    await incrementLoginChallengeAttempts(env, challenge.id);
    await logAuthEvent(
      env,
      "login_code_verify_failure",
      { email: email.value, challengeId: challenge.id, reason: "code_mismatch" },
      "warn",
    );
    return json({ error: "Koodi ei täsmää" }, 400);
  }

  await consumeLoginChallenge(env, challenge.id, nowIso);

  const user = await getOrCreateUserByEmail(env, email.value, nowIso);
  const sessionToken = createSecretToken(32);
  const sessionHash = await hashSessionToken(sessionToken, env);
  await createSession(env, sessionHash, user.id, nowIso, addDays(now, SESSION_EXPIRES_IN_DAYS).toISOString());

  const clientIds = uniqueClientIds([body?.clientId, ...(Array.isArray(body?.clientIds) ? body.clientIds : [])]);
  for (const clientId of clientIds) {
    await linkPlayersForClientId(env, user.id, clientId, nowIso);
  }

  await logAuthEvent(env, "login_code_verify_success", {
    email: email.value,
    challengeId: challenge.id,
    userId: user.id,
    linkedClientIds: clientIds.length,
  });

  const response: VerifyLoginCodeResponse = {
    ok: true,
    sessionToken,
    user,
    history: await getAccountHistory(env, user.id),
  };
  return json(response);
}

export async function handleGetAccount(request: Request, env: Env): Promise<Response> {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();

  const response: AccountMeResponse = {
    ok: true,
    user,
    history: await getAccountHistory(env, user.id),
  };
  return json(response);
}

export async function handleLogout(request: Request, env: Env): Promise<Response> {
  const token = readBearerToken(request);
  const user = token ? await getSessionUser(request, env) : null;
  if (token) {
    await revokeSession(env, await hashSessionToken(token, env), new Date().toISOString());
  }

  await logAuthEvent(
    env,
    "logout",
    {
      email: user?.email,
      userId: user?.id,
      authenticated: Boolean(user),
      hadBearerToken: Boolean(token),
    },
    user || !token ? "info" : "warn",
  );

  const response: LogoutResponse = { ok: true };
  return json(response);
}

export async function handleDeleteAccount(request: Request, env: Env): Promise<Response> {
  const token = readBearerToken(request);
  if (!token) {
    await logAuthEvent(env, "account_deletion", { outcome: "missing_token" }, "warn");
    return unauthorized();
  }

  const user = await getSessionUser(request, env);
  if (!user) {
    await logAuthEvent(env, "account_deletion", { outcome: "invalid_or_expired_session" }, "warn");
    return unauthorized();
  }

  const nowIso = new Date().toISOString();
  await revokeSession(env, await hashSessionToken(token, env), nowIso);
  await deleteAccountAndLinkedPlayers(env, user.id);
  await logAuthEvent(env, "account_deletion", {
    email: user.email,
    userId: user.id,
    outcome: "deleted",
  });

  const response: DeleteAccountResponse = { ok: true };
  return json(response);
}
