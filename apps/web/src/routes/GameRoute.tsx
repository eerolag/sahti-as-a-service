import { ArrowLeft, ChevronDown, Settings, Share2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { GetResultsResponse, ResultBeerDto, UpdateGameRequest } from "@breview/shared/api-contracts";
import { normalizeScore } from "@breview/shared/scoring";
import type { RatingMode, ResultsVisibility } from "@breview/shared";
import { normalizeNickname } from "@breview/shared/validation";
import { apiClient } from "../api/client";
import { BeerCard } from "../components/BeerCard";
import { BeerEditor, type BeerEditorRow } from "../components/BeerEditor";
import { ResultList } from "../components/ResultList";
import { SharePanel } from "../components/SharePanel";
import { useDraftRatings } from "../hooks/useDraftRatings";
import { useGameState } from "../hooks/useGameState";
import { useHaptics } from "../hooks/useHaptics";
import { validateImageFileBeforeUpload } from "../utils/image-upload";
import { prepareImageForManagedUpload } from "../utils/beer-name-image";
import { isWebShareSupported, shareUrl } from "../utils/web-share";
import { loadAccountSession } from "../utils/account-session";
import {
  consumeHostTokenFromHash,
  loadHostToken,
  saveHostToken,
  sessionHostUrl,
  sessionShareUrl,
} from "../utils/creator-session";
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
  return gameId > 0 ? `Sessio #${gameId}` : "Sessio";
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
        <div className="font-semibold">Liity sessioon nimimerkillä</div>
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
            Jatka sessioon
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
  target:
    | { type: "game"; gameId: number }
    | { type: "session"; shareId: string; host: boolean };
  section: GameSection;
  onSectionChange: (section: GameSection) => void;
}

