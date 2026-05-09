import Slider from "@react-native-community/slider";
import type { BeerDto, GetGameResponse, GetResultsResponse, RatingDto, ResultBeerDto } from "@breview/shared/api-contracts";
import { normalizeScore } from "@breview/shared/scoring";
import { MAX_RATING_COMMENT_LENGTH, normalizeNickname } from "@breview/shared/validation";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, TextInput, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { apiClient } from "@/lib/api";
import {
  generateAnonymousNickname,
  getOrCreateClientId,
  loadPlayerIdentity,
  savePlayerIdentity,
  type PlayerIdentity,
} from "@/lib/player-identity";
import { recentGameFromPayload, saveRecentGame } from "@/lib/recent-games";

type Section = "rate" | "results";
type RatingDraft = Record<number, { score: number; comment: string }>;

const SCORE_MIN = 0;
const SCORE_MAX = 10;
const SCORE_STEP = 0.25;

function readParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatScore(value: unknown): string {
  return (normalizeScore(value) ?? 0).toFixed(2);
}

function untappdUrl(beer: BeerDto | ResultBeerDto): string {
  const explicit = String(beer.untappd_url ?? "").trim();
  return explicit || `https://untappd.com/search?q=${encodeURIComponent(beer.name)}`;
}

function toRatingDraft(ratings: RatingDto[]): RatingDraft {
  const next: RatingDraft = {};
  for (const row of ratings) {
    const beerId = Number(row.beerId);
    const score = normalizeScore(row.score);
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
    const currentRow = current[beerId] ?? { score: 0, comment: "" };
    const savedRow = saved[beerId] ?? { score: 0, comment: "" };
    if ((normalizeScore(currentRow.score) ?? 0) !== (normalizeScore(savedRow.score) ?? 0)) return true;
    if (String(currentRow.comment ?? "") !== String(savedRow.comment ?? "")) return true;
  }
  return false;
}

function resultSubtitle(results: GetResultsResponse | null): string {
  if (!results) return "Keskiarvot ja arvioiden määrät";
  return `${results.summary.players} ${results.summary.players === 1 ? "pelaaja" : "pelaajaa"}`;
}

