export function normalizeScore(value: unknown): number | null {
  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  const clamped = Math.min(10, Math.max(0, score));
  return Number(clamped.toFixed(2));
}
