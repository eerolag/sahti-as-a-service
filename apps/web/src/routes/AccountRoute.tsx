import { useEffect, useState, type FormEvent } from "react";
import type { AccountHistoryItemDto } from "@breview/shared/api-contracts";
import { apiClient } from "../api/client";
import { clearAccountSession, loadAccountSession, saveAccountSession, type AccountSession } from "../utils/account-session";
import { getOrCreateClientId } from "../utils/player-identity";

function formatHistoryDate(value: string | null): string {
  if (!value) return "Ei päivämäärää";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

function PrivacyDetails() {
  return (
    <div className="grid gap-3 text-sm leading-6 text-muted">
      <p>
        Breview käyttää sähköpostiosoitetta vain tilin kirjautumiseen ja omien arvostelujen löytämiseen.
        Arvosteluissa tallentuvat nimimerkki, arvosanat, kommentit, session tiedot ja mahdolliset ladatut kuvat.
      </p>
      <p>
        Selaimeen tai sovellukseen tallennetaan tekninen tunniste, jolla aiemmat arvostelut voidaan liittää tiliin
        kirjautumisen jälkeen. Kertakäyttökoodi vanhenee 10 minuutissa.
      </p>
      <p>
        Tietoja käytetään sessioiden luomiseen, arvostelujen tallentamiseen, tulosten näyttämiseen ja väärinkäytön
        rajoittamiseen. Kirjautunut käyttäjä voi poistaa tilinsä tältä sivulta.
      </p>
    </div>
  );
}

function HistoryList({ history }: { history: AccountHistoryItemDto[] }) {
  if (!history.length) {
    return <div className="muted">Ei tilille linkitettyjä arvosteluja vielä.</div>;
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
            <span className="block truncate font-semibold">{item.gameName || `Sessio #${item.gameId}`}</span>
            <span className="block text-sm text-muted">{formatHistoryDate(item.updatedAt)}</span>
          </span>
          <span className="badge shrink-0">{item.ratingsCount} arviota</span>
        </a>
      ))}
    </div>
  );
}

export function AccountRoute() {
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
      setMessage("Koodi lähetetty. Tarkista sähköposti ja syötä kuusinumeroinen koodi.");
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
      setMessage("Kirjautuminen onnistui.");
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
    const confirmed = window.confirm("Poistetaanko tili ja siihen linkitetyt arvostelut?");
    if (!confirmed) return;

    setLoading(true);
    setMessage(null);

    try {
      await apiClient.deleteAccount(session.sessionToken);
      clearAccountSession();
      setSession(null);
      setHistory([]);
      setMessage("Tili poistettu.");
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
          <div className="mt-1 text-2xl font-extrabold">Tili</div>
        </div>
        <a className="btn btn-pill no-underline" href="/">
          Sessiot
        </a>
      </div>

      <div className="card">
        {session ? (
          <div className="grid gap-4">
            <div>
              <div className="font-semibold">Kirjautunut</div>
              <div className="muted">{session.user.email}</div>
            </div>
            <HistoryList history={history} />
          </div>
        ) : (
          <div className="grid gap-4">
            <div>
              <div className="font-semibold">Historia talteen</div>
              <div className="muted">Syötä sähköposti, niin lähetämme kertakäyttökoodin.</div>
            </div>

            <form className="grid gap-3" onSubmit={requestCode}>
              <label className="text-sm text-muted" htmlFor="account-email">
                Sähköposti
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
                  ? `Uusi koodi ${resendCooldown} s`
                  : codeSent
                    ? "Lähetä uusi koodi"
                    : "Lähetä koodi"}
              </button>
              {codeSent && resendCooldown > 0 ? (
                <div className="text-xs text-muted">Voit pyytää uuden kirjautumiskoodin hetken kuluttua.</div>
              ) : null}
            </form>

            {codeSent ? (
              <form className="grid gap-3" onSubmit={verifyCode}>
                <label className="text-sm text-muted" htmlFor="account-code">
                  Koodi
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
                  Kirjaudu
                </button>
              </form>
            ) : null}
          </div>
        )}
      </div>

      {message ? <div className="card text-sm text-accent">{message}</div> : null}

      {session ? (
        <div className="card">
          <div className="mb-3 font-semibold">Data ja tuki</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="btn grow" type="button" disabled={loading} onClick={() => void logout()}>
              Kirjaudu ulos
            </button>
            <button className="btn btn-danger grow" type="button" disabled={loading} onClick={() => void deleteAccount()}>
              Poista tili
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <a className="inline-link" href="/privacy">
              Tietosuoja
            </a>
            <a className="inline-link" href="/support">
              Tuki
            </a>
            <a className="inline-link" href="/delete-account">
              Tilin poistamisen ohjeet
            </a>
          </div>
        </div>
      ) : null}

      <div className="card">
        <button className="btn w-full" type="button" onClick={() => setPrivacyOpen((open) => !open)}>
          Tietosuoja
        </button>
        {privacyOpen ? (
          <div className="mt-4 border-t border-line pt-4">
            <PrivacyDetails />
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <a className="inline-link" href="/privacy">
                Tietosuojaseloste
              </a>
              <a className="inline-link" href="/support">
                Tuki
              </a>
              <a className="inline-link" href="/delete-account">
                Tilin poistaminen
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
