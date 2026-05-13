import Slider from "@react-native-community/slider";
import type {
  BeerDto,
  GetGameResponse,
  GetResultsResponse,
  RatingDto,
  ResultBeerDto,
  UpdateGameRequest,
} from "@breview/shared/api-contracts";
import { normalizeScore } from "@breview/shared/scoring";
import type { RatingConfig, RatingMode, ResultsVisibility } from "@breview/shared";
import { MAX_RATING_COMMENT_LENGTH, normalizeNickname } from "@breview/shared/validation";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, usePathname } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Share, TextInput, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { loadAccountSession } from "@/lib/account-session";
import { showNativeActionSheet } from "@/lib/action-sheet";
import { apiClient, identifyBeerNameAsset, uploadImageAsset, type MobileImageAsset } from "@/lib/api";
import { loadHostToken, saveHostToken } from "@/lib/creator-session";
import { haptics } from "@/lib/haptics";
import { pickSingleImage, requestImageSourcePermission, type ImageSource } from "@/lib/image-picker";
import {
  generateAnonymousNickname,
  getOrCreateClientId,
  loadPlayerIdentity,
  savePlayerIdentity,
  type PlayerIdentity,
} from "@/lib/player-identity";
import { recentGameFromPayload, saveRecentGame } from "@/lib/recent-games";
import { useT } from "@/lib/i18nContext";
import type { Translations } from "@breview/shared";

type Section = "rate" | "results" | "edit";
type RatingDraft = Record<number, { score: number | null; comment: string }>;

interface EditBeerDraft {
  clientKey: string;
  id?: number;
  name: string;
  imageUrl: string;
  localAsset: ImagePicker.ImagePickerAsset | null;
  identifying: boolean;
}

const BREVIEW_ORIGIN = "https://breview.ing";

function readParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatScore(value: unknown, config?: RatingConfig): string {
  const normalized = normalizeScore(value, config);
  return normalized == null ? "—" : normalized.toFixed(2);
}

function untappdUrl(beer: BeerDto | ResultBeerDto | EditBeerDraft): string {
  const explicit = "untappd_url" in beer ? String(beer.untappd_url ?? "").trim() : "";
  return explicit || `https://untappd.com/search?q=${encodeURIComponent(beer.name)}`;
}

function sessionUrl(publicId: string): string {
  return `${BREVIEW_ORIGIN}/s/${publicId}`;
}

