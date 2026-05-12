import { useState } from "react";
import { createUntappdSearchUrl } from "@breview/shared/untappd";
import { apiClient } from "../api/client";
import { useBeerReorder } from "../hooks/useBeerReorder";
import { useHaptics } from "../hooks/useHaptics";
import { useT } from "../i18n/i18nContext";
import { prepareImageForBeerNameRecognition } from "../utils/beer-name-image";
import { getOrCreateClientId } from "../utils/player-identity";

export interface BeerEditorRow {
  clientKey?: string;
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
  surface?: "card" | "strip";
  showSessionDetails?: boolean;
}

type IdentifyState = "idle" | "loading" | "success" | "error";

interface IdentifyStatus {
  state: IdentifyState;
  message: string;
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
  cancelLabel,
  surface = "card",
  showSessionDetails = true,
}: BeerEditorProps) {
  const haptics = useHaptics();
  const t = useT();
  const resolvedCancelLabel = cancelLabel ?? t.editor.cancelLabel;
  const [identifyStatusByRow, setIdentifyStatusByRow] = useState<Record<string, IdentifyStatus>>({});
  const { dragIndex, overIndex, handlers } = useBeerReorder(beers, onBeersChange);

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
    haptics.selection();
    onBeersChange(beers.filter((_, idx) => idx !== index));
  }

  function addBeer() {
    haptics.light();
    onBeersChange([...beers, { clientKey: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: "", imageUrl: "", file: null }]);
  }

  function moveBeer(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= beers.length) return;
    if (toIndex < 0 || toIndex >= beers.length) return;

    const next = [...beers];
    const [moved] = next.splice(fromIndex, 1);
    if (!moved) return;
    next.splice(toIndex, 0, moved);
    haptics.selection();
    onBeersChange(next);
  }

  function rowKey(beer: BeerEditorRow, idx: number): string {
    return beer.clientKey ?? `${beer.id ?? "new"}-${idx}`;
  }

  function setRowIdentifyStatus(key: string, status: IdentifyStatus) {
    setIdentifyStatusByRow((prev) => ({ ...prev, [key]: status }));
  }

  const surfaceClass = surface === "strip" ? "surface-strip" : "card";

  return (
    <>
      {showSessionDetails ? (
        <div className={surfaceClass}>
          <div className="flex flex-col gap-2">
            <div className="font-semibold">{title}</div>
            <div className="muted">{t.editor.sessionNameRequired}</div>
            <div className="muted hidden md:block">{t.editor.dragDesktop}</div>
            <div className="muted md:hidden">{t.editor.dragMobile}</div>
            <label className="text-sm text-muted">{t.editor.sessionNameLabel}</label>
            <input
              className="input"
              value={gameName}
              onChange={(event) => onGameNameChange(event.target.value)}
              placeholder={t.editor.sessionNamePlaceholder}
            />
          </div>
        </div>
      ) : null}

      <div className="beer-list">
        {beers.map((beer, idx) => {
          const untappdUrl = beer.untappdUrl || createUntappdSearchUrl(beer.name);
          const key = rowKey(beer, idx);
          const identifyStatus = identifyStatusByRow[key] ?? { state: "idle", message: "" };
          return (
            <div
              key={key}
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
                    className="btn hidden min-h-9 w-9 items-center justify-center p-0 text-base md:flex"
                    disabled={beers.length < 2}
                    title={t.editor.dragHandle}
                  >
                    ⋮⋮
                  </button>
                  <div className="grow">
                    <div className="font-semibold">{beer.name.trim() || t.editor.nameDrink}</div>
                    <div className="text-xs text-muted hidden md:block">{t.editor.rowLabel} {idx + 1}</div>
                    <div className="mt-1 inline-flex md:hidden">
                      <div className="relative inline-block">
                        <select
                          className="min-h-8 w-auto cursor-pointer appearance-none rounded-lg border border-amber-500/70 bg-[#1b1d22] py-1 pl-2 pr-7 text-xs font-semibold text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                          value={idx}
                          disabled={beers.length < 2}
                          onChange={(event) => {
                            const nextIndex = Number(event.target.value);
                            if (Number.isNaN(nextIndex)) return;
                            moveBeer(idx, nextIndex);
                          }}
                          aria-label={`${t.editor.changeRowOrder} ${idx + 1}`}
                        >
                          {beers.map((_, rowIdx) => (
                            <option key={rowIdx} value={rowIdx}>
                              {t.editor.rowLabel} {rowIdx + 1}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-[58%] text-xl leading-none text-amber-300">
                          ▾
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={beers.length === 1}
                    onClick={() => removeBeer(idx)}
                  >
                    {t.editor.remove}
                  </button>
                </div>

                <label className="text-sm text-muted">{t.editor.nameLabel}</label>
                <input
                  className="input"
                  value={beer.name}
                  onChange={(event) => setBeerField(idx, { name: event.target.value })}
                  placeholder={t.editor.namePlaceholder}
                />

                <label className="text-sm text-muted">{t.editor.imageOptional}</label>
                <label className="btn inline-flex cursor-pointer justify-center">
                  {beer.file ? t.editor.changeImage : t.editor.selectImage}
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      setBeerField(idx, { file: event.target.files?.[0] ?? null });
                      setRowIdentifyStatus(key, { state: "idle", message: "" });
                    }}
                  />
                </label>
                <div className="text-xs text-muted">
                  {t.editor.fileUploadNote}
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    className="btn"
                    type="button"
                    disabled={!beer.file || identifyStatus.state === "loading" || submitting}
                    onClick={async () => {
                      if (!beer.file) return;

                      haptics.light();
                      setRowIdentifyStatus(key, { state: "loading", message: `${t.editor.identifyingName}` });

                      try {
                        const preparedFile = await prepareImageForBeerNameRecognition(beer.file);
                        const identified = await apiClient.identifyBeerName(preparedFile, getOrCreateClientId());
                        setBeerField(idx, { name: identified.beerName, file: preparedFile });
                        setRowIdentifyStatus(key, {
                          state: "success",
                          message: `${t.editor.identifiedName}: ${identified.beerName}`,
                        });
                        haptics.success();
                      } catch (error) {
                        const message = String((error as Error)?.message ?? t.editor.identificationFailed);
                        setRowIdentifyStatus(key, {
                          state: "error",
                          message,
                        });
                        alert(message);
                        haptics.error();
                      }
                    }}
                  >
                    {identifyStatus.state === "loading" ? t.editor.identifying : t.editor.identifyWithAI}
                  </button>
                  {identifyStatus.message ? (
                    <div className={identifyStatus.state === "error" ? "text-sm text-red-300" : "text-sm text-muted"}>
                      {identifyStatus.message}
                    </div>
                  ) : null}
                </div>

                <div className="text-sm text-muted">
                  {t.editor.externalSearch}:{" "}
                  <a className="text-amber-300 underline" href={untappdUrl} target="_blank" rel="noreferrer">
                    {t.editor.openSearch}
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={surfaceClass}>
        <div className="flex flex-col gap-2">
          <button className="btn" type="button" onClick={addBeer}>
            {addLabel}
          </button>
          <button className="btn btn-primary" type="button" disabled={submitting} onClick={() => void onSubmit()}>
            {submitting ? t.editor.savingEllipsis : submitLabel}
          </button>
          {onCancel ? (
            <button
              className="btn"
              type="button"
              disabled={submitting}
              onClick={() => {
                haptics.selection();
                onCancel();
              }}
            >
              {resolvedCancelLabel}
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}
