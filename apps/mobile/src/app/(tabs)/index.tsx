import type { CreateGameRequest } from "@breview/shared/api-contracts";
import { getWelcomeCopy } from "@breview/shared";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { apiClient, identifyBeerNameAsset, uploadImageAsset, type MobileImageAsset } from "@/lib/api";
import { haptics } from "@/lib/haptics";
import { saveHostToken } from "@/lib/creator-session";
import { getOrCreateClientId } from "@/lib/player-identity";
import { loadRecentGames, recentGameFromPayload, saveRecentGame, type RecentGame } from "@/lib/recent-games";
import { mobileSupportConfig } from "@/lib/support";
import { useT, useI18n } from "@/lib/i18nContext";

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

type SessionTarget = { type: "game"; id: number } | { type: "session"; shareId: string; host: boolean };

function parseSessionLink(value: string): SessionTarget | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/^\/([sh])\/([A-Za-z0-9_-]+)\/?$/);
    if (match) return { type: "session", host: match[1] === "h", shareId: match[2] };

    const gameIdSegment = url.pathname.split("/").find((part) => /^\d+$/.test(part));
    if (!gameIdSegment) return null;

    const gameId = Number(gameIdSegment);
    return Number.isInteger(gameId) && gameId > 0 ? { type: "game", id: gameId } : null;
  } catch {
    const sessionMatch = trimmed.match(/(?:^|\/)([sh])\/([A-Za-z0-9_-]+)(?:$|[/?#])/);
    if (sessionMatch) return { type: "session", host: sessionMatch[1] === "h", shareId: sessionMatch[2] };

    const match = trimmed.match(/(?:^|\/)(\d+)(?:$|[/?#])/);
    if (!match) return null;

    const gameId = Number(match[1]);
    return Number.isInteger(gameId) && gameId > 0 ? { type: "game", id: gameId } : null;
  }
}

export default function GamesScreen() {
  const t = useT();
  const { lang, setLang } = useI18n();
  const router = useRouter();
  const welcomeCopy = useMemo(() => getWelcomeCopy([lang, Intl.DateTimeFormat().resolvedOptions().locale]), [lang]);
  const [gameName, setGameName] = useState("");
  const [beers, setBeers] = useState<CreateBeerDraft[]>([createEmptyBeerDraft()]);
  const [joinInput, setJoinInput] = useState("");
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [safetyAccepted, setSafetyAccepted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setRecentGames(loadRecentGames());
  }, []);

  function beerMeta(count: number): string {
    return count === 1 ? t.home.oneDrink : t.home.multipleDrinks.replace("{count}", String(count));
  }

  function showImagePermissionDenied(source: "camera" | "library") {
    const title = source === "camera" ? t.errors.cameraDenied : t.errors.libraryDenied;
    const body = source === "camera" ? t.errors.allowCamera : t.errors.allowLibrary;
    Alert.alert(
      title,
      body,
      [
        { text: t.game.cancel, style: "cancel" },
        {
          text: t.errors.openSettings,
          onPress: () => {
            void Linking.openSettings();
          },
        },
      ],
    );
  }

  function openGame(gameId: number) {
    haptics.selection();
    router.push({ pathname: "/[gameId]", params: { gameId: String(gameId) } });
  }

  function openSession(shareId: string, host = false) {
    haptics.selection();
    router.push({ pathname: host ? "/h/[gameId]" : "/s/[gameId]", params: { gameId: shareId } });
  }

  async function openRemoteGame(gameId: number) {
    const payload = await apiClient.getGame(gameId);
    setRecentGames(saveRecentGame(recentGameFromPayload(payload)));
    openGame(gameId);
  }

  async function openRemoteSession(shareId: string, host = false) {
    const payload = await apiClient.getSession(shareId);
    setRecentGames(saveRecentGame(recentGameFromPayload(payload)));
    openSession(shareId, host);
  }

  async function handleJoinGame() {
    const target = parseSessionLink(joinInput);
    if (!target) {
      setMessage(t.errors.pasteValidLink);
      haptics.error();
      return;
    }

    haptics.light();
    setJoining(true);
    setMessage(null);

    try {
      if (target.type === "session") {
        await openRemoteSession(target.shareId, target.host);
      } else {
        await openRemoteGame(target.id);
      }
      haptics.success();
    } catch (error) {
      setMessage(String((error as Error)?.message ?? error));
      haptics.error();
    } finally {
      setJoining(false);
    }
  }

  async function openExternalPage(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Breview", t.errors.pageNotOpened);
    }
  }

  function openAccount() {
    haptics.selection();
    setMenuOpen(false);
    router.push("/explore");
  }

  async function handleCreateGame() {
    const name = gameName.trim();
    const payloadBeers: CreateGameRequest["beers"] = [];

    if (!name) {
      setMessage(t.errors.giveSessionName);
      haptics.error();
      return;
    }

    if (!safetyAccepted) {
      setMessage(t.errors.acceptSafetyTerms);
      haptics.error();
      return;
    }

    haptics.light();
    setCreating(true);
    setMessage(null);

    try {
      for (let index = 0; index < beers.length; index += 1) {
        const beer = beers[index];
        const beerName = beer.name.trim();
        if (!beerName) {
          throw new Error(t.errors.nameAllDrinks);
        }

        let image_url: string | null = null;
        if (beer.localAsset) {
          const upload = await uploadImageAsset(asMobileImageAsset(beer.localAsset));
          image_url = upload.imageUrl;
        }

        payloadBeers.push({ name: beerName, image_url });
      }

      if (!payloadBeers.length) {
        throw new Error(t.errors.addAtLeastOneDrink);
      }

      const created = await apiClient.createGame({
        name,
        beers: payloadBeers,
        settings: { ratingMode: "slider", scoreMin: 0, scoreMax: 10, scoreStep: 0.25, resultsVisibility: "host_reveal" },
      });
      await saveHostToken(created.shareId, created.hostToken);
      await openRemoteSession(created.shareId, true);
      setGameName("");
      setBeers([createEmptyBeerDraft()]);
      haptics.success();
    } catch (error) {
      setMessage(String((error as Error)?.message ?? error));
      haptics.error();
    } finally {
      setCreating(false);
    }
  }

  function updateBeer(index: number, patch: Partial<CreateBeerDraft>) {
    setBeers((current) => current.map((beer, itemIndex) => (itemIndex === index ? { ...beer, ...patch } : beer)));
  }

  function addBeerRow() {
    haptics.selection();
    setBeers((current) => [...current, createEmptyBeerDraft()]);
  }

  function removeBeerRow(index: number) {
    haptics.selection();
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
      const message =
        source === "camera"
          ? t.errors.cameraMissing
          : t.errors.libraryMissing;
      setMessage(message);
      showImagePermissionDenied(source);
      haptics.error();
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
    setMessage(t.editor.imageSelected);
    haptics.success();
  }

  async function identifyBeer(index: number) {
    const row = beers[index];
    if (!row?.localAsset) {
      setMessage(t.errors.selectImageFirst);
      haptics.error();
      return;
    }

    haptics.light();
    setMessage(null);
    updateBeer(index, { identifying: true });

    try {
      const identified = await identifyBeerNameAsset(asMobileImageAsset(row.localAsset), await getOrCreateClientId());
      updateBeer(index, { name: identified.beerName, identifying: false });
      haptics.success();
    } catch (error) {
      const message = String((error as Error)?.message ?? t.errors.aiIdentificationFailed);
      updateBeer(index, { identifying: false });
      setMessage(message);
      Alert.alert("AI", message);
      haptics.error();
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-5 px-5 pb-10 pt-6"
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-row items-start gap-3">
        <Image
          source={require("@/assets/images/breview-logo.png")}
          style={{ width: 64, height: 64, borderRadius: 16 }}
          contentFit="cover"
        />
        <View className="min-w-0 flex-1 gap-1">
          <Text variant="h1" className="text-foreground">
            Breview
          </Text>
          <Text variant="muted">{t.home.session}</Text>
          <Text variant="muted" numberOfLines={3} className="leading-5">
            {welcomeCopy.welcomeSubtitle}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={t.home.openMenu}
          accessibilityRole="button"
          className="h-11 w-11 items-center justify-center rounded-full border border-border bg-card active:opacity-80"
          onPress={() => {
            haptics.selection();
            setMenuOpen((open) => !open);
          }}
        >
          <Text className="text-3xl leading-none text-foreground">⋯</Text>
        </Pressable>
      </View>

      {menuOpen ? (
        <Card className="gap-2 p-3">
          <Button variant="secondary" onPress={openAccount}>
            {t.nav.account}
          </Button>
          <View className="flex-row gap-2">
            <Button className="flex-1" variant="outline" onPress={() => void openExternalPage(mobileSupportConfig.supportUrl)}>
              {t.nav.support}
            </Button>
            <Button className="flex-1" variant="outline" onPress={() => void openExternalPage(mobileSupportConfig.privacyUrl)}>
              {t.nav.privacy}
            </Button>
          </View>
          <View className="mt-2 flex-row gap-2">
            <Button 
              className="flex-1" 
              variant={lang === "fi" ? "secondary" : "outline"} 
              onPress={() => void setLang("fi")}
            >FI</Button>
            <Button 
              className="flex-1" 
              variant={lang === "en" ? "secondary" : "outline"} 
              onPress={() => void setLang("en")}
            >EN</Button>
            <Button 
              className="flex-1" 
              variant={lang === "sv" ? "secondary" : "outline"} 
              onPress={() => void setLang("sv")}
            >SV</Button>
            <Button 
              className="flex-1" 
              variant={lang === "nl" ? "secondary" : "outline"} 
              onPress={() => void setLang("nl")}
            >NL</Button>
          </View>
        </Card>
      ) : null}

      {message ? (
        <Card className="border-destructive bg-background p-4">
          <Text selectable variant="small" className="text-destructive">
            {message}
          </Text>
        </Card>
      ) : null}

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>{t.home.createSession}</CardTitle>
          <CardDescription>{t.home.createSessionSubtitle}</CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          <Input placeholder={t.home.sessionName} value={gameName} onChangeText={setGameName} returnKeyType="next" />

          <View className="gap-2">
            {beers.map((beer, index) => (
              <View key={beer.clientKey} className="gap-3 rounded-lg border border-border bg-background p-4">
                <View className="flex-row items-start gap-3">
                  <View className="h-[64px] w-[64px] items-center justify-center overflow-hidden rounded-xl border border-border bg-card">
                      {beer.localAsset ? (
                      <Image source={{ uri: beer.localAsset.uri }} style={{ width: 64, height: 64 }} contentFit="cover" />
                    ) : (
                      <Text variant="muted" className="text-center text-xs">
                        {t.editor.noImage}
                      </Text>
                    )}
                  </View>
                  <View className="flex-1 gap-1">
                    <Text variant="large">{beer.name.trim() || `${t.home.drink} ${index + 1}`}</Text>
                    <Text variant="muted">
                      {beer.localAsset ? t.editor.imageSelected : `${t.editor.row} ${index + 1}`}
                    </Text>
                  </View>
                  {beers.length > 1 ? (
                    <Button variant="ghost" size="sm" onPress={() => removeBeerRow(index)}>
                      {t.editor.remove}
                    </Button>
                  ) : null}
                </View>

                <Input
                  placeholder={`${t.home.drink} ${index + 1}`}
                  value={beer.name}
                  onChangeText={(value) => updateBeer(index, { name: value })}
                  returnKeyType="next"
                />

                <View className="gap-2">
                  <Text variant="muted">{t.editor.imageOptional}</Text>
                  <View className="flex-row gap-2">
                    <Button className="flex-1" variant="secondary" onPress={() => void pickBeerImage(index, "camera")}>
                      {t.editor.camera}
                    </Button>
                    <Button className="flex-1" variant="secondary" onPress={() => void pickBeerImage(index, "library")}>
                      {t.editor.gallery}
                    </Button>
                  </View>
                  <Button
                    variant="outline"
                    loading={beer.identifying}
                    disabled={!beer.localAsset || creating}
                    onPress={() => void identifyBeer(index)}
                  >
                    {t.editor.identifyWithAi}
                  </Button>
                </View>
              </View>
            ))}
          </View>

          <Button variant="outline" onPress={addBeerRow}>
            {t.editor.addDrink}
          </Button>
          <Pressable accessibilityRole="checkbox" onPress={() => setSafetyAccepted((value) => !value)}>
            <Text variant="muted">
              {safetyAccepted ? "✓" : "○"} {t.editor.safetyTerms}
            </Text>
          </Pressable>
          <Button loading={creating} onPress={handleCreateGame}>
            {t.home.createSession}
          </Button>
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>{t.home.openSessionLink}</CardTitle>
          <CardDescription>{t.home.openSessionLinkSubtitle}</CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          <Input
            placeholder="https://breview.ing/s/..."
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            value={joinInput}
            onChangeText={setJoinInput}
            onSubmitEditing={handleJoinGame}
          />
          <Button variant="secondary" loading={joining} onPress={handleJoinGame}>
            {t.home.join}
          </Button>
        </CardContent>
      </Card>

      <View className="gap-3">
        <Text variant="large">{t.home.recent}</Text>
        {recentGames.length ? (
          recentGames.map((game) => (
            <Pressable
              key={game.id}
              accessibilityRole="button"
              onPress={() => (game.publicId ? openSession(game.publicId) : openGame(game.id))}
              className="active:opacity-80"
            >
              <Card className="py-4">
                <CardContent className="gap-1 py-0">
                  <Text variant="large">{game.name}</Text>
                  <Text variant="muted">
                    {beerMeta(game.beerCount)}
                  </Text>
                </CardContent>
                <CardFooter>
                  <Text variant="small">{t.home.open}</Text>
                </CardFooter>
              </Card>
            </Pressable>
          ))
        ) : (
          <Text variant="muted">{t.home.noRecentGames}</Text>
        )}
      </View>
    </ScrollView>
  );
}
