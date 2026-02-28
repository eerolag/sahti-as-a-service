export function normalizeScore(value: unknown): number | null {
  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  const clamped = Math.min(10, Math.max(0, score));
  return Number(clamped.toFixed(2));
}

export function normalizeSearchText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function scoreUntappdCandidate(query: string, candidateName: string): number {
  const q = normalizeSearchText(query);
  const c = normalizeSearchText(candidateName);
  if (!q || !c) return 0;
  if (q === c) return 1;
  if (c.includes(q) || q.includes(c)) return 0.92;

  const qTokens = new Set(q.split(" ").filter(Boolean));
  const cTokens = new Set(c.split(" ").filter(Boolean));
  if (!qTokens.size || !cTokens.size) return 0;

  let overlap = 0;
  for (const token of qTokens) {
    if (cTokens.has(token)) overlap += 1;
  }
  if (!overlap) return 0;

  const ratio = overlap / Math.max(qTokens.size, cTokens.size);
  return Number(Math.min(ratio * 0.89, 0.89).toFixed(3));
}
