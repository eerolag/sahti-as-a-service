import { useEffect, useMemo, useState } from "react";
import type { ImageSearchResultDto } from "../../shared/api-contracts";
import { apiClient } from "../api/client";
import { useHaptics } from "../hooks/useHaptics";

interface ImageSearchModalProps {
  open: boolean;
  initialQuery: string;
  onClose: () => void;
  onSelect: (result: ImageSearchResultDto) => void;
}

const HTML_TAG_PATTERN = /<[^>]*>/g;

function sanitizeText(value: string): string {
  return value.replace(HTML_TAG_PATTERN, " ").replace(/\s+/g, " ").trim();
}

export function ImageSearchModal({ open, initialQuery, onClose, onSelect }: ImageSearchModalProps) {
  const haptics = useHaptics();
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ImageSearchResultDto[]>([]);

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    if (initialQuery.trim().length >= 2) {
      void runSearch(initialQuery, { withFeedback: false });
    } else {
      setStatus("Kirjoita oluen nimi ja hae kuvaehdotuksia.");
      setResults([]);
    }
  }, [initialQuery, open]);

  const canSearch = useMemo(() => query.trim().length >= 2, [query]);

  async function runSearch(nextQuery: string, options: { withFeedback?: boolean } = {}) {
    const withFeedback = options.withFeedback ?? true;
    const q = nextQuery.trim();
    if (q.length < 2) {
      if (withFeedback) haptics.error();
      setStatus("Anna hakusanaksi vähintään 2 merkkiä");
      return;
    }

    setLoading(true);
    setStatus("Haetaan kuvia...");
    setResults([]);

    try {
      const data = await apiClient.imageSearch(q, 10);
      if (!data.results.length) {
        if (withFeedback) haptics.light();
        setStatus("Ei kuvaehdotuksia tällä haulla.");
        return;
      }

      setResults(data.results);
      setStatus("Valitse sopiva kuvaehdotus.");
      if (withFeedback) haptics.selection();
    } catch (error) {
      if (withFeedback) haptics.error();
      setStatus(String((error as Error)?.message ?? "Kuvahaku epäonnistui."));
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 md:items-center"
      onClick={() => {
        haptics.selection();
        onClose();
      }}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col gap-3 overflow-hidden rounded-card border border-line bg-card p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="font-semibold">Hae internetistä</div>
          <button
            className="btn min-h-9 px-3 py-1.5 text-sm"
            type="button"
            onClick={() => {
              haptics.selection();
              onClose();
            }}
          >
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
            onClick={() => {
              haptics.light();
              void runSearch(query);
            }}
          >
            Hae
          </button>
        </div>

        <div className="muted min-h-5">{status}</div>

        <div className="grid grid-cols-1 gap-2 overflow-auto pr-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {results.map((item) => {
            const cleanTitle = sanitizeText(item.title) || "Kuvaehdotus";
            const cleanSourceDomain = sanitizeText(item.sourceDomain);
            return (
              <div key={item.imageUrl} className="flex h-[210px] flex-col overflow-hidden rounded-xl border border-line bg-[#14161b]">
                <img src={item.thumbnailUrl || item.imageUrl} alt={cleanTitle} className="h-[120px] w-full object-cover" />
                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2">
                  <div className="min-h-0 overflow-hidden">
                    <div className="truncate text-xs">{cleanTitle}</div>
                    <div className="truncate text-xs text-muted">{cleanSourceDomain}</div>
                  </div>
                  <button
                    className="btn mt-auto min-h-9 shrink-0 px-2 py-1.5 text-sm"
                    type="button"
                    onClick={() => {
                      haptics.success();
                      onSelect(item);
                      onClose();
                    }}
                  >
                    Valitse kuva
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
