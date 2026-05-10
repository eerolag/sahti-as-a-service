import { useCallback, useEffect, useMemo, useState } from "react";
import type { BeerDto, GameDto } from "@breview/shared/api-contracts";
import { apiClient } from "../api/client";

interface GameState {
  game: GameDto | null;
  beers: BeerDto[];
  loading: boolean;
  error: string;
}

export type GameStateTarget =
  | { type: "game"; gameId: number }
  | { type: "session"; shareId: string }
  | null;

export function useGameState(target: GameStateTarget) {
  const [state, setState] = useState<GameState>({
    game: null,
    beers: [],
    loading: false,
    error: "",
  });

  const loadGame = useCallback(async () => {
    if (!target) return;
    setState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const data = target.type === "session" ? await apiClient.getSession(target.shareId) : await apiClient.getGame(target.gameId);
      setState({
        game: data.game,
        beers: data.beers,
        loading: false,
        error: "",
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: String((error as Error)?.message ?? "Lataus epäonnistui"),
      }));
    }
  }, [target]);

  useEffect(() => {
    void loadGame();
  }, [loadGame]);

  const helpers = useMemo(
    () => ({
      setGameAndBeers: (game: GameDto, beers: BeerDto[]) => {
        setState((prev) => ({ ...prev, game, beers }));
      },
    }),
    [],
  );

  return {
    ...state,
    loadGame,
    ...helpers,
  };
}
