import type { CreateGameRequest } from "@breview/shared/api-contracts";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { apiClient } from "@/lib/api";
import { loadRecentGames, recentGameFromPayload, saveRecentGame, type RecentGame } from "@/lib/recent-games";

function parseGameIdInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    const gameId = Number(trimmed);
    return Number.isInteger(gameId) && gameId > 0 ? gameId : null;
  }

  try {
    const url = new URL(trimmed);
    const gameIdSegment = url.pathname.split("/").find((part) => /^\d+$/.test(part));
    if (!gameIdSegment) return null;

    const gameId = Number(gameIdSegment);
    return Number.isInteger(gameId) && gameId > 0 ? gameId : null;
  } catch {
    const match = trimmed.match(/(?:^|\/)(\d+)(?:$|[/?#])/);
    if (!match) return null;

    const gameId = Number(match[1]);
    return Number.isInteger(gameId) && gameId > 0 ? gameId : null;
  }
}

function beerMeta(count: number): string {
  return count === 1 ? "1 olut" : `${count} olutta`;
}

export default function GamesScreen() {
  const router = useRouter();
  const [gameName, setGameName] = useState("");
  const [beerNames, setBeerNames] = useState([""]);
  const [joinInput, setJoinInput] = useState("");
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setRecentGames(loadRecentGames());
  }, []);

  function openGame(gameId: number) {
    router.push({ pathname: "/[gameId]", params: { gameId: String(gameId) } });
  }

  async function openRemoteGame(gameId: number) {
    const payload = await apiClient.getGame(gameId);
    setRecentGames(saveRecentGame(recentGameFromPayload(payload)));
    openGame(gameId);
  }

  async function handleJoinGame() {
    const gameId = parseGameIdInput(joinInput);
    if (!gameId) {
      setMessage("Syötä pelin numero tai Breview-linkki.");
      return;
    }

    setJoining(true);
    setMessage(null);

    try {
      await openRemoteGame(gameId);
    } catch (error) {
      setMessage(String((error as Error)?.message ?? error));
    } finally {
      setJoining(false);
    }
  }

  async function handleCreateGame() {
    const name = gameName.trim();
    const beers = beerNames
      .map((beerName) => beerName.trim())
      .filter(Boolean)
      .map<CreateGameRequest["beers"][number]>((beerName) => ({ name: beerName, image_url: null }));

    if (!name) {
      setMessage("Anna pelille nimi.");
      return;
    }

    if (!beers.length) {
      setMessage("Lisää vähintään yksi olut.");
      return;
    }

    setCreating(true);
    setMessage(null);

    try {
      const created = await apiClient.createGame({ name, beers });
      await openRemoteGame(created.gameId);
      setGameName("");
      setBeerNames([""]);
    } catch (error) {
      setMessage(String((error as Error)?.message ?? error));
    } finally {
      setCreating(false);
    }
  }

  function updateBeerName(index: number, value: string) {
    setBeerNames((current) => current.map((beerName, itemIndex) => (itemIndex === index ? value : beerName)));
  }

  function addBeerRow() {
    setBeerNames((current) => [...current, ""]);
  }

  function removeBeerRow(index: number) {
    setBeerNames((current) => {
      const next = current.filter((_, itemIndex) => itemIndex !== index);
      return next.length ? next : [""];
    });
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-5 px-5 pb-10 pt-6"
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-row items-center gap-3">
        <Image
          source={require("@/assets/images/breview-logo.png")}
          style={{ width: 64, height: 64, borderRadius: 16 }}
          contentFit="cover"
        />
        <View className="gap-1">
          <Text variant="h1" className="text-foreground">
            Breview
          </Text>
          <Text variant="muted">Pelit</Text>
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
          <CardTitle>Luo peli</CardTitle>
          <CardDescription>Lisää oluet ja jaettava pelikoodi syntyy automaattisesti.</CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          <Input placeholder="Pelin nimi" value={gameName} onChangeText={setGameName} returnKeyType="next" />

          <View className="gap-2">
            {beerNames.map((beerName, index) => (
              <View key={index} className="gap-2">
                <Input
                  placeholder={`Olut ${index + 1}`}
                  value={beerName}
                  onChangeText={(value) => updateBeerName(index, value)}
                  returnKeyType="next"
                />
                {beerNames.length > 1 ? (
                  <Button variant="ghost" size="sm" onPress={() => removeBeerRow(index)}>
                    Poista olut
                  </Button>
                ) : null}
              </View>
            ))}
          </View>

          <Button variant="outline" onPress={addBeerRow}>
            Lisää olut
          </Button>
          <Button loading={creating} onPress={handleCreateGame}>
            Luo peli
          </Button>
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Liity peliin</CardTitle>
          <CardDescription>Avaa jaettu peli numerolla tai linkillä.</CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          <Input
            placeholder="Pelikoodi tai linkki"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            value={joinInput}
            onChangeText={setJoinInput}
            onSubmitEditing={handleJoinGame}
          />
          <Button variant="secondary" loading={joining} onPress={handleJoinGame}>
            Liity
          </Button>
        </CardContent>
      </Card>

      <View className="gap-3">
        <Text variant="large">Viimeisimmät</Text>
        {recentGames.length ? (
          recentGames.map((game) => (
            <Pressable
              key={game.id}
              accessibilityRole="button"
              onPress={() => openGame(game.id)}
              className="active:opacity-80"
            >
              <Card className="py-4">
                <CardContent className="gap-1 py-0">
                  <Text variant="large">{game.name}</Text>
                  <Text variant="muted">
                    #{game.id} · {beerMeta(game.beerCount)}
                  </Text>
                </CardContent>
                <CardFooter>
                  <Text variant="small">Avaa</Text>
                </CardFooter>
              </Card>
            </Pressable>
          ))
        ) : (
          <Text variant="muted">Ei vielä avattuja pelejä tällä laitteella.</Text>
        )}
      </View>
    </ScrollView>
  );
}
