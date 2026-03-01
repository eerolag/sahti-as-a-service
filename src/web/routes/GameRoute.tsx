import { useEffect, useMemo, useState } from "react";
import type { GetResultsResponse, ResultBeerDto, UpdateGameRequest } from "../../shared/api-contracts";
import { normalizeScore } from "../../shared/scoring";
import { normalizeNickname } from "../../shared/validation";
import { apiClient } from "../api/client";
import { BeerCard } from "../components/BeerCard";
import { BeerEditor, type BeerEditorRow } from "../components/BeerEditor";
import { ResultList } from "../components/ResultList";
import { SharePanel } from "../components/SharePanel";
import { useDraftRatings } from "../hooks/useDraftRatings";
import { useGameState } from "../hooks/useGameState";
import { validateImageFileBeforeUpload } from "../utils/image-upload";
import {
  type PlayerIdentity,
  generateAnonymousNickname,
  getOrCreateClientId,
  loadPlayerIdentity,
  savePlayerIdentity,
} from "../utils/player-identity";

function gameDisplayName(name: string | null | undefined, gameId: number): string {
  const clean = String(name ?? "").trim();
  if (clean) return clean;
  return `Peli #${gameId}`;
}

interface NicknameModalProps {
  open: boolean;
  canClose: boolean;
  nicknameDraft: string;
  onNicknameDraftChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function NicknameModal({
  open,
  canClose,
  nicknameDraft,
  onNicknameDraftChange,
  onConfirm,
  onCancel,
}: NicknameModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-4 md:items-center">
      <div className="flex w-full max-w-lg flex-col gap-3 rounded-card border border-line bg-card p-4">
        <div className="font-semibold">Liity peliin nimimerkillä</div>
        <div className="muted">Jätä tyhjäksi, jos haluat automaattisen nimen (esim. Nimetön nimimerkki 112).</div>
        <label className="text-sm text-muted" htmlFor="nickname">
          Nimimerkki (valinnainen)
        </label>
        <input
          id="nickname"
          className="input"
          value={nicknameDraft}
          onChange={(event) => onNicknameDraftChange(event.target.value)}
          placeholder="esim. Maistelija"
          autoFocus
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onConfirm();
            }
          }}
        />
        <div className="flex gap-2">
          <button className="btn btn-primary grow" type="button" onClick={onConfirm}>
            Jatka peliin
          </button>
          {canClose ? (
            <button className="btn grow" type="button" onClick={onCancel}>
              Peruuta
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function GameRoute({ gameId }: { gameId: number }) {
  const fallbackClientId = useMemo(() => getOrCreateClientId(), []);
  const { game, beers, loading, error, loadGame, setGameAndBeers } = useGameState(gameId);
  const [playerIdentity, setPlayerIdentity] = useState<PlayerIdentity | null>(null);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [nicknameModalOpen, setNicknameModalOpen] = useState(false);
  const activeClientId = playerIdentity?.clientId ?? fallbackClientId;

  const { ratings, hydrate, setRating, setComment, hasDirty, getChangedRatings, markSaved } = useDraftRatings(
    gameId,
    activeClientId,
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
    const existingIdentity = loadPlayerIdentity(gameId);
    if (existingIdentity) {
      setPlayerIdentity(existingIdentity);
      setNicknameDraft(existingIdentity.nickname);
      setNicknameModalOpen(false);
      return;
    }

    setPlayerIdentity(null);
    setNicknameDraft("");
    setNicknameModalOpen(true);
  }, [gameId]);

  useEffect(() => {
    if (!beers.length || !playerIdentity) return;

    let cancelled = false;
    void (async () => {
      try {
        const data = await apiClient.getRatings(gameId, playerIdentity.clientId);
        if (cancelled) return;

        const backendRatings: Record<number, { score: number; comment: string }> = {};
        for (const row of data.ratings) {
          const beerId = Number(row.beerId);
          const score = normalizeScore(row.score);
          if (!Number.isInteger(beerId) || score == null) continue;
          backendRatings[beerId] = {
            score,
            comment: String(row.comment ?? ""),
          };
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
  }, [beers, gameId, hydrate, playerIdentity]);

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
    if (!playerIdentity) {
      setNicknameModalOpen(true);
      return;
    }

    const changed = getChangedRatings();
    if (!changed.length) return;

    setSavingRatings(true);
    setSaveButtonText("Tallennetaan...");

    try {
      await apiClient.saveRatings(gameId, {
        clientId: playerIdentity.clientId,
        nickname: playerIdentity.nickname,
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

  function openNicknameModal() {
    setNicknameDraft(playerIdentity?.nickname ?? "");
    setNicknameModalOpen(true);
  }

  function closeNicknameModal() {
    if (!playerIdentity) return;
    setNicknameDraft(playerIdentity.nickname);
    setNicknameModalOpen(false);
  }

  function applyNickname() {
    const normalized = normalizeNickname(nicknameDraft);
    if ("error" in normalized) {
      alert(normalized.error);
      return;
    }

    const nickname = normalized.value ?? generateAnonymousNickname();
    const nextIdentity: PlayerIdentity = {
      clientId: playerIdentity?.clientId || fallbackClientId,
      nickname,
    };

    savePlayerIdentity(gameId, nextIdentity);
    setPlayerIdentity(nextIdentity);
    setNicknameDraft(nickname);
    setNicknameModalOpen(false);
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
          await validateImageFileBeforeUpload(row.file);
          const upload = await apiClient.uploadImage(row.file);
          image_url = upload.imageUrl;
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
              <div className="muted">Nimimerkki: {playerIdentity?.nickname ?? "Ei asetettu"}</div>
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
            <button className="btn grow" type="button" onClick={openNicknameModal}>
              Vaihda nimimerkki
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
            score={ratings[beer.id]?.score ?? 0}
            comment={ratings[beer.id]?.comment ?? ""}
            onScoreChange={(score) => setRating(beer.id, score)}
            onCommentChange={(comment) => setComment(beer.id, comment)}
          />
        ))}
      </div>

      <div className="card sticky bottom-0">
        <div className="flex flex-col gap-2">
          <button
            className="btn btn-success"
            type="button"
            disabled={!playerIdentity || !hasDirty || savingRatings}
            onClick={() => void saveRatings()}
          >
            {saveButtonText}
          </button>
          <button className="btn" type="button" disabled={resultsLoading} onClick={() => void openResults()}>
            {resultsLoading ? "Ladataan tuloksia..." : "Näytä tulokset"}
          </button>
        </div>
      </div>

      <NicknameModal
        open={nicknameModalOpen}
        canClose={Boolean(playerIdentity)}
        nicknameDraft={nicknameDraft}
        onNicknameDraftChange={setNicknameDraft}
        onConfirm={applyNickname}
        onCancel={closeNicknameModal}
      />
    </div>
  );
}
