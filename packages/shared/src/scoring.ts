import { normalizeScoreForConfig, type RatingConfig } from "./session-settings";

const LEGACY_SCORE_CONFIG: RatingConfig = {
  mode: "slider",
  scoreMin: 0,
  scoreMax: 10,
  scoreStep: 0.01,
};

export function normalizeScore(value: unknown, config: RatingConfig = LEGACY_SCORE_CONFIG): number | null {
  return normalizeScoreForConfig(value, config);
}
