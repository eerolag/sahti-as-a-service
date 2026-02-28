import { useMemo, useState } from "react";
import { createUntappdSearchUrl } from "../../shared/untappd";
import { useBeerReorder } from "../hooks/useBeerReorder";
import { ImageSearchModal } from "./ImageSearchModal";

export interface BeerEditorRow {
  id?: number;
  name: string;
  imageUrl: string;
  file: File | null;
  untappdUrl?: string;
}

interface BeerEditorProps {
  title: string;
  gameName: string;
  onGameNameChange: (value: string) => void;
  beers: BeerEditorRow[];
  onBeersChange: (beers: BeerEditorRow[]) => void;
  onSubmit: () => Promise<void> | void;
  submitting: boolean;
  submitLabel: string;
  addLabel: string;
  onCancel?: () => void;
  cancelLabel?: string;
}

export function BeerEditor({
  title,
  gameName,
  onGameNameChange,
  beers,
  onBeersChange,
  onSubmit,
  submitting,
  submitLabel,
  addLabel,
  onCancel,
  cancelLabel = "Peruuta",
}: BeerEditorProps) {
  const [searchIndex, setSearchIndex] = useState<number | null>(null);
  const { dragIndex, overIndex, handlers } = useBeerReorder(beers, onBeersChange);

  const searchInitialQuery = useMemo(() => {
    if (searchIndex == null) return "";
    return beers[searchIndex]?.name ?? "";
  }, [beers, searchIndex]);

  function setBeerField(index: number, patch: Partial<BeerEditorRow>) {
    onBeersChange(
      beers.map((beer, idx) => {
        if (idx !== index) return beer;
        return { ...beer, ...patch };
      }),
    );
  }

  function removeBeer(index: number) {
    if (beers.length <= 1) return;
    onBeersChange(beers.filter((_, idx) => idx !== index));
  }

  function addBeer() {
    onBeersChange([...beers, { name: "", imageUrl: "", file: null }]);
  }

  return (
    <>
      <div className="card">
        <div className="flex flex-col gap-2">
          <div className="font-semibold">{title}</div>
          <div className="muted">Pelin nimi ja oluen nimi ovat pakollisia.</div>
          <div className="muted">Raahaa oluita kahvasta (⋮⋮) vaihtaaksesi järjestystä.</div>
          <label className="text-sm text-muted">Pelin nimi</label>
          <input
            className="input"
            value={gameName}
            onChange={(event) => onGameNameChange(event.target.value)}
            placeholder="esim. Sahtitesti 2026"
          />
        </div>
      </div>

      <div className="beer-list">
        {beers.map((beer, idx) => {
          const untappdUrl = beer.untappdUrl || createUntappdSearchUrl(beer.name);
          return (
            <div
              key={`${beer.id ?? "new"}-${idx}`}
              className={[
                "card drag-row",
                dragIndex === idx ? "dragging" : "",
                overIndex === idx ? "drag-over" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              draggable={beers.length > 1}
              onDragStart={() => handlers.onDragStart(idx)}
              onDragOver={(event) => {
                event.preventDefault();
                handlers.onDragOver(idx);
              }}
              onDrop={(event) => {
                event.preventDefault();
                handlers.onDrop(idx);
              }}
              onDragEnd={handlers.onDragEnd}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn flex min-h-9 w-9 items-center justify-center p-0 text-base"
                    disabled={beers.length < 2}
                    title="Raahaa tästä järjestyksen vaihtamiseksi"
                  >
                    ⋮⋮
                  </button>
                  <div className="grow font-semibold">Olut {idx + 1}</div>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={beers.length === 1}
                    onClick={() => removeBeer(idx)}
                  >
                    Poista
                  </button>
                </div>

                <label className="text-sm text-muted">Nimi</label>
                <input
                  className="input"
                  value={beer.name}
                  onChange={(event) => setBeerField(idx, { name: event.target.value })}
                  placeholder="esim. Sahti Special 2026"
                />

                <label className="text-sm text-muted">Kuva URL (optional)</label>
                <input
                  className="input"
                  value={beer.imageUrl}
                  onChange={(event) => setBeerField(idx, { imageUrl: event.target.value })}
                  placeholder="https://..."
                />

                <div className="flex flex-wrap gap-2">
                  <button className="btn" type="button" onClick={() => setSearchIndex(idx)}>
                    Hae internetistä
                  </button>
                </div>

                <label className="text-sm text-muted">Tai kuva tiedostona (optional)</label>
                <input
                  className="input"
                  type="file"
                  accept="image/*"
                  onChange={(event) => setBeerField(idx, { file: event.target.files?.[0] ?? null })}
                />
                <div className="text-xs text-muted">
                  MVP: tiedosto tallennetaan data-URL:na D1:een, joten pidä kuvat pieninä.
                </div>

                <div className="text-sm text-muted">
                  Untappd:{" "}
                  <a className="text-amber-300 underline" href={untappdUrl} target="_blank" rel="noreferrer">
                    Untappd
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="flex flex-col gap-2">
          <button className="btn" type="button" onClick={addBeer}>
            {addLabel}
          </button>
          <button className="btn btn-primary" type="button" disabled={submitting} onClick={() => void onSubmit()}>
            {submitting ? "Tallennetaan..." : submitLabel}
          </button>
          {onCancel ? (
            <button className="btn" type="button" disabled={submitting} onClick={onCancel}>
              {cancelLabel}
            </button>
          ) : null}
        </div>
      </div>

      <ImageSearchModal
        open={searchIndex != null}
        initialQuery={searchInitialQuery}
        onClose={() => setSearchIndex(null)}
        onSelect={(selected) => {
          if (searchIndex == null) return;
          setBeerField(searchIndex, {
            imageUrl: String(selected.imageUrl ?? "").trim(),
            file: null,
          });
        }}
      />
    </>
  );
}
