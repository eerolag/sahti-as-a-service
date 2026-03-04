import { Copy, QrCode, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { apiClient } from "../api/client";
import { useHaptics } from "../hooks/useHaptics";
import { isWebShareSupported, shareUrl } from "../utils/web-share";

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
  const haptics = useHaptics();
  const [open, setOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrStatus, setQrStatus] = useState("");
  const [copyState, setCopyState] = useState("Kopioi pelin URL");
  const supportsWebShare = useMemo(() => isWebShareSupported(), []);

  const targetUrl = useMemo(() => `${window.location.origin}/${gameId}`, [gameId]);

  async function toggle() {
    const next = !open;
    haptics.selection();
    setOpen(next);
    if (!next || qrDataUrl) return;

    setQrStatus("Luodaan QR-koodia...");
    try {
      const dataUrl = await apiClient.qrSvgDataUrl(targetUrl);
      setQrDataUrl(dataUrl);
      setQrStatus("Skannaa QR avataksesi pelin");
    } catch (error) {
      haptics.error();
      setQrStatus(String((error as Error)?.message ?? "QR-koodin luonti epäonnistui"));
    }
  }

  async function copyUrl() {
    try {
      await copyToClipboard(targetUrl);
      haptics.success();
      setCopyState("Kopioitu!");
      window.setTimeout(() => setCopyState("Kopioi pelin URL"), 900);
    } catch (error) {
      haptics.error();
      alert(String((error as Error)?.message ?? "URL:n kopiointi epäonnistui"));
    }
  }

  async function shareGame() {
    if (!supportsWebShare) return;

    try {
      haptics.light();
      await shareUrl({
        title: "Sahti as a Service",
        text: "Liity peliin",
        url: targetUrl,
      });
      haptics.success();
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      haptics.error();
      alert(String((error as Error)?.message ?? "Jakaminen epäonnistui"));
    }
  }

  return (
    <div className="card">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="font-semibold">Kutsu pelaajia</div>
          <div className="muted">Peli-ID: {gameId}</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btn btn-pill" type="button" onClick={() => void copyUrl()}>
            <Copy size={15} />
            {copyState}
          </button>

          <button className="btn btn-pill" type="button" onClick={() => void toggle()}>
            <QrCode size={15} />
            {open ? "Piilota QR" : "QR"}
          </button>

          {supportsWebShare ? (
            <button className="btn btn-pill" type="button" onClick={() => void shareGame()}>
              <Share2 size={15} />
              Jaa peli
            </button>
          ) : null}
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