export default function GameScreen() {
  const params = useLocalSearchParams<{ gameId?: string | string[] }>();
  const gameId = useMemo(() => Number(readParam(params.gameId)), [params.gameId]);
  const validGameId = Number.isInteger(gameId) && gameId > 0;

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
  const [saveLabel, setSaveLabel] = useState("Tallenna");
  const [message, setMessage] = useState<string | null>(null);

  const title = payload?.game.name ?? (validGameId ? `Peli #${gameId}` : "Peli");
  const hasDirtyRatings = useMemo(() => hasDraftChanges(ratings, savedRatings), [ratings, savedRatings]);

  const ensureIdentity = useCallback(async (): Promise<PlayerIdentity | null> => {
    if (!validGameId) return null;

    const existing = await loadPlayerIdentity(gameId);
    if (existing) {
      setIdentity(existing);
      setNicknameDraft(existing.nickname);
      return existing;
    }

    const next = {
      clientId: await getOrCreateClientId(),
      nickname: generateAnonymousNickname(),
    };
    await savePlayerIdentity(gameId, next);
    setIdentity(next);
    setNicknameDraft(next.nickname);
    return next;
  }, [gameId, validGameId]);

  const loadRatings = useCallback(
    async (nextIdentity: PlayerIdentity, beers: BeerDto[]) => {
      setRatingsLoading(true);

      try {
        const response = await apiClient.getRatings(gameId, nextIdentity.clientId);
        const remoteDraft = toRatingDraft(response.ratings);
        const hydrated: RatingDraft = {};

        for (const beer of beers) {
          hydrated[beer.id] = remoteDraft[beer.id] ?? { score: 0, comment: "" };
        }

        setRatings(hydrated);
        setSavedRatings(hydrated);
      } catch {
        const emptyDraft: RatingDraft = {};
        for (const beer of beers) {
          emptyDraft[beer.id] = { score: 0, comment: "" };
        }
        setRatings(emptyDraft);
        setSavedRatings(emptyDraft);
      } finally {
        setRatingsLoading(false);
      }
    },
    [gameId],
  );

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
      setResults(null);
      saveRecentGame(recentGameFromPayload(nextPayload));

      const nextIdentity = await ensureIdentity();
      if (nextIdentity) {
        await loadRatings(nextIdentity, nextPayload.beers);
      }
    } catch (error) {
      setMessage(String((error as Error)?.message ?? error));
    } finally {
      setLoading(false);
    }
  }, [ensureIdentity, gameId, loadRatings, validGameId]);

  useEffect(() => {
    void loadGame();
  }, [loadGame]);

  async function saveNickname() {
    const normalized = normalizeNickname(nicknameDraft);
    if ("error" in normalized) {
      setMessage(normalized.error);
      return;
    }

    const next = {
      clientId: identity?.clientId ?? (await getOrCreateClientId()),
      nickname: normalized.value ?? generateAnonymousNickname(),
    };

    await savePlayerIdentity(gameId, next);
    setIdentity(next);
    setNicknameDraft(next.nickname);
    setEditingNickname(false);
    setMessage(null);
  }

  function setBeerScore(beerId: number, score: number) {
    setRatings((current) => ({
      ...current,
      [beerId]: {
        ...(current[beerId] ?? { score: 0, comment: "" }),
        score: normalizeScore(score) ?? 0,
      },
    }));
  }

  function setBeerComment(beerId: number, comment: string) {
    setRatings((current) => ({
      ...current,
      [beerId]: {
        ...(current[beerId] ?? { score: 0, comment: "" }),
        comment,
      },
    }));
  }

  async function saveRatings() {
    if (!payload) return;

    const nextIdentity = identity ?? (await ensureIdentity());
    if (!nextIdentity) return;

    const ratingPayload = payload.beers.map((beer) => ({
      beerId: beer.id,
      score: ratings[beer.id]?.score ?? 0,
      comment: ratings[beer.id]?.comment ?? "",
    }));

    setSaving(true);
    setSaveLabel("Tallennetaan...");
    setMessage(null);

    try {
      await apiClient.saveRatings(gameId, {
        clientId: nextIdentity.clientId,
        nickname: nextIdentity.nickname,
        ratings: ratingPayload,
      });
      setSavedRatings({ ...ratings });
      setResults(null);
      setSaveLabel("Tallennettu");
      setTimeout(() => setSaveLabel("Tallenna"), 900);
    } catch (error) {
      setSaveLabel("Tallenna");
      setMessage(String((error as Error)?.message ?? error));
    } finally {
      setSaving(false);
    }
  }

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

  function openResults() {
    setSection("results");
    if (!results && !resultsLoading) {
      void loadResults();
    }
  }

  return (
    <>
      <Stack.Screen options={{ title }} />
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
            Peli-ID: {validGameId ? gameId : "-"} · {payload?.beers.length ?? 0} olutta
          </Text>

          {editingNickname ? (
            <Card className="w-full gap-3 p-4">
              <Text variant="small">Nimimerkki</Text>
              <Input value={nicknameDraft} onChangeText={setNicknameDraft} placeholder="Nimimerkki" />
              <View className="flex-row gap-2">
                <Button className="flex-1" onPress={saveNickname}>
                  Tallenna
                </Button>
                <Button className="flex-1" variant="outline" onPress={() => setEditingNickname(false)}>
                  Peruuta
                </Button>
              </View>
            </Card>
          ) : (
            <Text variant="muted" className="text-center">
              Nimimerkki: {identity?.nickname ?? "Luodaan..."}{" "}
              <Text className="text-accent underline" onPress={() => setEditingNickname(true)}>
                (Vaihda)
              </Text>
            </Text>
          )}
        </View>

        <View className="flex-row rounded-lg bg-secondary p-1">
          <Pressable
            accessibilityRole="button"
            className={`min-h-12 flex-1 items-center justify-center rounded-md ${section === "rate" ? "bg-primary" : ""}`}
            onPress={() => setSection("rate")}
          >
            <Text variant="small" className={section === "rate" ? "text-primary-foreground" : "text-accent"}>
              Arvostele
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            className={`min-h-12 flex-1 items-center justify-center rounded-md ${section === "results" ? "bg-primary" : ""}`}
            onPress={openResults}
          >
            <Text variant="small" className={section === "results" ? "text-primary-foreground" : "text-accent"}>
              Tulokset
            </Text>
          </Pressable>
        </View>

        {message ? (
          <Card className="border-destructive bg-background p-4">
            <Text selectable variant="small" className="text-destructive">
              {message}
            </Text>
          </Card>
        ) : null}

        {loading ? <Card><Text>Ladataan...</Text></Card> : null}

        {payload && section === "rate" ? (
          <View className="gap-4">
            {ratingsLoading ? <Text variant="muted">Haetaan aiempia arvosanoja...</Text> : null}
            {payload.beers.map((beer) => (
              <BeerRatingCard
                key={beer.id}
                beer={beer}
                score={ratings[beer.id]?.score ?? 0}
                comment={ratings[beer.id]?.comment ?? ""}
                onScoreChange={(score) => setBeerScore(beer.id, score)}
                onCommentChange={(comment) => setBeerComment(beer.id, comment)}
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
              <Text variant="h3">Tulokset</Text>
              <Text variant="muted">{resultSubtitle(results)}</Text>
            </View>
            <View className="gap-3">
              {resultsLoading ? (
                <Text variant="muted">Haetaan tuloksia...</Text>
              ) : results?.beers.length ? (
                results.beers.map((beer) => <ResultRow key={beer.id} beer={beer} />)
              ) : (
                <Text variant="muted">Ei tuloksia vielä.</Text>
              )}
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </>
  );
}

interface BeerRatingCardProps {
  beer: BeerDto;
  score: number;
  comment: string;
  onScoreChange: (score: number) => void;
  onCommentChange: (comment: string) => void;
}

function BeerRatingCard({ beer, score, comment, onScoreChange, onCommentChange }: BeerRatingCardProps) {
  return (
    <Card className="gap-4">
      <View className="flex-row gap-3">
        <View className="h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
          {beer.image_url ? (
            <Image source={{ uri: beer.image_url }} style={{ width: 72, height: 72 }} contentFit="cover" />
          ) : (
            <Text variant="muted" className="text-center text-xs">
              Ei kuvaa
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
          <View className="flex-1">
            <Slider
              minimumValue={SCORE_MIN}
              maximumValue={SCORE_MAX}
              step={SCORE_STEP}
              value={score}
              minimumTrackTintColor="#0a84ff"
              maximumTrackTintColor="#e5e7eb"
              thumbTintColor="#0a84ff"
              onValueChange={(value) => onScoreChange(value)}
            />
          </View>
          <View className="w-20 rounded-lg border border-border bg-background px-3 py-2">
            <Text className="text-right text-xl tabular-nums">{formatScore(score)}</Text>
          </View>
        </View>

        <Text variant="muted">Kommentti (valinnainen)</Text>
        <TextInput
          className="min-h-24 rounded-lg border border-border bg-background px-3 py-3 text-base text-foreground"
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

function ResultRow({ beer }: { beer: ResultBeerDto }) {
  return (
    <View className="rounded-lg border border-border bg-background p-3">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text variant="small">{beer.name}</Text>
          <Text variant="muted">{beer.rating_count} arvosanaa</Text>
        </View>
        <Text className="rounded-lg border border-border px-3 py-2 text-xl tabular-nums">
          {formatScore(beer.avg_score)}
        </Text>
      </View>
    </View>
  );
}
