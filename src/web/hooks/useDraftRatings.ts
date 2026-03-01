import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeScore } from "../../shared/scoring";
import { MAX_RATING_COMMENT_LENGTH } from "../../shared/validation";

const DRAFT_STORAGE_PREFIX = "saas_ratings_draft_v1";
const SAVE_DEBOUNCE_MS = 300;

export interface DraftRatingValue {
  score: number;
  comment: string;
}

export interface ChangedRatingValue {
  beerId: number;
  score: number;
  comment: string;
}

function storageKey(gameId: number, clientId: string): string {
  return `${DRAFT_STORAGE_PREFIX}:${gameId}:${clientId}`;
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function normalizeComment(value: unknown): string {
  const text = String(value ?? "");
  if (text.length <= MAX_RATING_COMMENT_LENGTH) return text;
  return text.slice(0, MAX_RATING_COMMENT_LENGTH);
}

function loadDraft(gameId: number, clientId: string, validBeerIds: Set<number>): Record<number, DraftRatingValue> {
  const raw = readStorage(storageKey(gameId, clientId));
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const draft: Record<number, DraftRatingValue> = {};

    for (const [beerIdRaw, valueRaw] of Object.entries(parsed)) {
      const beerId = Number(beerIdRaw);
      if (!Number.isInteger(beerId) || !validBeerIds.has(beerId)) continue;

      let scoreRaw: unknown = valueRaw;
      let commentRaw: unknown = "";
      if (valueRaw && typeof valueRaw === "object" && !Array.isArray(valueRaw)) {
        const row = valueRaw as { score?: unknown; comment?: unknown };
        scoreRaw = row.score;
        commentRaw = row.comment;
      }

      const score = normalizeScore(scoreRaw);
      if (score == null) continue;

      draft[beerId] = {
        score,
        comment: normalizeComment(commentRaw),
      };
    }

    return draft;
  } catch {
    removeStorage(storageKey(gameId, clientId));
    return {};
  }
}

function serializeRatings(ratings: Record<number, DraftRatingValue>, beerIds: number[]): string {
  const payload: Record<number, DraftRatingValue> = {};
  for (const id of beerIds) {
    payload[id] = {
      score: normalizeScore(ratings[id]?.score) ?? 0,
      comment: normalizeComment(ratings[id]?.comment),
    };
  }
  return JSON.stringify(payload);
}

export function useDraftRatings(gameId: number, clientId: string) {
  const [ratings, setRatings] = useState<Record<number, DraftRatingValue>>({});
  const [savedRatings, setSavedRatings] = useState<Record<number, DraftRatingValue>>({});
  const beerIdsRef = useRef<number[]>([]);
  const hydratedRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  const clearPendingSave = useCallback(() => {
    if (saveTimerRef.current == null) return;
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
  }, []);

  const hydrate = useCallback(
    (beerIds: number[], backendSavedRatings: Record<number, DraftRatingValue>) => {
      beerIdsRef.current = beerIds;
      const validBeerIds = new Set(beerIds);

      const nextSavedRatings: Record<number, DraftRatingValue> = {};
      const nextRatings: Record<number, DraftRatingValue> = {};

      for (const beerId of beerIds) {
        const row = backendSavedRatings[beerId];
        const score = normalizeScore(row?.score) ?? 0;
        const comment = normalizeComment(row?.comment);

        nextSavedRatings[beerId] = { score, comment };
        nextRatings[beerId] = { score, comment };
      }

      const draft = loadDraft(gameId, clientId, validBeerIds);
      for (const [beerIdRaw, row] of Object.entries(draft)) {
        const beerId = Number(beerIdRaw);
        nextRatings[beerId] = {
          score: normalizeScore(row?.score) ?? 0,
          comment: normalizeComment(row?.comment),
        };
      }

      setSavedRatings(nextSavedRatings);
      setRatings(nextRatings);
      hydratedRef.current = true;
    },
    [clientId, gameId],
  );

  const setRating = useCallback((beerId: number, score: number) => {
    setRatings((prev) => ({
      ...prev,
      [beerId]: {
        score: normalizeScore(score) ?? 0,
        comment: normalizeComment(prev[beerId]?.comment),
      },
    }));
  }, []);

  const setComment = useCallback((beerId: number, comment: string) => {
    setRatings((prev) => ({
      ...prev,
      [beerId]: {
        score: normalizeScore(prev[beerId]?.score) ?? 0,
        comment: normalizeComment(comment),
      },
    }));
  }, []);

  const getChangedRatings = useCallback((): ChangedRatingValue[] => {
    return beerIdsRef.current
      .map((beerId) => {
        const current = ratings[beerId];
        const saved = savedRatings[beerId];

        return {
          beerId,
          score: normalizeScore(current?.score) ?? 0,
          comment: normalizeComment(current?.comment),
          prevScore: normalizeScore(saved?.score) ?? 0,
          prevComment: normalizeComment(saved?.comment),
        };
      })
      .filter((row) => row.score !== row.prevScore || row.comment !== row.prevComment)
      .map((row) => ({ beerId: row.beerId, score: row.score, comment: row.comment }));
  }, [ratings, savedRatings]);

  const markSaved = useCallback((changed: ChangedRatingValue[]) => {
    setSavedRatings((prev) => {
      const next = { ...prev };
      for (const row of changed) {
        next[row.beerId] = {
          score: normalizeScore(row.score) ?? 0,
          comment: normalizeComment(row.comment),
        };
      }
      return next;
    });

    clearPendingSave();
    removeStorage(storageKey(gameId, clientId));
  }, [clearPendingSave, clientId, gameId]);

  const hasDirty = useMemo(() => getChangedRatings().length > 0, [getChangedRatings]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    clearPendingSave();

    saveTimerRef.current = window.setTimeout(() => {
      const key = storageKey(gameId, clientId);
      writeStorage(key, serializeRatings(ratings, beerIdsRef.current));
      saveTimerRef.current = null;
    }, SAVE_DEBOUNCE_MS);

    return () => clearPendingSave();
  }, [clearPendingSave, clientId, gameId, ratings]);

  return {
    ratings,
    savedRatings,
    hydrate,
    setRating,
    setComment,
    hasDirty,
    getChangedRatings,
    markSaved,
  };
}
