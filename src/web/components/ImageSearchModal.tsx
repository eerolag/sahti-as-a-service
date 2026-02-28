import { useEffect, useMemo, useState } from "react";
import type { ImageSearchResultDto } from "../../shared/api-contracts";
import { apiClient } from "../api/client";

interface ImageSearchModalProps {
  open: boolean;
  initialQuery: string;
  onClose: () => void;
  onSelect: (result: ImageSearchResultDto) => void;
}

export function ImageSearchModal({ open, initialQuery, onClose, onSelect }: ImageSearchModalProps) {
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ImageSearchResultDto[]>([]);

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    if (initialQuery.trim().length >= 2) {
      void runSearch(initialQuery);
    } else {
      setStatus("Kirjoita oluen nimi ja hae kuvaehdotuksia.");
      setResults([]);
    }
  }, [initialQuery, open]);

  const canSearch = useMemo(() => query.trim().length >= 2, [query]);

  async function runSearch(nextQuery: string) {
    const q = nextQuery.trim();
    if (q.length < 2) {
      setStatus("Anna hakusanaksi vähintään 2 merkkiä");
      return;
    }

    setLoading(true);
    setStatus("Haetaan kuvia...");
    setResults([]);

    try {
      const data = await apiClient.imageSearch(q, 10);
      if (!data.results.length) {
        setStatus("Ei kuvaehdotuksia tällä haulla.");
        return;
      }

      setResults(data.results);
      setStatus("Valitse sopiva kuvaehdotus.");
    } catch (error) {
      setStatus(String((error as Error)?.message ?? "Kuvahaku epäonnistui."));
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-4 md:items-center" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col gap-3 overflow-hidden rounded-card border border-line bg-card p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="font-semibold">Hae internetistä</div>
          <button className="btn min-h-9 px-3 py-1.5 text-sm" type="button" onClick={onClose}>
            Sulje
          </button>
        </div>

        <div className="muted">
          Valitse kuvaehdotus. Tarkista aina kuvan käyttöoikeus ennen julkista käyttöä.
        </div>

        <div className="flex gap-2">
          <input
            className="input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void runSearch(query);
              }
            }}
            placeholder="Kirjoita oluen nimi..."
          />
          <button
            className="btn btn-primary"
            type="button"
            disabled={!canSearch || loading}
            onClick={() => void runSearch(query)}
          >
            Hae
          </button>
        </div>

        <div className="muted min-h-5">{status}</div>

        <div className="grid grid-cols-1 gap-2 overflow-auto pr-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {results.map((item) => (
            <div key={item.imageUrl} className="flex min-h-[210px] flex-col overflow-hidden rounded-xl border border-line bg-slate-950">
              <img src={item.thumbnailUrl || item.imageUrl} alt={item.title || "Kuvaehdotus"} className="h-[120px] w-full object-cover" />
              <div className="flex flex-1 flex-col gap-2 p-2">
                <div className="line-clamp-2 text-xs">{item.title || "Kuvaehdotus"}</div>
                <div className="text-xs text-muted">{item.sourceDomain}</div>
                <button
                  className="btn mt-auto min-h-9 px-2 py-1.5 text-sm"
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                >
                  Valitse kuva
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
