import type { GetGameResponse, GetResultsResponse } from "@breview/shared/api-contracts";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, ScrollView, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { apiBaseUrl, apiClient } from "@/lib/api";
import { recentGameFromPayload, saveRecentGame } from "@/lib/recent-games";

function readParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatScore(value: number): string {
  if (!Number.isFinite(value)) return "0.0";
  return value.toFixed(1);
}

export default function GameScreen() {
  const params = useLocalSearchParams<{ gameId?: string | string[] }>();
  const gameId = useMemo(() => Number(readParam(params.gameId)), [params.gameId]);
  const validGameId = Number.isInteger(gameId) && gameId > 0;

  const [payload, setPayload] = useState<GetGameResponse | null>(null);
  const [results, setResults] = useState<GetResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadGame = useCallback(async () => {
    if (!validGameId) {
      setMessage("Virheellinen peli-ID.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const nextPayload = await apiClient.getGame(gameId);
      setPayload(nextPayload);
      saveRecentGame(recentGameFromPayload(nextPayload));
    } catch (error) {
      setMessage(String((error as Error)?.message ?? error));
    } finally {
      setLoading(false);
    }
  }, [gameId, validGameId]);

  useEffect(() => {
    void loadGame();
  }, [loadGame]);

  async function loadResults() {
    if (!validGameId) return;

    setResultsLoading(true);
    setMessage(null);

    try {
      setResults(await apiClient.getResults(gameId));
    } catch (error) {
      setMessage(String((error as Error)?.message ?? error));
    } finally {
      setResultsLoading(false);
    }
  }

  async function openWebGame() {
    if (!validGameId) return;
    await Linking.openURL(new URL(`/${gameId}`, apiBaseUrl).toString());
  }

  const title = payload?.game.name ?? (validGameId ? `Peli #${gameId}` : "Peli");

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ScrollView
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-5 px-5 pb-10 pt-6"
      >
        <View className="flex-row items-center gap-3">
          <Image
            source={require("@/assets/images/breview-logo.png")}
            style={{ width: 52, height: 52, borderRadius: 13 }}
            contentFit="cover"
          />
          <View className="flex-1 gap-1">
            <Text variant="h2">{title}</Text>
            {validGameId ? (
              <Text selectable variant="muted">
                Peli #{gameId}
              </Text>
            ) : null}
          </View>
        </View>

        {message ? (
          <Card className="border-destructive bg-background p-4">
            <Text selectable variant="small" className="text-destructive">
              {message}
            </Text>
          </Card>
        ) : null}

        <Card className="gap-4">
          <CardHeader>
            <CardTitle>{loading ? "Ladataan" : title}</CardTitle>
            <CardDescription>
              {payload ? `${payload.beers.length} ${payload.beers.length === 1 ? "olut" : "olutta"}` : "Haetaan peliä"}
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-3">
            <Button variant="secondary" loading={loading} onPress={loadGame}>
              Päivitä
            </Button>
            {payload ? (
              <Button variant="outline" onPress={openWebGame}>
                Avaa webissä
              </Button>
            ) : null}
          </CardContent>
        </Card>

        {payload ? (
          <View className="gap-3">
            <Text variant="large">Oluet</Text>
            {payload.beers.map((beer) => (
              <Card key={beer.id} className="p-4">
                <View className="flex-row items-center gap-3">
                  {beer.image_url ? (
                    <Image source={{ uri: beer.image_url }} style={{ width: 56, height: 56, borderRadius: 8 }} />
                  ) : null}
                  <View className="flex-1 gap-1">
                    <Text variant="large">{beer.name}</Text>
                    <Text selectable variant="muted">
                      Olut #{beer.id}
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        ) : null}

        {payload ? (
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Tulokset</CardTitle>
              <CardDescription>
                {results ? `${results.summary.players} pelaajaa` : "Keskiarvot ja arvioiden määrät"}
              </CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              <Button variant="secondary" loading={resultsLoading} onPress={loadResults}>
                Näytä tulokset
              </Button>
              {results?.beers.map((beer) => (
                <View key={beer.id} className="rounded-md border border-border p-3">
                  <Text variant="small">{beer.name}</Text>
                  <Text variant="muted">
                    {formatScore(beer.avg_score)} · {beer.rating_count} arviota
                  </Text>
                </View>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </ScrollView>
    </>
  );
}
