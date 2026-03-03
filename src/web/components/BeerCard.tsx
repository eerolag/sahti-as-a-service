import { useEffect, useRef, useState } from "react";
import type { BeerDto, ResultBeerDto } from "../../shared/api-contracts";
import { normalizeScore } from "../../shared/scoring";
import { MAX_RATING_COMMENT_LENGTH } from "../../shared/validation";
import { useHaptics } from "../hooks/useHaptics";

const SCORE_MIN = 0;
const SCORE_MAX = 10;
const DESKTOP_SLIDER_STEP = 0.05;
const MOBILE_SLIDER_STEP = 0.25;
const MOBILE_LIKE_QUERY = "(pointer: coarse), (hover: none), (max-width: 768px)";
const HAPTIC_SCORE_STEP = 0.25;

interface BeerCardProps {
  beer: BeerDto | ResultBeerDto;
  mode: "play" | "results";
  score?: number;
  comment?: string;
  onScoreChange?: (score: number) => void;
  onCommentChange?: (comment: string) => void;
}

function formatScore(value: unknown): string {
  const normalized = normalizeScore(value) ?? 0;
  return normalized.toFixed(2);
}

function parseScoreInput(value: string): number | null {
  const normalizedText = String(value ?? "").trim().replace(",", ".");
  if (!normalizedText) return null;
  return normalizeScore(normalizedText);
}

function untappdSearchUrl(name: string): string {
  return `https://untappd.com/search?q=${encodeURIComponent(String(name ?? "").trim())}`;
}

function beerUntappdUrl(beer: BeerDto | ResultBeerDto): string {
  const explicit = String(beer?.untappd_url ?? "").trim();
  if (explicit) return explicit;
  return untappdSearchUrl(beer.name);
}

export function BeerCard({ beer, mode, score, comment, onScoreChange, onCommentChange }: BeerCardProps) {
  const haptics = useHaptics();
  const imageStyle = beer.image_url
    ? { backgroundImage: `url("${beer.image_url.replace(/"/g, "&quot;")}")` }
    : undefined;

  const untappdUrl = beerUntappdUrl(beer);
  const normalizedScore = normalizeScore(score) ?? 0;
  const normalizedComment = String(comment ?? "");
  const [scoreInput, setScoreInput] = useState(() => formatScore(normalizedScore));
  const [isEditingInput, setIsEditingInput] = useState(false);
  const lastSliderScoreRef = useRef<number>(normalizedScore);
  const [isCoarsePointer, setIsCoarsePointer] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia(MOBILE_LIKE_QUERY).matches;
  });
  const sliderStep = isCoarsePointer ? MOBILE_SLIDER_STEP : DESKTOP_SLIDER_STEP;

  useEffect(() => {
    if (isEditingInput) return;
    setScoreInput(formatScore(normalizedScore));
  }, [isEditingInput, normalizedScore]);

  useEffect(() => {
    lastSliderScoreRef.current = normalizedScore;
  }, [normalizedScore]);

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
    return Math.round(value / HAPTIC_SCORE_STEP);
  }

  function handleSliderChange(rawValue: string) {
    const next = normalizeScore(rawValue);
    if (next == null) return;

    const previous = lastSliderScoreRef.current;
    if (next === previous) return;

    onScoreChange?.(next);
    lastSliderScoreRef.current = next;

    if (scoreStepIndex(next) !== scoreStepIndex(previous)) {
      haptics.selection();
    }
  }

  return (
    <div className="card">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-[72px_1fr] gap-3">
          <div
            className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-xl border border-line bg-slate-950 bg-cover bg-center text-xs text-muted"
            style={imageStyle}
          >
            {!beer.image_url ? "Ei kuvaa" : null}
          </div>

          <div className="flex min-h-[72px] flex-col justify-center gap-2">
            <div className="font-bold">{beer.name}</div>
            <a
              className="text-sm text-amber-300 underline"
              href={untappdUrl}
              target="_blank"
              rel="noreferrer"
            >
              Untappd
            </a>
          </div>
        </div>

        {mode === "results" ? (
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-line bg-slate-950 px-2 py-1 font-bold">
              {formatScore((beer as ResultBeerDto).avg_score)}
            </div>
            <div className="muted">keskiarvo</div>
            <div className="badge">{Number((beer as ResultBeerDto).rating_count ?? 0)} arvosanaa</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <input
                className="range"
                type="range"
                min={SCORE_MIN}
                max={SCORE_MAX}
                step={sliderStep}
                value={normalizedScore}
                onInput={(event) => handleSliderChange((event.target as HTMLInputElement).value)}
                onChange={(event) => handleSliderChange(event.target.value)}
                aria-label={`Arvosana oluelle ${beer.name}`}
              />
              <input
                className="w-20 rounded-lg border border-line bg-slate-950 px-2 py-1 text-right tabular-nums text-text"
                type="text"
                inputMode="decimal"
                value={scoreInput}
                onFocus={() => setIsEditingInput(true)}
                onChange={(event) => {
                  const raw = event.target.value;
                  setScoreInput(raw);
                  const next = parseScoreInput(raw);
                  if (next == null) return;
                  onScoreChange?.(next);
                }}
                onBlur={() => {
                  const parsed = parseScoreInput(scoreInput);
                  setIsEditingInput(false);
                  setScoreInput(formatScore(parsed ?? normalizedScore));
                }}
                aria-label={`Arvosana numerona oluelle ${beer.name}`}
              />
            </div>

            <label className="text-sm text-muted" htmlFor={`beer-comment-${beer.id}`}>
              Kommentti (valinnainen)
            </label>
            <textarea
              id={`beer-comment-${beer.id}`}
              className="input min-h-20 resize-y"
              maxLength={MAX_RATING_COMMENT_LENGTH}
              value={normalizedComment}
              onChange={(event) => onCommentChange?.(event.target.value)}
              aria-label={`Kommentti oluelle ${beer.name}`}
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
