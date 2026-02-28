import { useEffect, useMemo, useState } from "react";
import type { GetResultsResponse, ResultBeerDto, UpdateGameRequest } from "../../shared/api-contracts";
import { normalizeScore } from "../../shared/scoring";
import { apiClient } from "../api/client";
import { BeerCard } from "../components/BeerCard";
import { BeerEditor, type BeerEditorRow } from "../components/BeerEditor";
import { ResultList } from "../components/ResultList";
import { SharePanel } from "../components/SharePanel";
import { useDraftRatings } from "../hooks/useDraftRatings";
import { useGameState } from "../hooks/useGameState";

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getClientId(): string {
  const key = "saas_client_id";
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;

    const next = `c_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem(key, next);
    return next;
  } catch {
    return `fallback_${Date.now()}`;
  }
}

function gameDisplayName(name: string | null | undefined, gameId: number): string {
  const clean = String(name ?? "").trim();
  if (clean) return clean;
  return `Peli #${gameId}`;
}

export function GameRoute({ gameId }: { gameId: number }) {
  const clientId = useMemo(() => getClientId(), []);
  const { game, beers, loading, error, loadGame, setGameAndBeers } = useGameState(gameId);
  const { ratings, hydrate, setRating, hasDirty, getChangedRatings, markSaved } = useDraftRatings(
    gameId,
    clientId,
  );

  const [view, setView] = useState<"play" | "edit" | "results">("play");
  const [results, setResults] = useState<GetResultsResponse | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [saveButtonText, setSaveButtonText] = useState("Tallenna");
  const [savingRatings, setSavingRatings] = useState(false);
  const [editDraft, setEditDraft] = useState<{
    gameName: string;
    beers: BeerEditorRow[];
    submitting: boolean;
  } | null>(null);

  useEffect(() => {
    if (!beers.length) return;

    let cancelled = false;
    void (async () => {
      try {
        const data = await apiClient.getRatings(gameId, clientId);
        if (cancelled) return;

        const backendRatings: Record<number, number> = {};
        for (const row of data.ratings) {
          const beerId = Number(row.beerId);
          const score = normalizeScore(row.score);
          if (!Number.isInteger(beerId) || score == null) continue;
          backendRatings[beerId] = score;
        }

        hydrate(
          beers.map((beer) => beer.id),
          backendRatings,
        );
      } catch {
        if (!cancelled) {
          hydrate(
            beers.map((beer) => beer.id),
            {},
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [beers, clientId, gameId, hydrate]);

  const title = gameDisplayName(game?.name, gameId);

  async function openResults() {
    setResultsLoading(true);
    try {
      const payload = await apiClient.getResults(gameId);
      setResults(payload);
      setView("results");
    } catch (error) {
      alert(String((error as Error)?.message ?? error));
    } finally {
      setResultsLoading(false);
    }
  }

  function openEdit() {
    setEditDraft({
      gameName: game?.name ?? "",
      beers: beers.map((beer) => ({
        id: beer.id,
        name: beer.name,
        imageUrl: beer.image_url ?? "",
        untappdUrl: beer.untappd_url ?? "",
        file: null,
      })),
      submitting: false,
    });
    setView("edit");
  }

  async function saveRatings() {
    const changed = getChangedRatings();
    if (!changed.length) return;

    setSavingRatings(true);
    setSaveButtonText("Tallennetaan...");

    try {
      await apiClient.saveRatings(gameId, {
        clientId,
        ratings: changed,
      });
      markSaved(changed);
      setSaveButtonText("Tallennettu");
      window.setTimeout(() => setSaveButtonText("Tallenna"), 800);
    } catch (error) {
      alert(String((error as Error)?.message ?? error));
      setSaveButtonText("Tallenna");
    } finally {
      setSavingRatings(false);
    }
  }

  async function saveGameEdits() {
    if (!editDraft) return;

    try {
      setEditDraft((prev) => (prev ? { ...prev, submitting: true } : prev));

      const trimmedName = editDraft.gameName.trim();
      if (!trimmedName) {
        throw new Error("Anna pelille nimi");
      }

      const payloadBeers: UpdateGameRequest["beers"] = [];
      for (let index = 0; index < editDraft.beers.length; index += 1) {
        const row = editDraft.beers[index];
        const name = row.name.trim();
        if (!name) {
          throw new Error(`Anna nimi kaikille oluille tai poista tyhjä rivi (rivi ${index + 1})`);
        }

        let image_url = row.imageUrl.trim() || null;
        if (row.file) {
          image_url = await fileToDataUrl(row.file);
          if (image_url.length > 700000) {
            throw new Error("Kuvatiedosto liian iso MVP-versioon. Käytä pienempää kuvaa tai URL:ia.");
          }
        }

        payloadBeers.push({
          id: row.id,
          name,
          image_url,
        });
      }

      if (!payloadBeers.length) {
        throw new Error("Lisää vähintään yksi olut");
      }

      const updated = await apiClient.updateGame(gameId, {
        name: trimmedName,
        beers: payloadBeers,
      });

      setGameAndBeers(updated.game, updated.beers);
      setResults(null);
      setView("play");
      setEditDraft(null);
      await loadGame();
    } catch (error) {
      alert(String((error as Error)?.message ?? error));
      setEditDraft((prev) => (prev ? { ...prev, submitting: false } : prev));
    }
  }

  if (loading && !game) {
    return (
      <div className="app-wrap">
        <div className="mb-1 text-2xl font-extrabold">Sahti as a Service</div>
        <div className="card">Ladataan...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-wrap">
        <div className="mb-1 text-2xl font-extrabold">Sahti as a Service</div>
        <div className="card">
          <div className="mb-1 font-semibold">Virhe</div>
          <div className="muted mb-3">{error}</div>
          <a className="btn inline-flex no-underline" href="/">
            Takaisin etusivulle
          </a>
        </div>
      </div>
    );
  }

  if (view === "edit" && editDraft) {
    return (
      <div className="app-wrap">
        <div className="mb-1 text-2xl font-extrabold">Sahti as a Service</div>
        <div className="mb-4 text-sm text-muted">{title} • Muokkaa peliä</div>

        <BeerEditor
          title="Muokkaa peliä"
          gameName={editDraft.gameName}
          onGameNameChange={(value) => setEditDraft((prev) => (prev ? { ...prev, gameName: value } : prev))}
          beers={editDraft.beers}
          onBeersChange={(next) => setEditDraft((prev) => (prev ? { ...prev, beers: next } : prev))}
          onSubmit={saveGameEdits}
          submitting={editDraft.submitting}
          submitLabel="Tallenna muutokset"
          addLabel="+ Lisää olut"
          onCancel={() => {
            setView("play");
            setEditDraft(null);
          }}
        />
      </div>
    );
  }

  if (view === "results") {
    const resultBeers: ResultBeerDto[] = results?.beers ?? [];
    return (
      <div className="app-wrap">
        <div className="mb-1 text-2xl font-extrabold">Sahti as a Service</div>
        <div className="mb-4 text-sm text-muted">{title} • Tulokset</div>

        <div className="card">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="badge">Pelaajia: {Number(results?.summary?.players ?? 0)}</div>
              <div className="muted">Järjestetty keskiarvon mukaan</div>
            </div>
            <button className="btn" type="button" onClick={() => setView("play")}>Paluu peliin</button>
          </div>
        </div>

        <ResultList beers={resultBeers} />

        <div className="card sticky bottom-0">
          <button className="btn" type="button" disabled={resultsLoading} onClick={() => void openResults()}>
            {resultsLoading ? "Päivitetään..." : "Päivitä tulokset"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-wrap">
      <div className="mb-1 text-2xl font-extrabold">Sahti as a Service</div>
      <div className="mb-4 text-sm text-muted">{title} • Arvostele oluet</div>

      <div className="card">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="font-semibold">{title}</div>
              <div className="muted">Peli-ID: {gameId} • {beers.length} olutta</div>
              <div className="muted">Client ID: {clientId.slice(-8)} (selainkohtainen)</div>
            </div>
            <a className="btn no-underline" href="/">
              Etusivu
            </a>
          </div>

          <SharePanel gameId={gameId} />

          <div className="flex gap-2">
            <button className="btn grow" type="button" onClick={openEdit}>
              Muokkaa
            </button>
          </div>
        </div>
      </div>

      <div className="beer-list">
        {beers.map((beer) => (
          <BeerCard
            key={beer.id}
            beer={beer}
            mode="play"
            score={ratings[beer.id] ?? 0}
            onScoreChange={(score) => setRating(beer.id, score)}
          />
        ))}
      </div>

      <div className="card sticky bottom-0">
        <div className="flex flex-col gap-2">
          <button
            className="btn btn-success"
            type="button"
            disabled={!hasDirty || savingRatings}
            onClick={() => void saveRatings()}
          >
            {saveButtonText}
          </button>
          <button className="btn" type="button" disabled={resultsLoading} onClick={() => void openResults()}>
            {resultsLoading ? "Ladataan tuloksia..." : "Näytä tulokset"}
          </button>
        </div>
      </div>
    </div>
  );
}
