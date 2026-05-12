import { useState } from "react";
import type { RatingMode, ResultsVisibility } from "@breview/shared";
import type { CreateGameRequest } from "@breview/shared/api-contracts";
import logoUrl from "../../../../breview-logo.png";
import { apiClient } from "../api/client";
import { BeerEditor, type BeerEditorRow } from "../components/BeerEditor";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { useHaptics } from "../hooks/useHaptics";
import { useT } from "../i18n/i18nContext";
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
  const t = useT();
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
        throw new Error(t.errors.useBreviewLink);
      }
      if (!/^\/[sh]\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)) {
        throw new Error(t.errors.notBreviewLink);
      }
      haptics.light();
      window.location.href = `${url.pathname}${url.hash}`;
    } catch (error) {
      haptics.error();
      alert(String((error as Error)?.message ?? t.errors.pasteFullLink));
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

        setBatchRowStatus(row.clientKey, "loading", `${t.editor.identifyingName}`);
        try {
          const preparedFile = await prepareImageForBeerNameRecognition(row.file);
          const identified = await apiClient.identifyBeerName(preparedFile, getOrCreateClientId());
          setBeers((current) =>
            current.map((beer) =>
              beer.clientKey === row.clientKey ? { ...beer, name: identified.beerName, file: preparedFile } : beer,
            ),
          );
          setBatchRowStatus(row.clientKey, "success", `${t.editor.identifiedName}: ${identified.beerName}`);
        } catch (error) {
          setBatchRowStatus(row.clientKey, "error", String((error as Error)?.message ?? t.editor.identificationFailed));
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
      if (row.clientKey) setBatchRowStatus(row.clientKey, "queued", t.editor.queuedForRecognition);
    }
    void recognizeBatchRows(newRows);
  }

  async function submitCreateGame() {
    try {
      haptics.light();
      setSubmitting(true);

      const trimmedName = gameName.trim();
      if (!trimmedName) throw new Error(t.errors.giveSessionName);
      if (!safetyAccepted) throw new Error(t.errors.acceptSafety);

      const payloadBeers: CreateGameRequest["beers"] = [];
      for (let index = 0; index < beers.length; index += 1) {
        const row = beers[index];
        const name = row.name.trim();
        if (!name) {
          throw new Error(`${t.errors.nameAllDrinks} (${t.editor.rowLabel} ${index + 1})`);
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
        throw new Error(t.errors.addAtLeastOneDrink);
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

  function batchStatusLabel(state: BatchStatus): string {
    if (state === "queued") return t.home.queued;
    if (state === "loading") return t.home.running;
    if (state === "success") return t.home.done;
    return t.home.fixManually;
  }

  return (
    <div className="app-wrap">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
          <div>
            <div className="mb-1 text-2xl font-extrabold">Breview</div>
            <div className="text-sm text-muted">{t.welcome.welcomeSubtitle}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <a className="btn btn-pill no-underline" href="/account">
            {t.nav.account}
          </a>
        </div>
      </div>

      {showWelcome ? (
        <div className="card border-amber-500/40" lang={t.locale}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <img src={logoUrl} alt="" className="h-16 w-16 rounded-2xl object-cover" />
              <div>
                <div className="text-xl font-bold">{t.welcome.welcomeTitle}</div>
                <div className="muted">{t.welcome.welcomeSubtitle}</div>
              </div>
            </div>
            <div className="grid gap-2 text-sm text-muted sm:grid-cols-3">
              <div className="rounded-lg border border-line bg-[#14161b] p-3">1. {t.welcome.createStep}</div>
              <div className="rounded-lg border border-line bg-[#14161b] p-3">2. {t.welcome.inviteStep}</div>
              <div className="rounded-lg border border-line bg-[#14161b] p-3">3. {t.welcome.revealStep}</div>
            </div>
            <button className="btn btn-primary" type="button" onClick={dismissWelcome}>
              {t.welcome.start}
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
            {t.home.createSession}
          </button>

          <div className="h-px bg-line" />

          <label className="text-sm text-muted" htmlFor="join-link">
            {t.home.openSharedLink}
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
              {t.home.open}
            </button>
          </div>
        </div>
      </div>

      {showCreate ? (
        <>
          <div className="card">
            <div className="grid gap-3">
              <div>
                <div className="font-semibold">{t.home.sessionSettings}</div>
                <div className="muted">{t.home.settingsDescription}</div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="grid gap-1 text-sm text-muted">
                  {t.home.ratingMode}
                  <select className="input" value={ratingMode} onChange={(event) => setRatingMode(event.target.value as RatingMode)}>
                    <option value="slider">{t.home.slider}</option>
                    <option value="stars">{t.home.stars}</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm text-muted">
                  {t.home.results}
                  <select
                    className="input"
                    value={resultsVisibility}
                    onChange={(event) => setResultsVisibility(event.target.value as ResultsVisibility)}
                  >
                    <option value="host_reveal">{t.home.revealAtEnd}</option>
                    <option value="after_submit">{t.home.showAfterSubmit}</option>
                    <option value="live">{t.home.showImmediately}</option>
                  </select>
                </label>
              </div>
              {ratingMode === "slider" ? (
                <div className="grid gap-2 sm:grid-cols-4">
                  <label className="grid gap-1 text-sm text-muted">
                    {t.home.scale}
                    <select className="input" value={scorePreset} onChange={(event) => setScorePreset(event.target.value)}>
                      <option value="0-10">0-10</option>
                      <option value="0-5">0-5</option>
                      <option value="1-10">1-10</option>
                      <option value="custom">{t.home.custom}</option>
                    </select>
                  </label>
                  {scorePreset === "custom" ? (
                    <>
                      <input className="input" value={customMin} onChange={(event) => setCustomMin(event.target.value)} aria-label={t.home.minLabel} />
                      <input className="input" value={customMax} onChange={(event) => setCustomMax(event.target.value)} aria-label={t.home.maxLabel} />
                      <input className="input" value={customStep} onChange={(event) => setCustomStep(event.target.value)} aria-label={t.home.stepLabel} />
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
                <span>{t.home.safetyCheckbox}</span>
              </label>
              <label className="btn inline-flex cursor-pointer justify-center">
                {t.home.addMultipleImages}
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
                      {batchStatusLabel(status.state)}: {status.message}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <BeerEditor
            title={t.editor.createNewSession}
            gameName={gameName}
            onGameNameChange={setGameName}
            beers={beers}
            onBeersChange={setBeers}
            onSubmit={submitCreateGame}
            submitting={submitting}
            submitLabel={t.editor.saveAndCreate}
            addLabel={t.editor.addDrink}
          />
        </>
      ) : null}

      <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-muted">
        <a className="inline-link" href="/privacy">
          {t.nav.privacy}
        </a>
        <a className="inline-link" href="/support">
          {t.nav.support}
        </a>
        <a className="inline-link" href="/delete-account">
          {t.nav.deleteAccount}
        </a>
      </div>
    </div>
  );
}
