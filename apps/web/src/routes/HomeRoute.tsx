import { useMemo, useState } from "react";
import { getWelcomeCopy, type RatingMode, type ResultsVisibility } from "@breview/shared";
import type { CreateGameRequest } from "@breview/shared/api-contracts";
import logoUrl from "../../../../breview-logo.png";
import { apiClient } from "../api/client";
import { BeerEditor, type BeerEditorRow } from "../components/BeerEditor";
import { useHaptics } from "../hooks/useHaptics";
import { prepareImageForBeerNameRecognition, prepareImageForManagedUpload } from "../utils/beer-name-image";
import { saveHostToken } from "../utils/creator-session";
import { validateImageFileBeforeUpload } from "../utils/image-upload";
import { getOrCreateClientId } from "../utils/player-identity";

const WELCOME_STORAGE_KEY = "breview_welcome_dismissed_v1";
const BATCH_RECOGNITION_CONCURRENCY = 3;

type BatchStatus = "queued" | "loading" | "success" | "error";

function createBeerRow(file?: File): BeerEditorRow {
  return {
    clientKey: `row-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "",
    imageUrl: "",
    file: file ?? null,
  };
}

export function HomeRoute() {
  const haptics = useHaptics();
  const welcomeCopy = useMemo(() => {
    const languages = typeof navigator === "undefined" ? [] : Array.from(navigator.languages ?? [navigator.language]);
    return getWelcomeCopy(languages);
  }, []);
  const [showWelcome, setShowWelcome] = useState(() => {
    try {
      return localStorage.getItem(WELCOME_STORAGE_KEY) !== "1";
    } catch {
      return true;
    }
  });
  const [showCreate, setShowCreate] = useState(true);
  const [joinLink, setJoinLink] = useState("");
  const [gameName, setGameName] = useState("");
  const [beers, setBeers] = useState<BeerEditorRow[]>([createBeerRow()]);
  const [batchStatus, setBatchStatus] = useState<Record<string, { state: BatchStatus; message: string }>>({});
  const [ratingMode, setRatingMode] = useState<RatingMode>("slider");
  const [scorePreset, setScorePreset] = useState("0-10");
  const [customMin, setCustomMin] = useState("0");
  const [customMax, setCustomMax] = useState("10");
  const [customStep, setCustomStep] = useState("0.25");
  const [resultsVisibility, setResultsVisibility] = useState<ResultsVisibility>("host_reveal");
  const [safetyAccepted, setSafetyAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function dismissWelcome() {
    haptics.selection();
    setShowWelcome(false);
    try {
      localStorage.setItem(WELCOME_STORAGE_KEY, "1");
    } catch {
      // Non-persistent welcome is fine when storage is unavailable.
    }
  }

  function ratingSettings(): CreateGameRequest["settings"] {
    if (ratingMode === "stars") {
      return {
        ratingMode,
        scoreMin: 0,
        scoreMax: 5,
        scoreStep: 0.5,
        resultsVisibility,
      };
    }

    if (scorePreset === "0-5") {
      return { ratingMode, scoreMin: 0, scoreMax: 5, scoreStep: 0.25, resultsVisibility };
    }
    if (scorePreset === "1-10") {
      return { ratingMode, scoreMin: 1, scoreMax: 10, scoreStep: 0.25, resultsVisibility };
    }
    if (scorePreset === "custom") {
      return {
        ratingMode,
        scoreMin: Number(customMin),
        scoreMax: Number(customMax),
        scoreStep: Number(customStep),
        resultsVisibility,
      };
    }
    return { ratingMode, scoreMin: 0, scoreMax: 10, scoreStep: 0.25, resultsVisibility };
  }

  function openSharedLink() {
    const value = joinLink.trim();
    if (!value) return;

    try {
      const url = new URL(value);
      if (url.origin !== window.location.origin && url.hostname !== "breview.ing") {
        throw new Error("Käytä Breviewin jaettua sessiolinkkiä.");
      }
      if (!/^\/[sh]\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)) {
        throw new Error("Linkki ei näytä Breview-sessiolinkiltä.");
      }
      haptics.light();
      window.location.href = `${url.pathname}${url.hash}`;
    } catch (error) {
      haptics.error();
      alert(String((error as Error)?.message ?? "Liitä koko Breview-sessiolinkki."));
    }
  }

  function setBatchRowStatus(clientKey: string, state: BatchStatus, message: string) {
    setBatchStatus((current) => ({ ...current, [clientKey]: { state, message } }));
  }

  async function recognizeBatchRows(rows: BeerEditorRow[]) {
    const queue = rows.filter((row) => row.clientKey && row.file) as Array<BeerEditorRow & { clientKey: string; file: File }>;
    let cursor = 0;

    async function worker() {
      for (;;) {
        const row = queue[cursor];
        cursor += 1;
        if (!row) return;

        setBatchRowStatus(row.clientKey, "loading", "Tunnistetaan nimeä...");
        try {
          const preparedFile = await prepareImageForBeerNameRecognition(row.file);
          const identified = await apiClient.identifyBeerName(preparedFile, getOrCreateClientId());
          setBeers((current) =>
            current.map((beer) =>
              beer.clientKey === row.clientKey ? { ...beer, name: identified.beerName, file: preparedFile } : beer,
            ),
          );
          setBatchRowStatus(row.clientKey, "success", `Tunnistettu: ${identified.beerName}`);
        } catch (error) {
          setBatchRowStatus(row.clientKey, "error", String((error as Error)?.message ?? "Tunnistus epäonnistui"));
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(BATCH_RECOGNITION_CONCURRENCY, queue.length) }, () => worker()));
  }

  function addFiles(files: FileList | File[]) {
    const nextFiles = Array.from(files).filter((file) => file.type.toLowerCase().startsWith("image/"));
    if (!nextFiles.length) return;
    haptics.selection();
    const newRows = nextFiles.map((file) => createBeerRow(file));
    setBeers((current) => {
      const existing = current.length === 1 && !current[0].name.trim() && !current[0].file ? [] : current;
      return [...existing, ...newRows];
    });
    for (const row of newRows) {
      if (row.clientKey) setBatchRowStatus(row.clientKey, "queued", "Jonossa tunnistukseen");
    }
    void recognizeBatchRows(newRows);
  }

  async function submitCreateGame() {
    try {
      haptics.light();
      setSubmitting(true);

      const trimmedName = gameName.trim();
      if (!trimmedName) throw new Error("Anna sessiolle nimi");
      if (!safetyAccepted) throw new Error("Hyväksy turvallisen käytön ehdot ennen session luontia.");

      const payloadBeers: CreateGameRequest["beers"] = [];
      for (let index = 0; index < beers.length; index += 1) {
        const row = beers[index];
        const name = row.name.trim();
        if (!name) {
          throw new Error(`Anna nimi kaikille juomille tai poista tyhjä rivi (rivi ${index + 1})`);
        }

        let image_url = row.imageUrl.trim() || null;
        if (row.file) {
          const uploadFile = await prepareImageForManagedUpload(row.file);
          await validateImageFileBeforeUpload(uploadFile);
          const upload = await apiClient.uploadImage(uploadFile);
          image_url = upload.imageUrl;
        }

        payloadBeers.push({
          name,
          image_url,
        });
      }

      if (!payloadBeers.length) {
        throw new Error("Lisää vähintään yksi juoma");
      }

      const result = await apiClient.createGame({
        name: trimmedName,
        beers: payloadBeers,
        settings: ratingSettings(),
      });

      saveHostToken(result.shareId, result.hostToken);
      haptics.success();
      window.location.href = result.hostUrl;
    } catch (error) {
      haptics.error();
      alert(String((error as Error)?.message ?? error));
      setSubmitting(false);
    }
  }

  return (
    <div className="app-wrap">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
          <div>
            <div className="mb-1 text-2xl font-extrabold">Breview</div>
            <div className="text-sm text-muted">{welcomeCopy.welcomeSubtitle}</div>
          </div>
        </div>
        <a className="btn btn-pill no-underline" href="/account">
          Tili
        </a>
      </div>

      {showWelcome ? (
        <div className="card border-amber-500/40" dir={welcomeCopy.dir} lang={welcomeCopy.locale}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <img src={logoUrl} alt="" className="h-16 w-16 rounded-2xl object-cover" />
              <div>
                <div className="text-xl font-bold">{welcomeCopy.welcomeTitle}</div>
                <div className="muted">{welcomeCopy.welcomeSubtitle}</div>
              </div>
            </div>
            <div className="grid gap-2 text-sm text-muted sm:grid-cols-3">
              <div className="rounded-lg border border-line bg-[#14161b] p-3">1. {welcomeCopy.createStep}</div>
              <div className="rounded-lg border border-line bg-[#14161b] p-3">2. {welcomeCopy.inviteStep}</div>
              <div className="rounded-lg border border-line bg-[#14161b] p-3">3. {welcomeCopy.revealStep}</div>
            </div>
            <button className="btn btn-primary" type="button" onClick={dismissWelcome}>
              Aloita
            </button>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="flex flex-col gap-3">
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              haptics.selection();
              setShowCreate((prev) => !prev);
            }}
          >
            Luo sessio
          </button>

          <div className="h-px bg-line" />

          <label className="text-sm text-muted" htmlFor="join-link">
            Avaa jaettu sessiolinkki
          </label>
          <div className="flex gap-2">
            <input
              id="join-link"
              className="input"
              value={joinLink}
              onChange={(event) => setJoinLink(event.target.value)}
              placeholder="https://breview.ing/s/..."
              inputMode="url"
            />
            <button
              className="btn"
              type="button"
              onClick={openSharedLink}
            >
              Avaa
            </button>
          </div>
        </div>
      </div>

      {showCreate ? (
        <>
          <div className="card">
            <div className="grid gap-3">
              <div>
                <div className="font-semibold">Session asetukset</div>
                <div className="muted">Valitse arvostelutapa ja milloin tulokset näkyvät.</div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="grid gap-1 text-sm text-muted">
                  Arvostelutapa
                  <select className="input" value={ratingMode} onChange={(event) => setRatingMode(event.target.value as RatingMode)}>
                    <option value="slider">Slideri</option>
                    <option value="stars">Tähdet</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm text-muted">
                  Tulokset
                  <select
                    className="input"
                    value={resultsVisibility}
                    onChange={(event) => setResultsVisibility(event.target.value as ResultsVisibility)}
                  >
                    <option value="host_reveal">Paljasta lopussa</option>
                    <option value="after_submit">Näytä oman tallennuksen jälkeen</option>
                    <option value="live">Näytä heti</option>
                  </select>
                </label>
              </div>
              {ratingMode === "slider" ? (
                <div className="grid gap-2 sm:grid-cols-4">
                  <label className="grid gap-1 text-sm text-muted">
                    Asteikko
                    <select className="input" value={scorePreset} onChange={(event) => setScorePreset(event.target.value)}>
                      <option value="0-10">0-10</option>
                      <option value="0-5">0-5</option>
                      <option value="1-10">1-10</option>
                      <option value="custom">Oma</option>
                    </select>
                  </label>
                  {scorePreset === "custom" ? (
                    <>
                      <input className="input" value={customMin} onChange={(event) => setCustomMin(event.target.value)} aria-label="Minimi" />
                      <input className="input" value={customMax} onChange={(event) => setCustomMax(event.target.value)} aria-label="Maksimi" />
                      <input className="input" value={customStep} onChange={(event) => setCustomStep(event.target.value)} aria-label="Askel" />
                    </>
                  ) : null}
                </div>
              ) : null}
              <label className="flex items-start gap-2 text-sm text-muted">
                <input
                  className="mt-1"
                  type="checkbox"
                  checked={safetyAccepted}
                  onChange={(event) => setSafetyAccepted(event.target.checked)}
                />
                <span>Lisään vain asiallista sisältöä ja ymmärrän, että nimet, kuvat ja kommentit näkyvät linkin saaneille.</span>
              </label>
              <label className="btn inline-flex cursor-pointer justify-center">
                Lisää monta kuvaa
                <input
                  className="sr-only"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    if (event.target.files) addFiles(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>
              {Object.keys(batchStatus).length ? (
                <div className="grid gap-1 text-xs text-muted">
                  {Object.entries(batchStatus).slice(-6).map(([key, status]) => (
                    <div key={key} className={status.state === "error" ? "text-red-200" : ""}>
                      {status.state === "queued" ? "Jonossa" : status.state === "loading" ? "Käynnissä" : status.state === "success" ? "Valmis" : "Korjaa käsin"}: {status.message}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <BeerEditor
            title="Luo uusi sessio"
            gameName={gameName}
            onGameNameChange={setGameName}
            beers={beers}
            onBeersChange={setBeers}
            onSubmit={submitCreateGame}
            submitting={submitting}
            submitLabel="Tallenna ja luo sessio"
            addLabel="+ Lisää juoma"
          />
        </>
      ) : null}

      <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-muted">
        <a className="inline-link" href="/privacy">
          Tietosuoja
        </a>
        <a className="inline-link" href="/support">
          Tuki
        </a>
        <a className="inline-link" href="/delete-account">
          Poista tili
        </a>
      </div>
    </div>
  );
}
