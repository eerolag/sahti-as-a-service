import { useCallback, useEffect, useMemo, useState } from "react";
import type { BeerDto, GameDto } from "@breview/shared/api-contracts";
import { apiClient } from "../api/client";

interface GameState {
  game: GameDto | null;
  beers: BeerDto[];
  loading: boolean;
  error: string;
}

export function useGameState(gameId: number | null) {
  const [state, setState] = useState<GameState>({
    game: null,
    beers: [],
    loading: false,
    error: "",
  });

  const loadGame = useCallback(async () => {
    if (!gameId) return;
    setState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const data = await apiClient.getGame(gameId);
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
  }, [gameId]);

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
