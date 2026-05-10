import type { CreateGameRequest } from "@breview/shared/api-contracts";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { apiClient, identifyBeerNameAsset, uploadImageAsset, type MobileImageAsset } from "@/lib/api";
import { getOrCreateClientId } from "@/lib/player-identity";
import { loadRecentGames, recentGameFromPayload, saveRecentGame, type RecentGame } from "@/lib/recent-games";

interface CreateBeerDraft {
  clientKey: string;
  name: string;
  localAsset: ImagePicker.ImagePickerAsset | null;
  identifying: boolean;
}

function createEmptyBeerDraft(): CreateBeerDraft {
  return {
    clientKey: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "",
    localAsset: null,
    identifying: false,
  };
}

function asMobileImageAsset(asset: ImagePicker.ImagePickerAsset): MobileImageAsset {
  return {
    uri: asset.uri,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
  };
}

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
  const [beers, setBeers] = useState<CreateBeerDraft[]>([createEmptyBeerDraft()]);
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
    const payloadBeers: CreateGameRequest["beers"] = [];

    if (!name) {
      setMessage("Anna pelille nimi.");
      return;
    }

    setCreating(true);
    setMessage(null);

    try {
      for (let index = 0; index < beers.length; index += 1) {
        const beer = beers[index];
        const beerName = beer.name.trim();
        if (!beerName) {
          throw new Error(`Anna nimi kaikille oluille tai poista tyhjä rivi (rivi ${index + 1}).`);
        }

        let image_url: string | null = null;
        if (beer.localAsset) {
          const upload = await uploadImageAsset(asMobileImageAsset(beer.localAsset));
          image_url = upload.imageUrl;
        }

        payloadBeers.push({ name: beerName, image_url });
      }

      if (!payloadBeers.length) {
        throw new Error("Lisää vähintään yksi olut.");
      }

      const created = await apiClient.createGame({ name, beers: payloadBeers });
      await openRemoteGame(created.gameId);
      setGameName("");
      setBeers([createEmptyBeerDraft()]);
    } catch (error) {
      setMessage(String((error as Error)?.message ?? error));
    } finally {
      setCreating(false);
    }
  }

  function updateBeer(index: number, patch: Partial<CreateBeerDraft>) {
    setBeers((current) => current.map((beer, itemIndex) => (itemIndex === index ? { ...beer, ...patch } : beer)));
  }

  function addBeerRow() {
    setBeers((current) => [...current, createEmptyBeerDraft()]);
  }

  function removeBeerRow(index: number) {
    setBeers((current) => {
      const next = current.filter((_, itemIndex) => itemIndex !== index);
      return next.length ? next : [createEmptyBeerDraft()];
    });
  }

  async function pickBeerImage(index: number, source: "camera" | "library") {
    setMessage(null);

    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setMessage(source === "camera" ? "Kameran käyttöoikeus puuttuu." : "Kuvakirjaston käyttöoikeus puuttuu.");
      return;
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 0.9,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.9,
          });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    updateBeer(index, {
      localAsset: asset,
    });
  }

  async function identifyBeer(index: number) {
    const row = beers[index];
    if (!row?.localAsset) {
      setMessage("Valitse ensin kuva kamerasta tai kuvista.");
      return;
    }

    setMessage(null);
    updateBeer(index, { identifying: true });

    try {
      const identified = await identifyBeerNameAsset(asMobileImageAsset(row.localAsset), await getOrCreateClientId());
      updateBeer(index, { name: identified.beerName, identifying: false });
    } catch (error) {
      const message = String((error as Error)?.message ?? "Nimen tunnistus epäonnistui.");
      updateBeer(index, { identifying: false });
      setMessage(message);
      Alert.alert("AI-tunnistus", message);
    }
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
            {beers.map((beer, index) => (
              <View key={beer.clientKey} className="gap-3 rounded-lg border border-border bg-background p-4">
                <View className="flex-row items-start gap-3">
                  <View className="h-[64px] w-[64px] items-center justify-center overflow-hidden rounded-xl border border-border bg-card">
                    {beer.localAsset ? (
                      <Image source={{ uri: beer.localAsset.uri }} style={{ width: 64, height: 64 }} contentFit="cover" />
                    ) : (
                      <Text variant="muted" className="text-center text-xs">
                        Ei kuvaa
                      </Text>
                    )}
                  </View>
                  <View className="flex-1 gap-1">
                    <Text variant="large">{beer.name.trim() || `Olut ${index + 1}`}</Text>
                    <Text variant="muted">Rivi {index + 1}</Text>
                  </View>
                  {beers.length > 1 ? (
                    <Button variant="ghost" size="sm" onPress={() => removeBeerRow(index)}>
                      Poista
                    </Button>
                  ) : null}
                </View>

                <Input
                  placeholder={`Olut ${index + 1}`}
                  value={beer.name}
                  onChangeText={(value) => updateBeer(index, { name: value })}
                  returnKeyType="next"
                />

                <View className="gap-2">
                  <Text variant="muted">Kuva (valinnainen)</Text>
                  <View className="flex-row gap-2">
                    <Button className="flex-1" variant="secondary" onPress={() => void pickBeerImage(index, "camera")}>
                      Kamera
                    </Button>
                    <Button className="flex-1" variant="secondary" onPress={() => void pickBeerImage(index, "library")}>
                      Kuvat
                    </Button>
                  </View>
                  <Button
                    variant="outline"
                    loading={beer.identifying}
                    disabled={!beer.localAsset || creating}
                    onPress={() => void identifyBeer(index)}
                  >
                    Tunnista nimi AI:lla
                  </Button>
                </View>
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
