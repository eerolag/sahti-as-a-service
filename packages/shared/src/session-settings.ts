export const SESSION_PUBLIC_ID_BYTES = 16;
export const SESSION_HOST_TOKEN_BYTES = 32;

export const RATING_MODES = ["slider", "stars"] as const;
export type RatingMode = (typeof RATING_MODES)[number];

export const RESULTS_VISIBILITIES = ["live", "after_submit", "host_reveal"] as const;
export type ResultsVisibility = (typeof RESULTS_VISIBILITIES)[number];

export interface RatingConfig {
  mode: RatingMode;
  scoreMin: number;
  scoreMax: number;
  scoreStep: number;
}

export interface SessionSettingsInput {
  ratingMode?: unknown;
  scoreMin?: unknown;
  scoreMax?: unknown;
  scoreStep?: unknown;
  resultsVisibility?: unknown;
}

export interface NormalizedSessionSettings {
  ratingConfig: RatingConfig;
  resultsVisibility: ResultsVisibility;
}

export const DEFAULT_RATING_CONFIG: RatingConfig = {
  mode: "slider",
  scoreMin: 0,
  scoreMax: 10,
  scoreStep: 0.25,
};

export const DEFAULT_RESULTS_VISIBILITY: ResultsVisibility = "live";

function isRatingMode(value: unknown): value is RatingMode {
  return typeof value === "string" && RATING_MODES.includes(value as RatingMode);
}

function isResultsVisibility(value: unknown): value is ResultsVisibility {
  return typeof value === "string" && RESULTS_VISIBILITIES.includes(value as ResultsVisibility);
}

function readFiniteNumber(value: unknown, fallback: number): number {
  if (value == null || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.NaN;
}

function roundScorePart(value: number): number {
  return Number(value.toFixed(2));
}

export function normalizeSessionSettings(
  input: SessionSettingsInput | undefined | null,
): { value: NormalizedSessionSettings } | { error: string } {
  const source = input ?? {};
  const mode = source.ratingMode == null ? DEFAULT_RATING_CONFIG.mode : source.ratingMode;
  if (!isRatingMode(mode)) {
    return { error: "Virheellinen arvostelutapa" };
  }

  if (mode === "stars") {
    const scoreMax = roundScorePart(readFiniteNumber(source.scoreMax, 5));
    if (scoreMax !== 5 && scoreMax !== 10) {
      return { error: "Tähtiarvostelun määrä voi olla vain 5 tai 10" };
    }

    const resultsVisibility =
      source.resultsVisibility == null ? DEFAULT_RESULTS_VISIBILITY : source.resultsVisibility;
    if (!isResultsVisibility(resultsVisibility)) {
      return { error: "Virheellinen tulosten näkyvyysasetus" };
    }

    return {
      value: {
        ratingConfig: {
          mode,
          scoreMin: 0,
          scoreMax,
          scoreStep: 1,
        },
        resultsVisibility,
      },
    };
  }

  const fallback = DEFAULT_RATING_CONFIG;
  const scoreMin = roundScorePart(readFiniteNumber(source.scoreMin, fallback.scoreMin));
  const scoreMax = roundScorePart(readFiniteNumber(source.scoreMax, fallback.scoreMax));
  const scoreStep = roundScorePart(readFiniteNumber(source.scoreStep, fallback.scoreStep));

  if (!Number.isFinite(scoreMin) || !Number.isFinite(scoreMax) || !Number.isFinite(scoreStep)) {
    return { error: "Virheellinen arvosteluasteikko" };
  }
  if (scoreMin < 0 || scoreMin > 100) {
    return { error: "Asteikon minimi on virheellinen" };
  }
  if (scoreMax <= scoreMin || scoreMax > 100) {
    return { error: "Asteikon maksimi on virheellinen" };
  }
  if (scoreStep <= 0 || scoreStep > scoreMax - scoreMin) {
    return { error: "Asteikon askel on virheellinen" };
  }

  const resultsVisibility =
    source.resultsVisibility == null ? DEFAULT_RESULTS_VISIBILITY : source.resultsVisibility;
  if (!isResultsVisibility(resultsVisibility)) {
    return { error: "Virheellinen tulosten näkyvyysasetus" };
  }

  return {
    value: {
      ratingConfig: {
        mode,
        scoreMin,
        scoreMax,
        scoreStep,
      },
      resultsVisibility,
    },
  };
}

export function normalizeScoreForConfig(value: unknown, config: RatingConfig = DEFAULT_RATING_CONFIG): number | null {
  const score = Number(value);
  if (!Number.isFinite(score)) return null;

  const clamped = Math.min(config.scoreMax, Math.max(config.scoreMin, score));
  const steps = Math.round((clamped - config.scoreMin) / config.scoreStep);
  const snapped = config.scoreMin + steps * config.scoreStep;
  return roundScorePart(Math.min(config.scoreMax, Math.max(config.scoreMin, snapped)));
}
