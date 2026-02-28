import type { BeerDto, ResultBeerDto } from "../../shared/api-contracts";
import { normalizeScore } from "../../shared/scoring";

interface BeerCardProps {
  beer: BeerDto | ResultBeerDto;
  mode: "play" | "results";
  score?: number;
  onScoreChange?: (score: number) => void;
}

function formatScore(value: unknown): string {
  const normalized = normalizeScore(value) ?? 0;
  return normalized.toFixed(2);
}

function untappdSearchUrl(name: string): string {
  return `https://untappd.com/search?q=${encodeURIComponent(String(name ?? "").trim())}`;
}

function beerUntappdUrl(beer: BeerDto | ResultBeerDto): string {
  const explicit = String(beer?.untappd_url ?? "").trim();
  if (explicit) return explicit;
  return untappdSearchUrl(beer.name);
}

export function BeerCard({ beer, mode, score, onScoreChange }: BeerCardProps) {
  const imageStyle = beer.image_url
    ? { backgroundImage: `url("${beer.image_url.replace(/"/g, "&quot;")}")` }
    : undefined;

  const untappdUrl = beerUntappdUrl(beer);

  return (
    <div className="card">
      <div className="grid grid-cols-[72px_1fr] gap-3">
        <div
          className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-xl border border-line bg-slate-950 bg-cover bg-center text-xs text-muted"
          style={imageStyle}
        >
          {!beer.image_url ? "Ei kuvaa" : null}
        </div>

        <div className="flex flex-col gap-2">
          <div className="font-bold">{beer.name}</div>
          <a
            className="text-sm text-amber-300 underline"
            href={untappdUrl}
            target="_blank"
            rel="noreferrer"
          >
            Untappd
          </a>

          {mode === "results" ? (
            <div className="flex items-center gap-2">
              <div className="rounded-lg border border-line bg-slate-950 px-2 py-1 font-bold">
                {formatScore((beer as ResultBeerDto).avg_score)}
              </div>
              <div className="muted">keskiarvo</div>
              <div className="badge">{Number((beer as ResultBeerDto).rating_count ?? 0)} arvosanaa</div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <input
                className="range"
                type="range"
                min={0}
                max={10}
                step={0.01}
                value={normalizeScore(score) ?? 0}
                onChange={(event) => onScoreChange?.(Number(event.target.value))}
              />
              <div className="w-14 rounded-lg border border-line bg-slate-950 px-2 py-1 text-right tabular-nums">
                {formatScore(score)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
