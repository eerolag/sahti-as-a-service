import { useEffect, useRef, useState } from "react";
import type { BeerDto, ResultBeerDto } from "@breview/shared/api-contracts";
import { normalizeScore } from "@breview/shared/scoring";
import { DEFAULT_RATING_CONFIG, type RatingConfig } from "@breview/shared";
import { MAX_RATING_COMMENT_LENGTH } from "@breview/shared/validation";
import { useHaptics } from "../hooks/useHaptics";
import { useT } from "../i18n/i18nContext";

const DESKTOP_SLIDER_STEP = 0.05;
const MOBILE_SLIDER_STEP = 0.25;
const MOBILE_LIKE_QUERY = "(pointer: coarse), (hover: none), (max-width: 768px)";
const HAPTIC_SCORE_STEP = 0.25;

interface BeerCardProps {
  beer: BeerDto | ResultBeerDto;
  mode: "play" | "results";
  ratingConfig?: RatingConfig;
  score?: number | null;
  comment?: string;
  onScoreChange?: (score: number) => void;
  onCommentChange?: (comment: string) => void;
  onReport?: () => void;
}

function formatScore(value: unknown, config: RatingConfig = DEFAULT_RATING_CONFIG): string {
  const normalized = normalizeScore(value, config) ?? config.scoreMin;
  return normalized.toFixed(2);
}

function parseScoreInput(value: string, config: RatingConfig): number | null {
  const normalizedText = String(value ?? "").trim().replace(",", ".");
  if (!normalizedText) return null;
  return normalizeScore(normalizedText, config);
}

function untappdSearchUrl(name: string): string {
  return `https://untappd.com/search?q=${encodeURIComponent(String(name ?? "").trim())}`;
}

function beerUntappdUrl(beer: BeerDto | ResultBeerDto): string {
  const explicit = String(beer?.untappd_url ?? "").trim();
  if (explicit) return explicit;
  return untappdSearchUrl(beer.name);
}

