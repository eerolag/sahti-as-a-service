import { useMemo, useState } from "react";
import { apiClient } from "../api/client";

interface SharePanelProps {
  gameId: number;
}

async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  const ok = document.execCommand("copy");
  ta.remove();
  if (!ok) {
    throw new Error("Kopiointi epäonnistui");
  }
}

export function SharePanel({ gameId }: SharePanelProps) {
  const [open, setOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrStatus, setQrStatus] = useState("");
  const [copyState, setCopyState] = useState("Kopioi pelin URL");

  const targetUrl = useMemo(() => `${window.location.origin}/${gameId}`, [gameId]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next || qrDataUrl) return;

    setQrStatus("Luodaan QR-koodia...");
    try {
      const dataUrl = await apiClient.qrSvgDataUrl(targetUrl);
      setQrDataUrl(dataUrl);
      setQrStatus("Skannaa QR avataksesi pelin");
    } catch (error) {
      setQrStatus(String((error as Error)?.message ?? "QR-koodin luonti epäonnistui"));
    }
  }

  async function copyUrl() {
    try {
      await copyToClipboard(targetUrl);
      setCopyState("Kopioitu!");
      window.setTimeout(() => setCopyState("Kopioi pelin URL"), 900);
    } catch (error) {
      alert(String((error as Error)?.message ?? "URL:n kopiointi epäonnistui"));
    }
  }

  return (
    <div className="card">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="font-semibold">Jaa peli</div>
            <div className="muted">Peli-ID: {gameId}</div>
          </div>
          <button className="btn min-h-8 rounded-full px-3 py-1 text-xs" type="button" onClick={() => void toggle()}>
            {open ? "Piilota QR" : "QR"}
          </button>
        </div>

        <div className="flex gap-2">
          <button className="btn grow" type="button" onClick={() => void copyUrl()}>
            {copyState}
          </button>
        </div>

        {open ? (
          <div className="rounded-xl border border-line bg-slate-950 p-3">
            <div className="flex flex-wrap items-center gap-3">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR-koodi pelin linkille"
                  className="h-[132px] w-[132px] rounded-lg border border-line bg-white p-1"
                />
              ) : null}
              <div className="flex min-w-[220px] flex-1 flex-col gap-2">
                <div className="muted">{qrStatus || "Ladataan..."}</div>
                <a className="break-all text-sm underline" href={targetUrl}>
                  {targetUrl}
                </a>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
