import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeScore } from "../../shared/scoring";

const DRAFT_STORAGE_PREFIX = "saas_ratings_draft_v1";
const SAVE_DEBOUNCE_MS = 300;

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

function loadDraft(gameId: number, clientId: string, validBeerIds: Set<number>): Record<number, number> {
  const raw = readStorage(storageKey(gameId, clientId));
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const draft: Record<number, number> = {};

    for (const [beerIdRaw, scoreRaw] of Object.entries(parsed)) {
      const beerId = Number(beerIdRaw);
      if (!Number.isInteger(beerId) || !validBeerIds.has(beerId)) continue;
      const score = normalizeScore(scoreRaw);
      if (score == null) continue;
      draft[beerId] = score;
    }

    return draft;
  } catch {
    removeStorage(storageKey(gameId, clientId));
    return {};
  }
}

function serializeRatings(ratings: Record<number, number>, beerIds: number[]): string {
  const payload: Record<number, number> = {};
  for (const id of beerIds) {
    payload[id] = normalizeScore(ratings[id]) ?? 0;
  }
  return JSON.stringify(payload);
}

export function useDraftRatings(gameId: number, clientId: string) {
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [savedRatings, setSavedRatings] = useState<Record<number, number>>({});
  const beerIdsRef = useRef<number[]>([]);
  const hydratedRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  const clearPendingSave = useCallback(() => {
    if (saveTimerRef.current == null) return;
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
  }, []);

  const hydrate = useCallback(
    (beerIds: number[], backendSavedRatings: Record<number, number>) => {
      beerIdsRef.current = beerIds;
      const validBeerIds = new Set(beerIds);

      const nextSavedRatings: Record<number, number> = {};
      const nextRatings: Record<number, number> = {};

      for (const beerId of beerIds) {
        const saved = normalizeScore(backendSavedRatings[beerId]) ?? 0;
        nextSavedRatings[beerId] = saved;
        nextRatings[beerId] = saved;
      }

      const draft = loadDraft(gameId, clientId, validBeerIds);
      for (const [beerIdRaw, score] of Object.entries(draft)) {
        nextRatings[Number(beerIdRaw)] = normalizeScore(score) ?? 0;
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
      [beerId]: normalizeScore(score) ?? 0,
    }));
  }, []);

  const getChangedRatings = useCallback(() => {
    return beerIdsRef.current
      .map((beerId) => ({
        beerId,
        score: normalizeScore(ratings[beerId]) ?? 0,
        prev: normalizeScore(savedRatings[beerId]) ?? 0,
      }))
      .filter((row) => row.score !== row.prev)
      .map((row) => ({ beerId: row.beerId, score: row.score }));
  }, [ratings, savedRatings]);

  const markSaved = useCallback((changed: Array<{ beerId: number; score: number }>) => {
    setSavedRatings((prev) => {
      const next = { ...prev };
      for (const row of changed) {
        next[row.beerId] = normalizeScore(row.score) ?? 0;
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
    hasDirty,
    getChangedRatings,
    markSaved,
  };
}