function hostTokenFromUrl(value: string | null | undefined, shareId: string): string {
  if (!value || !shareId) return "";

  try {
    const url = new URL(value);
    const decodedShareId = decodeURIComponent(shareId);
    const pathname = url.pathname.replace(/\/+$/, "");
    const hostStyleMatch = pathname.match(/^\/h\/([^/]+)$/);
    const schemeStyleMatch = url.hostname === "h" ? pathname.match(/^\/([^/]+)$/) : null;
    const matchedShareId = hostStyleMatch?.[1] ?? schemeStyleMatch?.[1] ?? "";
    if (decodeURIComponent(matchedShareId) !== decodedShareId) return "";

    const rawToken = url.hash.replace(/^#/, "").trim();
    if (!rawToken) return "";
    return decodeURIComponent(rawToken);
  } catch {
    return "";
  }
}

function toRatingDraft(ratings: RatingDto[], ratingConfig?: RatingConfig): RatingDraft {
  const next: RatingDraft = {};
  for (const row of ratings) {
    const beerId = Number(row.beerId);
    const score = normalizeScore(row.score, ratingConfig);
    if (!Number.isInteger(beerId) || score == null) continue;
    next[beerId] = {
      score,
      comment: String(row.comment ?? ""),
    };
  }
  return next;
}

function hasDraftChanges(current: RatingDraft, saved: RatingDraft): boolean {
  const beerIds = new Set([...Object.keys(current), ...Object.keys(saved)].map(Number));
  for (const beerId of beerIds) {
    const currentRow = current[beerId] ?? { score: null, comment: "" };
    const savedRow = saved[beerId] ?? { score: null, comment: "" };
    if (currentRow.score == null) continue;
    if (normalizeScore(currentRow.score) !== normalizeScore(savedRow.score)) return true;
    if (String(currentRow.comment ?? "") !== String(savedRow.comment ?? "")) return true;
  }
  return false;
}

function resultSubtitle(results: GetResultsResponse | null, t: Translations): string {
  if (!results) return t.home.results;
  return t.game.players + ": " + results.summary.players;
}

function createEditDraft(payload: GetGameResponse): { gameName: string; beers: EditBeerDraft[] } {
  return {
    gameName: payload.game.name,
    beers: payload.beers.map((beer) => ({
      clientKey: `beer-${beer.id}`,
      id: beer.id,
      name: beer.name,
      imageUrl: beer.image_url ?? "",
      localAsset: null,
      identifying: false,
    })),
  };
}

function createEmptyBeerDraft(): EditBeerDraft {
  return {
    clientKey: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "",
    imageUrl: "",
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

function showImagePermissionDenied(source: ImageSource, t: Translations) {
  const title = source === "camera" ? t.errors.cameraDenied : t.errors.libraryDenied;
  Alert.alert(
    title,
    source === "camera" ? t.errors.allowCamera : t.errors.allowLibrary,
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

export default function GameScreen() {
  const t = useT();
  const params = useLocalSearchParams<{ gameId?: string | string[] }>();
  const pathname = usePathname();
  const rawTarget = useMemo(() => readParam(params.gameId), [params.gameId]);
  const legacyGameId = useMemo(() => Number(rawTarget), [rawTarget]);
  const validLegacyGameId = Number.isInteger(legacyGameId) && legacyGameId > 0;
  const routeShareId = validLegacyGameId ? "" : rawTarget;
  const isHostRoute = pathname.startsWith("/h/");

  const [payload, setPayload] = useState<GetGameResponse | null>(null);
  const [identity, setIdentity] = useState<PlayerIdentity | null>(null);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [editingNickname, setEditingNickname] = useState(false);
  const [section, setSection] = useState<Section>("rate");
  const [ratings, setRatings] = useState<RatingDraft>({});
  const [savedRatings, setSavedRatings] = useState<RatingDraft>({});
  const [results, setResults] = useState<GetResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editGameName, setEditGameName] = useState("");
  const [editBeers, setEditBeers] = useState<EditBeerDraft[]>([]);
  const [editRatingMode, setEditRatingMode] = useState<RatingMode>("slider");
  const [editScoreMin, setEditScoreMin] = useState("0");
  const [editScoreMax, setEditScoreMax] = useState("10");
  const [editScoreStep, setEditScoreStep] = useState("0.25");
  const [editResultsVisibility, setEditResultsVisibility] = useState<ResultsVisibility>("host_reveal");
  const [creatorToken, setCreatorToken] = useState("");
  const [saveLabel, setSaveLabel] = useState(t.game.save);
  const [message, setMessage] = useState<string | null>(null);

  const gameId = payload?.game.id ?? (validLegacyGameId ? legacyGameId : 0);
  const shareId = payload?.game.publicId ?? routeShareId;
  const title = payload?.game.name ?? (shareId ? t.game.session : validLegacyGameId ? `${t.game.sessionNumber} #${legacyGameId}` : t.game.session);
  const hasDirtyRatings = useMemo(() => hasDraftChanges(ratings, savedRatings), [ratings, savedRatings]);
  const shareUrl = shareId ? sessionUrl(shareId) : validLegacyGameId ? `${BREVIEW_ORIGIN}/${legacyGameId}` : BREVIEW_ORIGIN;
  const canHost = !shareId || Boolean(creatorToken);

  useEffect(() => {
    if (!isHostRoute || !routeShareId) return;
    let cancelled = false;

    async function applyHostToken(url?: string | null) {
      const tokenFromUrl = hostTokenFromUrl(url, routeShareId);
      if (tokenFromUrl) {
        await saveHostToken(routeShareId, tokenFromUrl);
        if (!cancelled) setCreatorToken(tokenFromUrl);
        return;
      }

      const storedToken = await loadHostToken(routeShareId);
      if (!cancelled) setCreatorToken(storedToken);
    }

    void Linking.getInitialURL().then(applyHostToken);
    const subscription = Linking.addEventListener("url", ({ url }) => {
      void applyHostToken(url);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [isHostRoute, routeShareId]);

  function applyPayload(nextPayload: GetGameResponse) {
    setPayload(nextPayload);
    saveRecentGame(recentGameFromPayload(nextPayload));

    const draft = createEditDraft(nextPayload);
    setEditGameName(draft.gameName);
    setEditBeers(draft.beers);
    setEditRatingMode(nextPayload.game.ratingConfig.mode);
    setEditScoreMin(String(nextPayload.game.ratingConfig.scoreMin));
    setEditScoreMax(String(nextPayload.game.ratingConfig.scoreMax));
    setEditScoreStep(String(nextPayload.game.ratingConfig.scoreStep));
    setEditResultsVisibility(nextPayload.game.resultsVisibility);
  }

  const ensureIdentity = useCallback(async (resolvedGameId = gameId): Promise<PlayerIdentity | null> => {
    if (!resolvedGameId) return null;

    const existing = await loadPlayerIdentity(resolvedGameId);
    if (existing) {
      setIdentity(existing);
      setNicknameDraft(existing.nickname);
      return existing;
    }

    const next = {
      clientId: await getOrCreateClientId(),
      nickname: generateAnonymousNickname(),
    };
    await savePlayerIdentity(resolvedGameId, next);
    setIdentity(next);
    setNicknameDraft(next.nickname);
    return next;
  }, [gameId]);

  const loadRatings = useCallback(
    async (
      nextIdentity: PlayerIdentity,
      beers: BeerDto[],
      resolvedGameId: number,
      resolvedShareId: string,
      ratingConfig?: RatingConfig,
    ) => {
      setRatingsLoading(true);

      try {
        const accountSession = await loadAccountSession();
        const response = resolvedShareId
          ? await apiClient.getSessionRatings(resolvedShareId, nextIdentity.clientId, accountSession?.sessionToken)
          : await apiClient.getRatings(resolvedGameId, nextIdentity.clientId, accountSession?.sessionToken);
        const remoteDraft = toRatingDraft(response.ratings, ratingConfig);
        const hydrated: RatingDraft = {};

        for (const beer of beers) {
          hydrated[beer.id] = remoteDraft[beer.id] ?? { score: null, comment: "" };
        }

        setRatings(hydrated);
        setSavedRatings(hydrated);
      } catch {
        const emptyDraft: RatingDraft = {};
        for (const beer of beers) {
          emptyDraft[beer.id] = { score: null, comment: "" };
        }
        setRatings(emptyDraft);
        setSavedRatings(emptyDraft);
      } finally {
        setRatingsLoading(false);
      }
    },
    [],
  );

  const loadGame = useCallback(async () => {
    if (!validLegacyGameId && !routeShareId) {
      setMessage(t.errors.pasteValidLink);
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const nextPayload = routeShareId ? await apiClient.getSession(routeShareId) : await apiClient.getGame(legacyGameId);
      applyPayload(nextPayload);
      setResults(null);

      const nextIdentity = await ensureIdentity(nextPayload.game.id);
      if (nextIdentity) {
        await loadRatings(nextIdentity, nextPayload.beers, nextPayload.game.id, routeShareId, nextPayload.game.ratingConfig);
      }
    } catch (error) {
      setMessage(String((error as Error)?.message ?? error));
    } finally {
      setLoading(false);
    }
  }, [ensureIdentity, legacyGameId, loadRatings, routeShareId, validLegacyGameId]);

  useEffect(() => {
    void loadGame();
  }, [loadGame]);

  async function saveNickname() {
    const normalized = normalizeNickname(nicknameDraft);
    if ("error" in normalized) {
      setMessage(normalized.error);
      haptics.error();
      return;
    }

    const next = {
      clientId: identity?.clientId ?? (await getOrCreateClientId()),
      nickname: normalized.value ?? generateAnonymousNickname(),
    };

    if (!gameId) return;
    await savePlayerIdentity(gameId, next);
    setIdentity(next);
    setNicknameDraft(next.nickname);
    setEditingNickname(false);
    setMessage(null);
    haptics.success();
  }

  function setBeerScore(beerId: number, score: number) {
    setRatings((current) => ({
      ...current,
      [beerId]: {
        ...(current[beerId] ?? { score: null, comment: "" }),
        score: normalizeScore(score, payload?.game.ratingConfig),
      },
    }));
  }

  function setBeerComment(beerId: number, comment: string) {
    setRatings((current) => ({
      ...current,
      [beerId]: {
        ...(current[beerId] ?? { score: null, comment: "" }),
        comment,
      },
    }));
  }

  function setEditBeer(index: number, patch: Partial<EditBeerDraft>) {
    setEditBeers((current) => current.map((beer, itemIndex) => (itemIndex === index ? { ...beer, ...patch } : beer)));
  }

  function addEditBeer() {
    haptics.selection();
    setEditBeers((current) => [...current, createEmptyBeerDraft()]);
  }

  function removeEditBeer(index: number) {
    haptics.selection();
    setEditBeers((current) => {
      const next = current.filter((_, itemIndex) => itemIndex !== index);
      return next.length ? next : [createEmptyBeerDraft()];
    });
  }

  function moveEditBeer(fromIndex: number, toIndex: number) {
    haptics.selection();
    setEditBeers((current) => {
      if (toIndex < 0 || toIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(fromIndex, 1);
      if (!item) return current;
      next.splice(toIndex, 0, item);
      return next;
    });
  }

  async function saveRatings() {
    if (!payload) return;

    const nextIdentity = identity ?? (await ensureIdentity(payload.game.id));
    if (!nextIdentity) return;

    const ratingPayload = payload.beers.flatMap((beer) => {
      const current = ratings[beer.id];
      if (!current || current.score == null) return [];
      const score = normalizeScore(current.score, payload.game.ratingConfig);
      if (score == null) return [];
      const previous = savedRatings[beer.id];
      const previousScore = previous?.score == null ? null : normalizeScore(previous.score, payload.game.ratingConfig);
      const comment = current.comment ?? "";
      if (previousScore === score && String(previous?.comment ?? "") === comment) return [];
      return [{ beerId: beer.id, score, comment }];
    });

    if (!ratingPayload.length) {
      setMessage(t.errors.saveAtLeastOneRating);
      haptics.error();
      return;
    }

    setSaving(true);
    setSaveLabel(t.game.saving);
    setMessage(null);

    try {
      const accountSession = await loadAccountSession();
      const body = {
        clientId: nextIdentity.clientId,
        nickname: nextIdentity.nickname,
        ratings: ratingPayload,
      };
      if (shareId) {
        await apiClient.saveSessionRatings(shareId, body, accountSession?.sessionToken);
      } else {
        await apiClient.saveRatings(gameId, body, accountSession?.sessionToken);
      }
      setSavedRatings({ ...ratings });
      setResults(null);
      setSaveLabel(t.game.saved);
      setTimeout(() => setSaveLabel(t.game.save), 900);
      haptics.success();
    } catch (error) {
      setSaveLabel(t.game.save);
      setMessage(String((error as Error)?.message ?? error));
      haptics.error();
    } finally {
      setSaving(false);
    }
  }

  async function loadResults() {
    if (!payload) return;

    setResultsLoading(true);
    setMessage(null);

    try {
      setResults(
        shareId
          ? await apiClient.getSessionResults(shareId, identity?.clientId, creatorToken)
          : await apiClient.getResults(payload.game.id),
      );
    } catch (error) {
      setMessage(String((error as Error)?.message ?? error));
      haptics.error();
    } finally {
      setResultsLoading(false);
    }
  }

  function openResults() {
    setSection("results");
    if (!results && !resultsLoading) {
      void loadResults();
    }
  }

  async function revealResults() {
    if (!shareId || !creatorToken) return;
    try {
      const response = await apiClient.revealSessionResults(shareId, creatorToken);
      setPayload((current) => (current ? { ...current, game: response.game } : current));
      await loadResults();
      haptics.success();
    } catch (error) {
      setMessage(String((error as Error)?.message ?? t.errors.revealFailed));
      haptics.error();
    }
  }

  async function copyShareUrl() {
    try {
      await Clipboard.setStringAsync(shareUrl);
      setMessage(t.game.linkCopied);
      haptics.success();
    } catch (error) {
      setMessage(String((error as Error)?.message ?? t.errors.copyFailed));
      haptics.error();
    }
  }

  function reportSessionContent() {
    if (!shareId) return;
    Alert.alert(t.game.reportSession, t.errors.reportPrompt, [
      { text: t.game.cancel, style: "cancel" },
      {
        text: t.errors.send,
        onPress: () => {
          void (async () => {
            try {
              await apiClient.reportSession(shareId, {
                targetType: "session",
                reason: "Mobile user report",
                clientId: identity?.clientId ?? (await getOrCreateClientId()),
              });
              setMessage(t.errors.reportReceived);
              haptics.success();
            } catch (error) {
              setMessage(String((error as Error)?.message ?? t.errors.reportFailed));
              haptics.error();
            }
          })();
        },
      },
    ]);
  }

  function openSessionActions() {
    if (!shareId) return;
    showNativeActionSheet(
      title,
      [
        {
          label: t.game.reportContent,
          destructive: true,
          onPress: reportSessionContent,
        },
      ],
      t.game.cancel,
    );
  }

  function openEditSection() {
    if (!canHost) return;
    setSection("edit");
  }

  async function shareGame() {
    try {
      await Share.share(
        {
          title: `${title} - Breview`,
          message: `${title} - Breview\n${shareUrl}`,
          url: shareUrl,
        },
        {
          dialogTitle: `${title} - Breview`,
          subject: `${title} - Breview`,
        },
      );
    } catch (error) {
      setMessage(String((error as Error)?.message ?? t.errors.sharingFailed));
      haptics.error();
    }
  }

  async function pickEditBeerImage(index: number, source: ImageSource) {
    setMessage(null);

    const hasPermission = await requestImageSourcePermission(source);
    if (!hasPermission) {
      const message =
        source === "camera" ? t.errors.cameraMissing : t.errors.libraryMissing;
      setMessage(message);
      showImagePermissionDenied(source, t);
      haptics.error();
      return;
    }

    let result: ImagePicker.ImagePickerResult;
    try {
      result = await pickSingleImage(source);
    } catch (error) {
      setMessage(String((error as Error)?.message ?? t.errors.generalError));
      haptics.error();
      return;
    }

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setEditBeer(index, {
      localAsset: asset,
      imageUrl: "",
    });
    haptics.selection();
  }

  async function identifyEditBeer(index: number) {
    const row = editBeers[index];
    if (!row?.localAsset) {
      setMessage(t.errors.selectImageFirst);
      haptics.error();
      return;
    }

    setMessage(null);
    setEditBeer(index, { identifying: true });

    try {
      const identified = await identifyBeerNameAsset(asMobileImageAsset(row.localAsset), await getOrCreateClientId());
      setEditBeer(index, { name: identified.beerName, identifying: false });
      haptics.success();
    } catch (error) {
      const message = String((error as Error)?.message ?? t.errors.aiIdentificationFailed);
      setEditBeer(index, { identifying: false });
      setMessage(message);
      Alert.alert("AI-tunnistus", message);
      haptics.error();
    }
  }

  async function saveGameEdits() {
    const trimmedName = editGameName.trim();
    if (!trimmedName) {
      setMessage(t.errors.giveSessionName);
      haptics.error();
      return;
    }

    const payloadBeers: UpdateGameRequest["beers"] = [];
    setEditSaving(true);
    setMessage(null);

    try {
      for (let index = 0; index < editBeers.length; index += 1) {
        const row = editBeers[index];
        const name = row.name.trim();
        if (!name) {
          throw new Error(t.errors.nameAllDrinks);
        }

        let image_url = row.imageUrl.trim() || null;
        if (row.localAsset) {
          const upload = await uploadImageAsset(asMobileImageAsset(row.localAsset));
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
          ratingMode: editRatingMode,
          scoreMin: editRatingMode === "stars" ? 0 : Number(editScoreMin),
          scoreMax: editRatingMode === "stars" ? (editScoreMax === "10" ? 10 : 5) : Number(editScoreMax),
          scoreStep: editRatingMode === "stars" ? 1 : Number(editScoreStep),
          resultsVisibility: editResultsVisibility,
        },
      };
      const updated = shareId
        ? await apiClient.updateSession(shareId, updatePayload, creatorToken)
        : await apiClient.updateGame(gameId, updatePayload);

      const nextPayload = { game: updated.game, beers: updated.beers };
      applyPayload(nextPayload);
      setResults(null);
      setSection("rate");

      const nextIdentity = identity ?? (await ensureIdentity(updated.game.id));
      if (nextIdentity) {
        await loadRatings(nextIdentity, updated.beers, updated.game.id, shareId, updated.game.ratingConfig);
      }
      haptics.success();
    } catch (error) {
      setMessage(String((error as Error)?.message ?? error));
      haptics.error();
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerBackTitle: "",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <ScrollView
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-5 px-5 pb-8 pt-5"
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center gap-2">
          <Text variant="h2" className="text-center">
            {title}
          </Text>
          <Text selectable variant="muted" className="text-center">
            {payload?.beers.length ?? 0} {t.game.drinks}
          </Text>

          {editingNickname ? (
            <Card className="w-full gap-3 p-4">
              <Text variant="small">{t.game.nickname}</Text>
              <Input value={nicknameDraft} onChangeText={setNicknameDraft} placeholder={t.game.nicknamePlaceholder} />
              <View className="flex-row gap-2">
                <Button className="flex-1" onPress={saveNickname}>
                  {t.game.save}
                </Button>
                <Button className="flex-1" variant="outline" onPress={() => setEditingNickname(false)}>
                  {t.game.cancel}
                </Button>
              </View>
            </Card>
          ) : (
            <Text variant="muted" className="text-center">
              {t.game.nickname}: {identity?.nickname ?? t.game.notSet}{" "}
              <Text className="text-accent underline" onPress={() => setEditingNickname(true)}>
                {t.game.change}
              </Text>
            </Text>
          )}
          <View className="mt-2 flex-row flex-wrap justify-center gap-2">
            <Button variant="secondary" size="sm" onPress={shareGame}>
              {t.share.shareSession}
            </Button>
            {canHost ? (
              <Button variant="secondary" size="sm" onPress={openEditSection}>
                {t.game.editSession}
              </Button>
            ) : null}
            {shareId ? (
              <Button variant="ghost" size="sm" onPress={openSessionActions}>
                ⋯
              </Button>
            ) : null}
          </View>
        </View>

        <View className="flex-row rounded-lg bg-secondary p-1">
          <SectionTab
            active={section === "rate"}
            label={t.game.rate}
            onPress={() => {
              setSection("rate");
            }}
          />
          <SectionTab active={section === "results"} label={t.game.resultsTab} onPress={openResults} />
        </View>

        {message ? (
          <Card className="border-border bg-background p-4">
            <Text selectable variant="small" className="text-accent">
              {message}
            </Text>
          </Card>
        ) : null}

        {loading ? (
          <Card>
            <Text>{t.game.loading}</Text>
          </Card>
        ) : null}

        {!loading && !payload ? (
          <Card className="gap-3">
            <Text variant="large">{t.game.error}</Text>
            <Text selectable variant="muted">
              {t.errors.generalError}
            </Text>
            <Button variant="secondary" onPress={() => void loadGame()}>
              {t.game.retry}
            </Button>
          </Card>
        ) : null}

        {payload && section === "rate" ? (
          <View className="gap-4">
            {ratingsLoading ? <Text variant="muted">{t.game.loading}</Text> : null}
            {payload.beers.map((beer) => (
              <BeerRatingCard t={t}
                key={beer.id}
                beer={beer}
                score={ratings[beer.id]?.score ?? null}
                comment={ratings[beer.id]?.comment ?? ""}
                onScoreChange={(score) => setBeerScore(beer.id, score)}
                onCommentChange={(comment) => setBeerComment(beer.id, comment)}
                ratingConfig={payload.game.ratingConfig}
              />
            ))}
            <Button variant="success" loading={saving} disabled={!hasDirtyRatings || saving} onPress={saveRatings}>
              {saveLabel}
            </Button>
          </View>
        ) : null}

        {payload && section === "results" ? (
          <Card className="gap-4">
            <View className="gap-1">
              <Text variant="h3">{t.game.resultsTab}</Text>
              <Text variant="muted">{resultSubtitle(results, t)}</Text>
            </View>
            <View className="gap-3">
              {resultsLoading ? (
                <Text variant="muted">{t.game.refreshing}</Text>
              ) : results?.beers.length ? (
                results.beers.map((beer) => (
                  <ResultRow t={t} key={beer.id} beer={beer} ratingConfig={payload.game.ratingConfig} />
                ))
              ) : (
                <View className="gap-3">
                  <Text variant="muted">{t.game.noPlayersYet}</Text>
                  <Button variant="secondary" onPress={() => void loadResults()}>
                    {t.game.refreshResults}
                  </Button>
                </View>
              )}
              {canHost && payload.game.resultsVisibility === "host_reveal" && !payload.game.resultsRevealedAt ? (
                <Button onPress={() => void revealResults()}>{t.game.revealResults}</Button>
              ) : null}
            </View>
          </Card>
        ) : null}

        {payload && section === "edit" ? (
          <View className="gap-5">
            <Card className="gap-4">
              <View className="gap-1">
                <Text variant="h3">{t.share.inviteTasters}</Text>
                <Text selectable variant="muted">
                  {t.share.shareDescription}
                </Text>
              </View>
              <View className="gap-2">
                <Button variant="secondary" onPress={copyShareUrl}>
                  {t.share.copySessionLink}
                </Button>
                <Button variant="secondary" onPress={shareGame}>
                  {t.share.shareSession}
                </Button>
              </View>
            </Card>

            <Card className="gap-4">
              <View className="gap-1">
                <Text variant="h3">{t.game.editSession}</Text>
                <Text variant="muted">{t.errors.nameAllDrinks}</Text>
              </View>
              <View className="gap-2">
                <Text variant="muted">{t.home.sessionName}</Text>
                <Input value={editGameName} onChangeText={setEditGameName} placeholder={t.home.sessionName} />
              </View>
            </Card>

            <Card className="gap-4">
              <View className="gap-1">
                <Text variant="h3">{t.game.settings}</Text>
                <Text variant="muted">{t.home.sessionSettings}</Text>
              </View>
              <View className="flex-row gap-2">
                <Button
                  className="flex-1"
                  variant={editRatingMode === "slider" ? "default" : "secondary"}
                  onPress={() => {
                    haptics.selection();
                    setEditRatingMode("slider");
                  }}
                >
                  {t.home.slider}
                </Button>
                <Button
                  className="flex-1"
                  variant={editRatingMode === "stars" ? "default" : "secondary"}
                  onPress={() => {
                    haptics.selection();
                    setEditRatingMode("stars");
                    setEditScoreMin("0");
                    setEditScoreMax(editScoreMax === "10" ? "10" : "5");
                    setEditScoreStep("1");
                  }}
                >
                  {t.home.stars}
                </Button>
              </View>
              {editRatingMode === "stars" ? (
                <View className="flex-row gap-2">
                  <Button
                    className="flex-1"
                    variant={editScoreMax === "10" ? "secondary" : "default"}
                    onPress={() => {
                      haptics.selection();
                      setEditScoreMin("0");
                      setEditScoreMax("5");
                      setEditScoreStep("1");
                    }}
                  >
                    5
                  </Button>
                  <Button
                    className="flex-1"
                    variant={editScoreMax === "10" ? "default" : "secondary"}
                    onPress={() => {
                      haptics.selection();
                      setEditScoreMin("0");
                      setEditScoreMax("10");
                      setEditScoreStep("1");
                    }}
                  >
                    10
                  </Button>
                </View>
              ) : (
                <View className="flex-row gap-2">
                  <Input className="flex-1" value={editScoreMin} onChangeText={setEditScoreMin} keyboardType="decimal-pad" placeholder={t.home.minLabel} />
                  <Input className="flex-1" value={editScoreMax} onChangeText={setEditScoreMax} keyboardType="decimal-pad" placeholder={t.home.maxLabel} />
                  <Input className="flex-1" value={editScoreStep} onChangeText={setEditScoreStep} keyboardType="decimal-pad" placeholder={t.home.stepLabel} />
                </View>
              )}
              <View className="gap-2">
                <Button
                  variant={editResultsVisibility === "host_reveal" ? "default" : "secondary"}
                  onPress={() => {
                    haptics.selection();
                    setEditResultsVisibility("host_reveal");
                  }}
                >
                  {t.home.revealAtEnd}
                </Button>
                <Button
                  variant={editResultsVisibility === "after_submit" ? "default" : "secondary"}
                  onPress={() => {
                    haptics.selection();
                    setEditResultsVisibility("after_submit");
                  }}
                >
                  {t.home.showAfterSubmit}
                </Button>
                <Button
                  variant={editResultsVisibility === "live" ? "default" : "secondary"}
                  onPress={() => {
                    haptics.selection();
                    setEditResultsVisibility("live");
                  }}
                >
                  {t.home.showImmediately}
                </Button>
              </View>
            </Card>

            <View className="gap-4">
              {editBeers.map((beer, index) => (
                <EditBeerCard t={t}
                  key={beer.clientKey}
                  beer={beer}
                  index={index}
                  canRemove={editBeers.length > 1}
                  onRemove={() => removeEditBeer(index)}
                  onChange={(patch) => setEditBeer(index, patch)}
                  onPickCamera={() => void pickEditBeerImage(index, "camera")}
                  onPickLibrary={() => void pickEditBeerImage(index, "library")}
                  onIdentify={() => void identifyEditBeer(index)}
                  canMoveUp={index > 0}
                  canMoveDown={index < editBeers.length - 1}
                  onMoveUp={() => moveEditBeer(index, index - 1)}
                  onMoveDown={() => moveEditBeer(index, index + 1)}
                />
              ))}
            </View>

            <Card className="gap-2">
              <Button variant="secondary" onPress={addEditBeer}>
                {t.editor.addDrink}
              </Button>
              <Button loading={editSaving} onPress={saveGameEdits}>
                {t.editor.saveChanges}
              </Button>
            </Card>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}

function SectionTab({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      className={`min-h-12 flex-1 items-center justify-center rounded-md ${active ? "bg-primary" : ""}`}
      onPress={onPress}
    >
      <Text variant="small" className={active ? "text-primary-foreground" : "text-accent"}>
        {label}
      </Text>
    </Pressable>
  );
}

interface BeerRatingCardProps {
  t: Translations;
  beer: BeerDto;
  score: number | null;
  comment: string;
  ratingConfig: RatingConfig;
  onScoreChange: (score: number) => void;
  onCommentChange: (comment: string) => void;
}

function BeerRatingCard({ t,  beer, score, comment, ratingConfig, onScoreChange, onCommentChange }: BeerRatingCardProps) {
  const sliderValue = score == null ? ratingConfig.scoreMin : score;
  const starCount = Math.max(1, Math.round(ratingConfig.scoreMax - ratingConfig.scoreMin));
  const scoreText = score == null ? "–" : String(Math.round(score));

  return (
    <Card className="gap-4">
      <View className="flex-row gap-3">
        <View className="h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
          {beer.image_url ? (
            <Image source={{ uri: beer.image_url }} style={{ width: 72, height: 72 }} contentFit="cover" />
          ) : (
            <Text variant="muted" className="text-center text-xs">
              {t.editor.noImage}
            </Text>
          )}
        </View>
        <View className="min-h-[72px] flex-1 justify-center gap-2">
          <Text variant="large">{beer.name}</Text>
          <Text className="text-accent underline" onPress={() => void Linking.openURL(untappdUrl(beer))}>
            Untappd
          </Text>
        </View>
      </View>

      <View className="gap-2">
        <View className="flex-row items-center gap-3">
          {ratingConfig.mode === "stars" ? (
            <View className="flex-1 flex-row gap-0.5">
              {Array.from({ length: starCount }, (_, index) => {
                const value = ratingConfig.scoreMin + index + 1;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    className="min-h-10 flex-1 items-center justify-center rounded-md bg-secondary px-0"
                    onPress={() => {
                      haptics.selection();
                      onScoreChange(value);
                    }}
                  >
                    <Text className={score != null && score >= value ? "text-sm text-primary" : "text-sm text-muted-foreground"}>★</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View className="flex-1">
              <Slider
                minimumValue={ratingConfig.scoreMin}
                maximumValue={ratingConfig.scoreMax}
                step={ratingConfig.scoreStep}
                value={sliderValue}
                minimumTrackTintColor="#0a84ff"
                maximumTrackTintColor="#e5e7eb"
                thumbTintColor="#0a84ff"
                onValueChange={(value) => onScoreChange(value)}
                onSlidingComplete={() => haptics.light()}
              />
            </View>
          )}
          {ratingConfig.mode === "stars" ? (
            <Text variant="small" className="w-10 text-right text-muted-foreground" style={{ fontFamily: "JetBrainsMono" }}>
              {scoreText}/{starCount}
            </Text>
          ) : (
            <View className="w-20 rounded-lg border border-border bg-background px-3 py-2">
              <Text className="text-right text-xl tabular-nums" style={{ fontFamily: "JetBrainsMono" }}>
                {formatScore(score, ratingConfig)}
              </Text>
            </View>
          )}
        </View>

        <Text variant="muted">{t.home.optionalComment}</Text>
        <TextInput
          className="min-h-24 rounded-lg border border-border bg-background px-3 py-3 text-base text-foreground"
          style={{ fontFamily: "Figtree" }}
          multiline
          maxLength={MAX_RATING_COMMENT_LENGTH}
          textAlignVertical="top"
          keyboardAppearance="dark"
          placeholder=""
          placeholderTextColor="#a1a1aa"
          selectionColor="#facc15"
          value={comment}
          onChangeText={onCommentChange}
        />
        <Text variant="muted" className="text-right">
          {comment.length}/{MAX_RATING_COMMENT_LENGTH}
        </Text>
      </View>
    </Card>
  );
}

interface EditBeerCardProps {
  t: Translations;
  beer: EditBeerDraft;
  index: number;
  canRemove: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onChange: (patch: Partial<EditBeerDraft>) => void;
  onPickCamera: () => void;
  onPickLibrary: () => void;
  onIdentify: () => void;
}

function EditBeerCard({ t, 
  beer,
  index,
  canRemove,
  canMoveUp,
  canMoveDown,
  onRemove,
  onMoveUp,
  onMoveDown,
  onChange,
  onPickCamera,
  onPickLibrary,
  onIdentify,
}: EditBeerCardProps) {
  const previewUri = beer.localAsset?.uri || beer.imageUrl || "";

  return (
    <Card className="gap-4">
      <View className="flex-row items-start gap-3">
        <View className="h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={{ width: 72, height: 72 }} contentFit="cover" />
          ) : (
            <Text variant="muted" className="text-center text-xs">
              {t.editor.noImage}
            </Text>
          )}
        </View>
        <View className="flex-1 gap-1">
          <Text variant="large">{beer.name.trim() || t.editor.drink}</Text>
          <Text variant="muted">{beer.localAsset ? t.editor.imageSelected : `${t.editor.row} ${index + 1}`}</Text>
        </View>
        <View className="items-end gap-1">
          <View className="flex-row gap-1">
            <Button variant="ghost" size="sm" disabled={!canMoveUp} onPress={onMoveUp}>
              ↑
            </Button>
            <Button variant="ghost" size="sm" disabled={!canMoveDown} onPress={onMoveDown}>
              ↓
            </Button>
          </View>
          {canRemove ? (
            <Button variant="ghost" size="sm" onPress={onRemove}>
              {t.editor.remove}
            </Button>
          ) : null}
        </View>
      </View>

      <View className="gap-2">
        <Text variant="muted">{t.editor.nameLabel}</Text>
        <Input value={beer.name} onChangeText={(name) => onChange({ name })} placeholder={t.home.drink} />
      </View>

      <View className="gap-2">
        <Text variant="muted">{t.editor.imageOptional}</Text>
        <View className="flex-row gap-2">
          <Button className="flex-1" variant="secondary" onPress={onPickCamera}>
            {t.editor.camera}
          </Button>
          <Button className="flex-1" variant="secondary" onPress={onPickLibrary}>
            {t.editor.gallery}
          </Button>
        </View>
        <Button variant="outline" loading={beer.identifying} disabled={!beer.localAsset} onPress={onIdentify}>
          {t.editor.identifyWithAi}
        </Button>
      </View>

      <Text className="text-accent underline" onPress={() => void Linking.openURL(untappdUrl(beer))}>
        Untappd
      </Text>
    </Card>
  );
}

function ResultRow({ t,  beer, ratingConfig }: { beer: ResultBeerDto; ratingConfig: RatingConfig; t: Translations }) {
  return (
    <View className="rounded-lg border border-border bg-background p-3">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text variant="small">{beer.name}</Text>
          <Text variant="muted">{beer.rating_count} {t.home.ratings}</Text>
        </View>
        <Text className="rounded-lg border border-border px-3 py-2 text-xl tabular-nums" style={{ fontFamily: "JetBrainsMono" }}>
          {formatScore(beer.avg_score, ratingConfig)}
        </Text>
      </View>
    </View>
  );
}