export function BeerCard({
  beer,
  mode,
  ratingConfig = DEFAULT_RATING_CONFIG,
  score,
  comment,
  onScoreChange,
  onCommentChange,
  onReport,
}: BeerCardProps) {
  const haptics = useHaptics();
  const t = useT();
  const imageStyle = beer.image_url
    ? { backgroundImage: `url("${beer.image_url.replace(/"/g, "&quot;")}")` }
    : undefined;

  const untappdUrl = beerUntappdUrl(beer);
  const normalizedScore = score == null ? null : normalizeScore(score, ratingConfig);
  const normalizedComment = String(comment ?? "");
  const [scoreInput, setScoreInput] = useState(() => (normalizedScore == null ? "" : formatScore(normalizedScore, ratingConfig)));
  const [isEditingInput, setIsEditingInput] = useState(false);
  const lastSliderScoreRef = useRef<number>(normalizedScore ?? ratingConfig.scoreMin);
  const [isCoarsePointer, setIsCoarsePointer] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia(MOBILE_LIKE_QUERY).matches;
  });
  const sliderStep = ratingConfig.mode === "stars" ? ratingConfig.scoreStep : isCoarsePointer ? Math.max(MOBILE_SLIDER_STEP, ratingConfig.scoreStep) : Math.max(DESKTOP_SLIDER_STEP, ratingConfig.scoreStep);

  useEffect(() => {
    if (isEditingInput) return;
    setScoreInput(normalizedScore == null ? "" : formatScore(normalizedScore, ratingConfig));
  }, [isEditingInput, normalizedScore, ratingConfig]);

  useEffect(() => {
    lastSliderScoreRef.current = normalizedScore ?? ratingConfig.scoreMin;
  }, [normalizedScore, ratingConfig.scoreMin]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia(MOBILE_LIKE_QUERY);
    const updatePointer = () => setIsCoarsePointer(mediaQuery.matches);
    updatePointer();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updatePointer);
      return () => mediaQuery.removeEventListener("change", updatePointer);
    }

    mediaQuery.addListener(updatePointer);
    return () => mediaQuery.removeListener(updatePointer);
  }, []);

  function scoreStepIndex(value: number): number {
    return Math.floor((value + Number.EPSILON) / HAPTIC_SCORE_STEP);
  }

  function handleSliderChange(rawValue: string) {
    const next = normalizeScore(rawValue, ratingConfig);
    if (next == null) return;

    const previous = lastSliderScoreRef.current;
    if (next === previous) return;

    onScoreChange?.(next);
    lastSliderScoreRef.current = next;

    if (scoreStepIndex(next) !== scoreStepIndex(previous)) {
      haptics.light();
    }
  }

  return (
    <div className="card">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-[72px_1fr] gap-3">
          <div
            className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-xl border border-line bg-[#14161b] bg-cover bg-center text-xs text-muted"
            style={imageStyle}
          >
            {!beer.image_url ? t.beerCard.noImage : null}
          </div>

          <div className="flex min-h-[72px] flex-col justify-center gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="font-bold">{beer.name}</div>
              {onReport ? (
                <button className="inline-link shrink-0 text-xs" type="button" onClick={onReport}>
                  {t.beerCard.report}
                </button>
              ) : null}
            </div>
            <a
              className="text-sm text-amber-300 underline"
              href={untappdUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t.beerCard.externalSearch}
            </a>
          </div>
        </div>

        {mode === "results" ? (
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-line bg-[#14161b] px-2 py-1 font-bold">
              {formatScore((beer as ResultBeerDto).avg_score, ratingConfig)}
            </div>
            <div className="muted">{t.beerCard.average}</div>
            <div className="badge">{Number((beer as ResultBeerDto).rating_count ?? 0)} {t.beerCard.ratings}</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {ratingConfig.mode === "stars" ? (
              <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={`${t.beerCard.scoreFor} ${beer.name}`}>
                {Array.from({ length: Math.max(1, Math.round(ratingConfig.scoreMax - ratingConfig.scoreMin)) }, (_, idx) => {
                  const value = ratingConfig.scoreMin + idx + 1;
                  return (
                    <button
                      key={value}
                      className={`btn min-h-10 px-2 ${normalizedScore != null && normalizedScore >= value ? "btn-primary" : ""}`}
                      type="button"
                      onClick={() => onScoreChange?.(value)}
                    >
                      ★
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              {ratingConfig.mode === "slider" ? (
                <input
                  className="range"
                  type="range"
                  min={ratingConfig.scoreMin}
                  max={ratingConfig.scoreMax}
                  step={sliderStep}
                  value={normalizedScore ?? ratingConfig.scoreMin}
                  onInput={(event) => handleSliderChange((event.target as HTMLInputElement).value)}
                  onChange={(event) => handleSliderChange(event.target.value)}
                  aria-label={`${t.beerCard.scoreFor} ${beer.name}`}
                />
              ) : null}
              <input
                className="w-20 rounded-lg border border-line bg-[#14161b] px-2 py-1 text-right tabular-nums text-text"
                type="text"
                inputMode="decimal"
                value={scoreInput}
                onFocus={() => setIsEditingInput(true)}
                onChange={(event) => {
                  const raw = event.target.value;
                  setScoreInput(raw);
                  const next = parseScoreInput(raw, ratingConfig);
                  if (next == null) return;
                  onScoreChange?.(next);
                }}
                onBlur={() => {
                  const parsed = parseScoreInput(scoreInput, ratingConfig);
                  setIsEditingInput(false);
                  setScoreInput(parsed == null && normalizedScore == null ? "" : formatScore(parsed ?? normalizedScore, ratingConfig));
                }}
                aria-label={`${t.beerCard.scoreNumericFor} ${beer.name}`}
              />
            </div>

            <label className="text-sm text-muted" htmlFor={`beer-comment-${beer.id}`}>
              {t.beerCard.commentOptional}
            </label>
            <textarea
              id={`beer-comment-${beer.id}`}
              className="input min-h-20 resize-y"
              maxLength={MAX_RATING_COMMENT_LENGTH}
              value={normalizedComment}
              onChange={(event) => onCommentChange?.(event.target.value)}
              aria-label={`${t.beerCard.commentFor} ${beer.name}`}
            />
            <div className="text-right text-xs text-muted">
              {normalizedComment.length}/{MAX_RATING_COMMENT_LENGTH}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
