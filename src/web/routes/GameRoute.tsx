import { ArrowLeft, ChevronDown, Settings, Share2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useHaptics } from "../hooks/useHaptics";
import { validateImageFileBeforeUpload } from "../utils/image-upload";
import { isWebShareSupported, shareUrl } from "../utils/web-share";
import {
  type PlayerIdentity,
  generateAnonymousNickname,
  getOrCreateClientId,
  loadPlayerIdentity,
  savePlayerIdentity,
} from "../utils/player-identity";

export type GameSection = "rate" | "results";

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 md:items-center">
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

interface GameRouteProps {
  gameId: number;
  section: GameSection;
  onSectionChange: (section: GameSection) => void;
}

export function GameRoute({ gameId, section, onSectionChange }: GameRouteProps) {
  const haptics = useHaptics();
  const fallbackClientId = useMemo(() => getOrCreateClientId(), []);
  const { game, beers, loading, error, loadGame, setGameAndBeers } = useGameState(gameId);
  const [playerIdentity, setPlayerIdentity] = useState<PlayerIdentity | null>(null);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [nicknameModalOpen, setNicknameModalOpen] = useState(false);
  const [playersAccordionOpen, setPlayersAccordionOpen] = useState(false);
  const [hasAttemptedResultsLoad, setHasAttemptedResultsLoad] = useState(false);
  const activeClientId = playerIdentity?.clientId ?? fallbackClientId;

  const { ratings, hydrate, setRating, setComment, hasDirty, getChangedRatings, markSaved } = useDraftRatings(
    gameId,
    activeClientId,
  );

  const [results, setResults] = useState<GetResultsResponse | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [saveButtonText, setSaveButtonText] = useState("Tallenna");
  const [savingRatings, setSavingRatings] = useState(false);
  const [editDraft, setEditDraft] = useState<{
    gameName: string;
    beers: BeerEditorRow[];
    submitting: boolean;
  } | null>(null);

  const supportsWebShare = useMemo(() => isWebShareSupported(), []);
  const resultsUrl = useMemo(() => `${window.location.origin}/${gameId}/results`, [gameId]);
  const title = gameDisplayName(game?.name, gameId);

  const openResults = useCallback(
    async (useHaptics = true) => {
      if (useHaptics) haptics.light();
      setResultsLoading(true);

      try {
        const payload = await apiClient.getResults(gameId);
        setResults(payload);
        if (useHaptics) haptics.selection();
      } catch (error) {
        if (useHaptics) haptics.error();
        alert(String((error as Error)?.message ?? error));
      } finally {
        setResultsLoading(false);
      }
    },
    [gameId, haptics],
  );

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
    setResults(null);
    setHasAttemptedResultsLoad(false);
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

  useEffect(() => {
    if (section !== "results") {
      setPlayersAccordionOpen(false);
      return;
    }

    setHasAttemptedResultsLoad(false);
  }, [section]);

  useEffect(() => {
    if (section !== "results") return;
    if (results || resultsLoading || hasAttemptedResultsLoad) return;
    setHasAttemptedResultsLoad(true);
    void openResults(false);
  }, [hasAttemptedResultsLoad, openResults, results, resultsLoading, section]);

  function openEdit() {
    haptics.selection();
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
  }

  function closeEdit() {
    haptics.selection();
    setEditDraft(null);
  }

  function changeSection(next: GameSection) {
    if (next === section) return;
    haptics.selection();
    onSectionChange(next);
  }

  async function saveRatings() {
    if (!playerIdentity) {
      haptics.light();
      setNicknameModalOpen(true);
      return;
    }

    const changed = getChangedRatings();
    if (!changed.length) return;

    haptics.light();
    setSavingRatings(true);
    setSaveButtonText("Tallennetaan...");

    try {
      await apiClient.saveRatings(gameId, {
        clientId: playerIdentity.clientId,
        nickname: playerIdentity.nickname,
        ratings: changed,
      });
      markSaved(changed);
      haptics.success();
      setSaveButtonText("Tallennettu");
      window.setTimeout(() => setSaveButtonText("Tallenna"), 800);
    } catch (error) {
      haptics.error();
      alert(String((error as Error)?.message ?? error));
      setSaveButtonText("Tallenna");
    } finally {
      setSavingRatings(false);
    }
  }

  function openNicknameModal() {
    haptics.selection();
    setNicknameDraft(playerIdentity?.nickname ?? "");
    setNicknameModalOpen(true);
  }

  function closeNicknameModal() {
    if (!playerIdentity) return;
    haptics.selection();
    setNicknameDraft(playerIdentity.nickname);
    setNicknameModalOpen(false);
  }

  function applyNickname() {
    const normalized = normalizeNickname(nicknameDraft);
    if ("error" in normalized) {
      haptics.error();
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
    haptics.success();
  }

  async function shareResults() {
    if (!supportsWebShare) return;

    try {
      haptics.light();
      await shareUrl({
        title: `${title} – tulokset`,
        text: `Katso pelin ${title} tulokset`,
        url: resultsUrl,
      });
      haptics.success();
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      haptics.error();
      alert(String((error as Error)?.message ?? "Jakaminen epäonnistui"));
    }
  }

  async function saveGameEdits() {
    if (!editDraft) return;

    try {
      haptics.light();
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
      setHasAttemptedResultsLoad(false);
      setEditDraft(null);
      onSectionChange("rate");
      haptics.success();
      await loadGame();
    } catch (error) {
      haptics.error();
      alert(String((error as Error)?.message ?? error));
      setEditDraft((prev) => (prev ? { ...prev, submitting: false } : prev));
    }
  }

  if (loading && !game) {
    return (
      <div className="app-wrap">
        <div className="text-center text-xl font-bold">Sahti as a Service</div>
        <div className="card">Ladataan...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-wrap">
        <div className="text-center text-xl font-bold">Sahti as a Service</div>
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

  if (editDraft) {
    return (
      <div className="app-wrap pb-20">
        <div className="app-header">
          <button className="icon-btn" type="button" onClick={closeEdit} aria-label="Takaisin peliin">
            <ArrowLeft size={18} />
          </button>
          <a className="header-brand" href="/">
            Sahti as a Service
          </a>
          <span className="icon-btn-placeholder" aria-hidden="true" />
        </div>

        <div className="mb-3 text-center text-sm text-muted">{title} • Muokkaa peliä</div>

        <SharePanel gameId={gameId} />

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
          onCancel={closeEdit}
          surface="strip"
        />
      </div>
    );
  }

  const resultBeers: ResultBeerDto[] = results?.beers ?? [];
  const resultPlayers = results?.players ?? [];
  const resultPlayerCount = Number(results?.summary?.players ?? resultPlayers.length);

  return (
    <div className="app-wrap pb-28">
      <div className="app-header">
        <span className="icon-btn-placeholder" aria-hidden="true" />

        <a className="header-brand" href="/">
          Sahti as a Service
        </a>

        <button className="icon-btn" type="button" onClick={openEdit} aria-label="Asetukset ja pelin muokkaus">
          <Settings size={18} />
        </button>
      </div>

      <div className="mb-4 px-1 text-center">
        <div className="text-2xl font-bold leading-tight">{title}</div>
        <div className="mt-2 text-sm text-muted">Peli-ID: {gameId} • {beers.length} olutta</div>
        <div className="text-sm text-muted">
          Nimimerkki: {playerIdentity?.nickname ?? "Ei asetettu"}{" "}
          <button className="inline-link" type="button" onClick={openNicknameModal}>
            (Vaihda)
          </button>
        </div>
      </div>

      <div className="segmented-control">
        <button
          className={`segmented-control__item ${section === "rate" ? "is-active" : ""}`}
          type="button"
          onClick={() => changeSection("rate")}
        >
          Arvostele
        </button>
        <button
          className={`segmented-control__item ${section === "results" ? "is-active" : ""}`}
          type="button"
          onClick={() => changeSection("results")}
        >
          Tulokset
        </button>
      </div>

      {section === "rate" ? (
        <>
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

          <div className="bottom-action-strip">
            <button
              className="btn btn-success w-full"
              type="button"
              disabled={!playerIdentity || !hasDirty || savingRatings}
              onClick={() => void saveRatings()}
            >
              {saveButtonText}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-2 px-1 text-xs text-muted">Järjestetty keskiarvon mukaan</div>
          <ResultList beers={resultBeers} />

          <div className="accordion-shell">
            <button
              className="accordion-toggle"
              type="button"
              onClick={() => {
                haptics.selection();
                setPlayersAccordionOpen((prev) => !prev);
              }}
            >
              <span className="font-semibold">Pelaajia: {resultPlayerCount}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${playersAccordionOpen ? "rotate-180" : ""}`} />
            </button>

            <div className={`accordion-content ${playersAccordionOpen ? "is-open" : ""}`}>
              {resultPlayers.length ? (
                <ul className="player-list">
                  {resultPlayers.map((player, index) => {
                    const nickname = String(player?.nickname ?? "").trim() || "Nimetön pelaaja";
                    return <li key={`${nickname}-${index}`}>{nickname}</li>;
                  })}
                </ul>
              ) : (
                <div className="muted">Ei pelaajia vielä</div>
              )}
            </div>
          </div>

          <div className="bottom-action-strip">
            <div className="flex flex-col gap-2 sm:flex-row">
              <button className="btn grow" type="button" disabled={resultsLoading} onClick={() => void openResults()}>
                {resultsLoading ? "Päivitetään..." : "Päivitä tulokset"}
              </button>
              {supportsWebShare ? (
                <button className="btn grow" type="button" onClick={() => void shareResults()}>
                  <span className="inline-flex items-center gap-2">
                    <Share2 size={16} />
                    Jaa tulokset
                  </span>
                </button>
              ) : null}
            </div>
          </div>
        </>
      )}

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
