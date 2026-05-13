import { ArrowLeft, ChevronDown, MoreHorizontal, Pencil, Share2, UserCircle } from "lucide-react";
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
import { useT } from "../i18n/i18nContext";
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

function gameDisplayName(name: string | null | undefined, gameId: number, sessionLabel: string): string {
  const clean = String(name ?? "").trim();
  if (clean) return clean;
  return gameId > 0 ? `${sessionLabel} #${gameId}` : sessionLabel;
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
  const t = useT();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 md:items-center">
      <div className="flex w-full max-w-lg flex-col gap-3 rounded-card border border-line bg-card p-4">
        <div className="font-semibold">{t.game.joinWithNickname}</div>
        <div className="muted">{t.game.leaveEmptyForAutoName}</div>
        <label className="text-sm text-muted" htmlFor="nickname">
          {t.game.nicknameOptionalLabel}
        </label>
        <input
          id="nickname"
          className="input"
          value={nicknameDraft}
          onChange={(event) => onNicknameDraftChange(event.target.value)}
          placeholder={t.game.nicknamePlaceholder}
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
            {t.game.continueToSession}
          </button>
          {canClose ? (
            <button className="btn grow" type="button" onClick={onCancel}>
              {t.game.cancel}
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
  const t = useT();
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
  const [sharePanelOpen, setSharePanelOpen] = useState(false);
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
  const [saveButtonText, setSaveButtonText] = useState(t.game.save);
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
  const title = gameDisplayName(game?.name, gameId, t.game.session);
  const shareLink = shareId ? sessionShareUrl(shareId) : `${window.location.origin}/${gameId}`;
  const hostLink = shareId && creatorToken ? sessionHostUrl(shareId, creatorToken) : "";

  // Reset save button text when language changes or saving finishes
  useEffect(() => {
    if (!savingRatings) {
      setSaveButtonText(t.game.save);
    }
  }, [t.game.save, savingRatings]);

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

  function toggleSharePanel() {
    haptics.selection();
    setSharePanelOpen((open) => !open);
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
    setSaveButtonText(t.game.saving);

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
      setSaveButtonText(t.game.saved);
      window.setTimeout(() => {
        if (!cancelled) setSaveButtonText(t.game.save);
      }, 800);
    } catch (error) {
      haptics.error();
      alert(String((error as Error)?.message ?? error));
      setSaveButtonText(t.game.save);
    } finally {
      setSavingRatings(false);
    }
  }

  let cancelled = false;
  useEffect(() => {
    return () => {
      cancelled = true;
    };
  }, []);

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
        title: `${title} – ${t.game.resultsShareTitle}`,
        text: `${t.game.resultsShareText} ${title}`,
        url: resultsUrl,
      });
      haptics.success();
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      haptics.error();
      alert(String((error as Error)?.message ?? t.errors.sharingFailed));
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
      alert(String((error as Error)?.message ?? t.errors.revealFailed));
    }
  }

  async function reportContent(targetType: "session" | "beer" | "image" | "comment" | "participant", targetId?: number | string) {
    if (!shareId) {
      alert(t.errors.reportingOnNewOnly);
      return;
    }

    const reason = window.prompt(t.errors.reportPrompt);
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
      alert(t.errors.reportReceived);
    } catch (error) {
      haptics.error();
      alert(String((error as Error)?.message ?? t.errors.reportFailed));
    }
  }

  async function saveGameEdits() {
    if (!editDraft) return;

    try {
      haptics.light();
      setEditDraft((prev) => (prev ? { ...prev, submitting: true } : prev));

      const trimmedName = editDraft.gameName.trim();
      if (!trimmedName) {
        throw new Error(t.errors.giveSessionName);
      }

      const payloadBeers: UpdateGameRequest["beers"] = [];
      for (let index = 0; index < editDraft.beers.length; index += 1) {
        const row = editDraft.beers[index];
        const name = row.name.trim();
        if (!name) {
          throw new Error(t.errors.nameAllDrinks);
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
        throw new Error(t.errors.addAtLeastOneDrink);
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
        <div className="card">{t.game.loading}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-wrap">
        <div className="text-center text-xl font-bold">Breview</div>
        <div className="card">
          <div className="mb-1 font-semibold">{t.game.error}</div>
          <div className="muted mb-3">{error}</div>
          <a className="btn inline-flex no-underline" href="/">
            {t.nav.backToHome}
          </a>
        </div>
      </div>
    );
  }

  if (editDraft) {
    return (
      <div className="app-wrap app-wrap-with-header pb-20">
        <div className="app-header">
          <button className="icon-btn" type="button" onClick={closeEdit} aria-label={t.game.backToSession}>
            <ArrowLeft size={18} />
          </button>
          <a className="header-brand" href="/">
            Breview
          </a>
          <div className="header-actions">
            <a className="icon-btn" href="/account" aria-label={t.nav.account}>
              <UserCircle size={18} />
            </a>
          </div>
        </div>

        <div className="mb-3 text-center text-sm text-muted">{title} • {t.game.editSession}</div>

        <SharePanel shareUrl={shareLink} hostUrl={hostLink} />

        <div className="surface-strip">
          <div className="grid gap-3">
            <div className="font-semibold">{t.game.settings}</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-sm text-muted">
                {t.home.ratingMode}
                <select
                  className="input"
                  value={editDraft.ratingMode}
                  onChange={(event) =>
                    setEditDraft((prev) => (prev ? { ...prev, ratingMode: event.target.value as RatingMode } : prev))
                  }
                >
                  <option value="slider">{t.home.slider}</option>
                  <option value="stars">{t.home.stars}</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm text-muted">
                {t.home.results}
                <select
                  className="input"
                  value={editDraft.resultsVisibility}
                  onChange={(event) =>
                    setEditDraft((prev) =>
                      prev ? { ...prev, resultsVisibility: event.target.value as ResultsVisibility } : prev,
                    )
                  }
                >
                  <option value="host_reveal">{t.home.revealAtEnd}</option>
                  <option value="after_submit">{t.home.showAfterSubmit}</option>
                  <option value="live">{t.home.showImmediately}</option>
                </select>
              </label>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                className="input"
                value={editDraft.scoreMin}
                onChange={(event) => setEditDraft((prev) => (prev ? { ...prev, scoreMin: event.target.value } : prev))}
                aria-label={t.home.minLabel}
              />
              <input
                className="input"
                value={editDraft.scoreMax}
                onChange={(event) => setEditDraft((prev) => (prev ? { ...prev, scoreMax: event.target.value } : prev))}
                aria-label={t.home.maxLabel}
              />
              <input
                className="input"
                value={editDraft.scoreStep}
                onChange={(event) => setEditDraft((prev) => (prev ? { ...prev, scoreStep: event.target.value } : prev))}
                aria-label={t.home.stepLabel}
              />
            </div>
          </div>
        </div>

        <BeerEditor
          title={t.editor.editSession}
          gameName={editDraft.gameName}
          onGameNameChange={(value) => setEditDraft((prev) => (prev ? { ...prev, gameName: value } : prev))}
          beers={editDraft.beers}
          onBeersChange={(next) => setEditDraft((prev) => (prev ? { ...prev, beers: next } : prev))}
          onSubmit={saveGameEdits}
          submitting={editDraft.submitting}
          submitLabel={t.editor.saveChanges}
          addLabel={t.editor.addDrink}
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
        <a className="header-logo" href="/">
          Breview
        </a>

        <span aria-hidden="true" />

        <div className="header-actions">
          <button className="icon-btn" type="button" onClick={toggleSharePanel} aria-label={t.share.shareSession}>
            <Share2 size={18} />
          </button>
          {canHost ? (
            <button className="icon-btn" type="button" onClick={openEdit} aria-label={t.game.editSession}>
              <Pencil size={18} />
            </button>
          ) : null}
          {shareId ? (
            <button className="icon-btn" type="button" onClick={() => void reportContent("session")} aria-label={t.game.reportContent}>
              <MoreHorizontal size={18} />
            </button>
          ) : null}
          <a className="icon-btn" href="/account" aria-label={t.nav.account}>
            <UserCircle size={18} />
          </a>
        </div>
      </div>

      <div className="mb-4 px-1 text-center">
        <div className="text-2xl font-bold leading-tight">{title}</div>
        <div className="mt-2 text-sm text-muted">
          {beers.length} {t.game.drinks} • {game?.ratingConfig.mode === "stars" ? t.home.stars : t.home.slider}{" "}
          {game ? `${game.ratingConfig.scoreMin}-${game.ratingConfig.scoreMax}` : ""}
        </div>
        <div className="text-sm text-muted">
          {t.game.nickname}: {playerIdentity?.nickname ?? t.game.notSet}{" "}
          <button className="inline-link" type="button" onClick={openNicknameModal}>
            {t.game.change}
          </button>
        </div>
      </div>

      {sharePanelOpen ? <SharePanel shareUrl={shareLink} hostUrl={hostLink} /> : null}

      <div className="segmented-control">
        <button
          className={`segmented-control__item ${section === "rate" ? "is-active" : ""}`}
          type="button"
          onClick={() => changeSection("rate")}
        >
          {t.game.rate}
        </button>
        <button
          className={`segmented-control__item ${section === "results" ? "is-active" : ""}`}
          type="button"
          onClick={() => changeSection("results")}
        >
          {t.game.resultsTab}
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
          <div className="mb-2 px-1 text-xs text-muted">{t.game.sortedByAverage}</div>
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
              <span className="font-semibold">{t.game.players}: {resultPlayerCount}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${playersAccordionOpen ? "rotate-180" : ""}`} />
            </button>

            <div className={`accordion-content ${playersAccordionOpen ? "is-open" : ""}`}>
              {resultPlayers.length ? (
                <ul className="player-list">
                  {resultPlayers.map((player, index) => {
                    const nickname = String(player?.nickname ?? "").trim() || t.game.anonymousPlayer;
                    return <li key={`${nickname}-${index}`}>{nickname}</li>;
                  })}
                </ul>
              ) : (
                <div className="muted">{t.game.noPlayersYet}</div>
              )}
            </div>
          </div>

          <div className="bottom-action-strip">
            <div className="bottom-action-inner">
              <div className="flex flex-col gap-2 sm:flex-row">
                <button className="btn grow" type="button" disabled={resultsLoading} onClick={() => void openResults()}>
                  {resultsLoading ? t.game.refreshing : t.game.refreshResults}
                </button>
                {supportsWebShare ? (
                  <button className="btn grow" type="button" onClick={() => void shareResults()}>
                    <span className="inline-flex items-center gap-2">
                      <Share2 size={16} />
                      {t.game.shareResults}
                    </span>
                  </button>
                ) : null}
                {canHost && game?.resultsVisibility === "host_reveal" && !game.resultsRevealedAt ? (
                  <button className="btn btn-primary grow" type="button" onClick={() => void revealResults()}>
                    {t.game.revealResults}
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
