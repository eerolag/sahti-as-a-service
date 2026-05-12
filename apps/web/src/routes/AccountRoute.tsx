import { useEffect, useState, type FormEvent } from "react";
import type { AccountHistoryItemDto } from "@breview/shared/api-contracts";
import { apiClient } from "../api/client";
import { useI18n } from "../i18n/i18nContext";
import { clearAccountSession, loadAccountSession, saveAccountSession, type AccountSession } from "../utils/account-session";
import { getOrCreateClientId } from "../utils/player-identity";

function PrivacyDetails({ descriptions }: { descriptions: readonly string[] }) {
  return (
    <div className="grid gap-3 text-sm leading-6 text-muted">
      {descriptions.map((text, idx) => (
        <p key={idx}>{text}</p>
      ))}
    </div>
  );
}

function HistoryList({
  history,
  ratingsLabel,
  noDateLabel,
  locale,
}: {
  history: AccountHistoryItemDto[];
  ratingsLabel: string;
  noDateLabel: string;
  locale: string;
}) {
  function formatHistoryDate(value: string | null, locale: string): string {
    if (!value) return noDateLabel;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(locale, {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
  }

  if (!history.length) {
    return null;
  }

  return (
    <div className="grid gap-2">
      {history.map((item) => (
        <a
          key={item.gameId}
          className="flex items-center justify-between gap-3 rounded-lg border border-line bg-[#14161b] p-3 no-underline"
          href={`/${item.gameId}`}
        >
          <span className="min-w-0">
            <span className="block truncate font-semibold">{item.gameName || `Session #${item.gameId}`}</span>
            <span className="block text-sm text-muted">{formatHistoryDate(item.updatedAt, locale)}</span>
          </span>
          <span className="badge shrink-0">{item.ratingsCount} {ratingsLabel}</span>
        </a>
      ))}
    </div>
  );
}

export function AccountRoute() {
  const { t, locale } = useI18n();
  const [session, setSession] = useState<AccountSession | null>(() => loadAccountSession());
  const [history, setHistory] = useState<AccountHistoryItemDto[]>([]);
  const [email, setEmail] = useState(() => session?.user.email ?? "");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      setHistory([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const account = await apiClient.getAccount(session.sessionToken);
        if (cancelled) return;
        setHistory(account.history);
        setEmail(account.user.email);
        const nextSession = { sessionToken: session.sessionToken, user: account.user };
        setSession(nextSession);
        saveAccountSession(nextSession);
      } catch {
        if (cancelled) return;
        clearAccountSession();
        setSession(null);
        setHistory([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.sessionToken]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timeout = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [resendCooldown]);

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (resendCooldown > 0) return;
    setLoading(true);
    setMessage(null);

    try {
      const response = await apiClient.requestLoginCode({ email });
      setEmail(response.email);
      setCodeSent(true);
      setResendCooldown(response.resendAvailableInSeconds);
      setMessage(t.account.codeSent);
    } catch (error) {
      setMessage(String((error as Error)?.message ?? error));
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await apiClient.verifyLoginCode({
        email,
        code,
        clientId: getOrCreateClientId(),
      });
      const nextSession = { sessionToken: response.sessionToken, user: response.user };
      saveAccountSession(nextSession);
      setSession(nextSession);
      setHistory(response.history);
      setCode("");
      setCodeSent(false);
      setResendCooldown(0);
      setMessage(t.account.loginSuccess);
    } catch (error) {
      setMessage(String((error as Error)?.message ?? error));
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    if (!session) return;
    setLoading(true);
    setMessage(null);

    try {
      await apiClient.logout(session.sessionToken);
    } catch {
      // Local logout should still happen if the server session is already gone.
    } finally {
      clearAccountSession();
      setSession(null);
      setHistory([]);
      setLoading(false);
    }
  }

  async function deleteAccount() {
    if (!session) return;
    const confirmed = window.confirm(t.account.confirmDelete);
    if (!confirmed) return;

    setLoading(true);
    setMessage(null);

    try {
      await apiClient.deleteAccount(session.sessionToken);
      clearAccountSession();
      setSession(null);
      setHistory([]);
      setMessage(t.account.accountDeleted);
    } catch (error) {
      setMessage(String((error as Error)?.message ?? error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-wrap">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <a className="inline-link no-underline" href="/">
            Breview
          </a>
          <div className="mt-1 text-2xl font-extrabold">{t.account.title}</div>
        </div>
        <a className="btn btn-pill no-underline" href="/">
          {t.nav.sessions}
        </a>
      </div>

      <div className="card">
        {session ? (
          <div className="grid gap-4">
            <div>
              <div className="font-semibold">{t.account.loggedIn}</div>
              <div className="muted">{session.user.email}</div>
            </div>
            {history.length ? (
              <HistoryList
                history={history}
                ratingsLabel={t.account.ratingsCount}
                noDateLabel={t.account.noDate}
                locale={locale}
              />
            ) : (
              <div className="muted">{t.account.noHistory}</div>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            <div>
              <div className="font-semibold">{t.account.saveHistory}</div>
              <div className="muted">{t.account.enterEmailPrompt}</div>
            </div>

            <form className="grid gap-3" onSubmit={requestCode}>
              <label className="text-sm text-muted" htmlFor="account-email">
                {t.account.emailLabel}
              </label>
              <input
                id="account-email"
                className="input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nimi@example.com"
              />
              <button className="btn btn-primary" type="submit" disabled={loading || resendCooldown > 0}>
                {resendCooldown > 0
                  ? `${t.account.newCodeIn} ${resendCooldown} s`
                  : codeSent
                    ? t.account.resendCode
                    : t.account.sendCode}
              </button>
              {codeSent && resendCooldown > 0 ? (
                <div className="text-xs text-muted">{t.account.canRequestNewCode}</div>
              ) : null}
            </form>

            {codeSent ? (
              <form className="grid gap-3" onSubmit={verifyCode}>
                <label className="text-sm text-muted" htmlFor="account-code">
                  {t.account.codeLabel}
                </label>
                <input
                  id="account-code"
                  className="input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="123456"
                />
                <button className="btn btn-success" type="submit" disabled={loading}>
                  {t.account.login}
                </button>
              </form>
            ) : null}
          </div>
        )}
      </div>

      {message ? <div className="card text-sm text-accent">{message}</div> : null}

      {session ? (
        <div className="card">
          <div className="mb-3 font-semibold">{t.account.dataAndSupport}</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="btn grow" type="button" disabled={loading} onClick={() => void logout()}>
              {t.account.logout}
            </button>
            <button className="btn btn-danger grow" type="button" disabled={loading} onClick={() => void deleteAccount()}>
              {t.account.deleteAccount}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <a className="inline-link" href="/privacy">
              {t.nav.privacy}
            </a>
            <a className="inline-link" href="/support">
              {t.nav.support}
            </a>
            <a className="inline-link" href="/delete-account">
              {t.account.deleteAccountInstructions}
            </a>
          </div>
        </div>
      ) : null}

      <div className="card">
        <button className="btn w-full" type="button" onClick={() => setPrivacyOpen((open) => !open)}>
          {t.account.privacyToggle}
        </button>
        {privacyOpen ? (
          <div className="mt-4 border-t border-line pt-4">
            <PrivacyDetails descriptions={t.account.privacyDescription} />
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <a className="inline-link" href="/privacy">
                {t.account.privacyStatement}
              </a>
              <a className="inline-link" href="/support">
                {t.nav.support}
              </a>
              <a className="inline-link" href="/delete-account">
                {t.nav.deleteAccount}
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