export function GameRoute({ target, section, onSectionChange }: GameRouteProps) {
  const haptics = useHaptics();
  const fallbackClientId = useMemo(() => getOrCreateClientId(), []);
  const stateTarget = useMemo(
    () => (target.type === "session" ? { type: "session" as const, shareId: target.shareId } : target),
    [target],
  );
  const { game, beers, loading, error, loadGame, setGameAndBeers } = useGameState(stateTarget);
  const [playerIdentity, setPlayerIdentity] = useState<PlayerIdentity | null>(null);
  const [accountSession] = useState(() => loadAccountSession());
  const [creatorToken, setCreatorToken] = useState("");
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [nicknameModalOpen, setNicknameModalOpen] = useState(false);
  const [playersAccordionOpen, setPlayersAccordionOpen] = useState(false);
  const [hasAttemptedResultsLoad, setHasAttemptedResultsLoad] = useState(false);
  const gameId = game?.id ?? (target.type === "game" ? target.gameId : 0);
  const shareId = game?.publicId ?? (target.type === "session" ? target.shareId : "");
  const canHost = target.type === "game" || Boolean(creatorToken);
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
    ratingMode: RatingMode;
    scoreMin: string;
    scoreMax: string;
    scoreStep: string;
    resultsVisibility: ResultsVisibility;
    submitting: boolean;
  } | null>(null);

  const supportsWebShare = useMemo(() => isWebShareSupported(), []);
  const resultsUrl = useMemo(() => (shareId ? `${sessionShareUrl(shareId)}/results` : `${window.location.origin}/${gameId}/results`), [gameId, shareId]);
  const title = gameDisplayName(game?.name, gameId);
  const shareLink = shareId ? sessionShareUrl(shareId) : `${window.location.origin}/${gameId}`;
  const hostLink = shareId && creatorToken ? sessionHostUrl(shareId, creatorToken) : "";

  useEffect(() => {
    if (target.type !== "session" || !target.host) return;
    const tokenFromHash = consumeHostTokenFromHash();
    const token = tokenFromHash || loadHostToken(target.shareId);
    if (token) {
      saveHostToken(target.shareId, token);
      setCreatorToken(token);
    }
  }, [target]);

  const openResults = useCallback(
    async (useHaptics = true) => {
      if (useHaptics) haptics.light();
      setResultsLoading(true);

      try {
        const payload = shareId
          ? await apiClient.getSessionResults(shareId, activeClientId, creatorToken)
          : await apiClient.getResults(gameId);
        setResults(payload);
        if (useHaptics) haptics.selection();
      } catch (error) {
        if (useHaptics) haptics.error();
        alert(String((error as Error)?.message ?? error));
      } finally {
        setResultsLoading(false);
      }
    },
    [activeClientId, creatorToken, gameId, haptics, shareId],
  );

  useEffect(() => {
    if (!gameId) return;
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
    if (!gameId) return;
    setResults(null);
    setHasAttemptedResultsLoad(false);
  }, [gameId, shareId]);

  useEffect(() => {
    if (!gameId || !beers.length || !playerIdentity) return;

    let cancelled = false;
    void (async () => {
      try {
        const data = shareId
          ? await apiClient.getSessionRatings(shareId, playerIdentity.clientId, accountSession?.sessionToken)
          : await apiClient.getRatings(gameId, playerIdentity.clientId, accountSession?.sessionToken);
        if (cancelled) return;

        const backendRatings: Record<number, { score: number; comment: string }> = {};
        for (const row of data.ratings) {
          const beerId = Number(row.beerId);
          const score = normalizeScore(row.score, game?.ratingConfig);
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
  }, [accountSession?.sessionToken, beers, game?.ratingConfig, gameId, hydrate, playerIdentity, shareId]);

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
    if (!game || !canHost) return;
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
      ratingMode: game.ratingConfig.mode,
      scoreMin: String(game.ratingConfig.scoreMin),
      scoreMax: String(game.ratingConfig.scoreMax),
      scoreStep: String(game.ratingConfig.scoreStep),
      resultsVisibility: game.resultsVisibility,
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
      const payload = {
        clientId: playerIdentity.clientId,
        nickname: playerIdentity.nickname,
        ratings: changed,
      };
      if (shareId) {
        await apiClient.saveSessionRatings(shareId, payload, accountSession?.sessionToken);
      } else {
        await apiClient.saveRatings(gameId, payload, accountSession?.sessionToken);
      }
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
        text: `Katso session ${title} tulokset`,
        url: resultsUrl,
      });
      haptics.success();
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      haptics.error();
      alert(String((error as Error)?.message ?? "Jakaminen epäonnistui"));
    }
  }

  async function revealResults() {
    if (!shareId || !creatorToken) return;
    try {
      haptics.light();
      const response = await apiClient.revealSessionResults(shareId, creatorToken);
      setGameAndBeers(response.game, beers);
      setResults(null);
      setHasAttemptedResultsLoad(false);
      await openResults(false);
      haptics.success();
    } catch (error) {
      haptics.error();
      alert(String((error as Error)?.message ?? "Tulosten paljastus epäonnistui"));
    }
  }

  async function reportContent(targetType: "session" | "beer" | "image" | "comment" | "participant", targetId?: number | string) {
    if (!shareId) {
      alert("Ilmoittaminen on käytössä uusissa sessiolinkeissä.");
      return;
    }

    const reason = window.prompt("Kerro lyhyesti, mikä sisällössä on asiatonta.");
    if (!reason?.trim()) return;

    try {
      haptics.light();
      await apiClient.reportSession(shareId, {
        targetType,
        targetId,
        reason: reason.trim(),
        clientId: activeClientId,
      });
      haptics.success();
      alert("Ilmoitus vastaanotettu. Kiitos.");
    } catch (error) {
      haptics.error();
      alert(String((error as Error)?.message ?? "Ilmoituksen lähetys epäonnistui"));
    }
  }

  async function saveGameEdits() {
    if (!editDraft) return;

    try {
      haptics.light();
      setEditDraft((prev) => (prev ? { ...prev, submitting: true } : prev));

      const trimmedName = editDraft.gameName.trim();
      if (!trimmedName) {
        throw new Error("Anna sessiolle nimi");
      }

      const payloadBeers: UpdateGameRequest["beers"] = [];
      for (let index = 0; index < editDraft.beers.length; index += 1) {
        const row = editDraft.beers[index];
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
          id: row.id,
          name,
          image_url,
        });
      }

      if (!payloadBeers.length) {
        throw new Error("Lisää vähintään yksi juoma");
      }

      const updatePayload = {
        name: trimmedName,
        beers: payloadBeers,
        settings: {
          ratingMode: editDraft.ratingMode,
          scoreMin: Number(editDraft.scoreMin),
          scoreMax: Number(editDraft.scoreMax),
          scoreStep: Number(editDraft.scoreStep),
          resultsVisibility: editDraft.resultsVisibility,
        },
      };
      const updated = shareId
        ? await apiClient.updateSession(shareId, updatePayload, creatorToken)
        : await apiClient.updateGame(gameId, updatePayload);

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
        <div className="text-center text-xl font-bold">Breview</div>
        <div className="card">Ladataan...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-wrap">
        <div className="text-center text-xl font-bold">Breview</div>
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
      <div className="app-wrap app-wrap-with-header pb-20">
        <div className="app-header">
          <button className="icon-btn" type="button" onClick={closeEdit} aria-label="Takaisin sessioon">
            <ArrowLeft size={18} />
          </button>
          <a className="header-brand" href="/">
            Breview
          </a>
          <span className="icon-btn-placeholder" aria-hidden="true" />
        </div>

        <div className="mb-3 text-center text-sm text-muted">{title} • Muokkaa sessiota</div>

        <SharePanel shareUrl={shareLink} hostUrl={hostLink} />

        <div className="surface-strip">
          <div className="grid gap-3">
            <div className="font-semibold">Asetukset</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-sm text-muted">
                Arvostelutapa
                <select
                  className="input"
                  value={editDraft.ratingMode}
                  onChange={(event) =>
                    setEditDraft((prev) => (prev ? { ...prev, ratingMode: event.target.value as RatingMode } : prev))
                  }
                >
                  <option value="slider">Slideri</option>
                  <option value="stars">Tähdet</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm text-muted">
                Tulokset
                <select
                  className="input"
                  value={editDraft.resultsVisibility}
                  onChange={(event) =>
                    setEditDraft((prev) =>
                      prev ? { ...prev, resultsVisibility: event.target.value as ResultsVisibility } : prev,
                    )
                  }
                >
                  <option value="host_reveal">Paljasta lopussa</option>
                  <option value="after_submit">Näytä oman tallennuksen jälkeen</option>
                  <option value="live">Näytä heti</option>
                </select>
              </label>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                className="input"
                value={editDraft.scoreMin}
                onChange={(event) => setEditDraft((prev) => (prev ? { ...prev, scoreMin: event.target.value } : prev))}
                aria-label="Asteikon minimi"
              />
              <input
                className="input"
                value={editDraft.scoreMax}
                onChange={(event) => setEditDraft((prev) => (prev ? { ...prev, scoreMax: event.target.value } : prev))}
                aria-label="Asteikon maksimi"
              />
              <input
                className="input"
                value={editDraft.scoreStep}
                onChange={(event) => setEditDraft((prev) => (prev ? { ...prev, scoreStep: event.target.value } : prev))}
                aria-label="Asteikon askel"
              />
            </div>
          </div>
        </div>

        <BeerEditor
          title="Muokkaa sessiota"
          gameName={editDraft.gameName}
          onGameNameChange={(value) => setEditDraft((prev) => (prev ? { ...prev, gameName: value } : prev))}
          beers={editDraft.beers}
          onBeersChange={(next) => setEditDraft((prev) => (prev ? { ...prev, beers: next } : prev))}
          onSubmit={saveGameEdits}
          submitting={editDraft.submitting}
          submitLabel="Tallenna muutokset"
          addLabel="+ Lisää juoma"
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
    <div className="app-wrap app-wrap-with-header pb-28">
      <div className="app-header">
        <span className="icon-btn-placeholder" aria-hidden="true" />

        <a className="header-brand" href="/">
          Breview
        </a>

        {canHost ? (
          <button className="icon-btn" type="button" onClick={openEdit} aria-label="Asetukset ja session muokkaus">
            <Settings size={18} />
          </button>
        ) : (
          <span className="icon-btn-placeholder" aria-hidden="true" />
        )}
      </div>

      <div className="mb-4 px-1 text-center">
        <div className="text-2xl font-bold leading-tight">{title}</div>
        <div className="mt-2 text-sm text-muted">
          {beers.length} juomaa • {game?.ratingConfig.mode === "stars" ? "Tähdet" : "Slideri"}{" "}
          {game ? `${game.ratingConfig.scoreMin}-${game.ratingConfig.scoreMax}` : ""}
        </div>
        <div className="text-sm text-muted">
          Nimimerkki: {playerIdentity?.nickname ?? "Ei asetettu"}{" "}
          <button className="inline-link" type="button" onClick={openNicknameModal}>
            (Vaihda)
          </button>
          {shareId ? (
            <>
              {" "}
              <button className="inline-link" type="button" onClick={() => void reportContent("session")}>
                Ilmoita sessiosta
              </button>
            </>
          ) : null}
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
                ratingConfig={game?.ratingConfig}
                score={ratings[beer.id]?.score ?? null}
                comment={ratings[beer.id]?.comment ?? ""}
                onScoreChange={(score) => setRating(beer.id, score)}
                onCommentChange={(comment) => setComment(beer.id, comment)}
                onReport={() => void reportContent("beer", beer.id)}
              />
            ))}
          </div>

          <div className="bottom-action-strip">
            <div className="bottom-action-inner">
              <button
                className="btn btn-success w-full"
                type="button"
                disabled={!playerIdentity || !hasDirty || savingRatings}
                onClick={() => void saveRatings()}
              >
                {saveButtonText}
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="mb-2 px-1 text-xs text-muted">Järjestetty keskiarvon mukaan</div>
          <ResultList beers={resultBeers} ratingConfig={game?.ratingConfig} />

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
            <div className="bottom-action-inner">
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
                {canHost && game?.resultsVisibility === "host_reveal" && !game.resultsRevealedAt ? (
                  <button className="btn btn-primary grow" type="button" onClick={() => void revealResults()}>
                    Paljasta tulokset
                  </button>
                ) : null}
              </div>
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
