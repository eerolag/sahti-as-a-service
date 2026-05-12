import { Copy, QrCode, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { apiClient } from "../api/client";
import { useHaptics } from "../hooks/useHaptics";
import { useT } from "../i18n/i18nContext";
import { isWebShareSupported, shareUrl as nativeShareUrl } from "../utils/web-share";

interface SharePanelProps {
  shareUrl: string;
  hostUrl?: string;
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
    throw new Error("Copy failed");
  }
}

export function SharePanel({ shareUrl, hostUrl }: SharePanelProps) {
  const haptics = useHaptics();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrStatus, setQrStatus] = useState("");
  const [copyState, setCopyState] = useState<"default" | "copied">("default");
  const [hostCopyState, setHostCopyState] = useState<"default" | "copied">("default");
  const supportsWebShare = useMemo(() => isWebShareSupported(), []);

  const targetUrl = shareUrl;

  async function toggle() {
    const next = !open;
    haptics.selection();
    setOpen(next);
    if (!next || qrDataUrl) return;

    setQrStatus(t.share.creatingQR);
    try {
      const dataUrl = await apiClient.qrSvgDataUrl(targetUrl);
      setQrDataUrl(dataUrl);
      setQrStatus(t.share.scanQR);
    } catch (error) {
      haptics.error();
      setQrStatus(String((error as Error)?.message ?? t.errors.qrFailed));
    }
  }

  async function copyUrl() {
    try {
      await copyToClipboard(targetUrl);
      haptics.success();
      setCopyState("copied");
      window.setTimeout(() => setCopyState("default"), 900);
    } catch (error) {
      haptics.error();
      alert(String((error as Error)?.message ?? t.errors.urlCopyFailed));
    }
  }

  async function shareGame() {
    if (!supportsWebShare) return;

    try {
      haptics.light();
      await nativeShareUrl({
        title: "Breview",
        text: t.share.joinSession,
        url: targetUrl,
      });
      haptics.success();
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      haptics.error();
      alert(String((error as Error)?.message ?? t.errors.sharingFailed));
    }
  }

  async function copyHostUrl() {
    if (!hostUrl) return;
    try {
      await copyToClipboard(hostUrl);
      haptics.success();
      setHostCopyState("copied");
      window.setTimeout(() => setHostCopyState("default"), 900);
    } catch (error) {
      haptics.error();
      alert(String((error as Error)?.message ?? t.errors.hostCopyFailed));
    }
  }

  return (
    <div className="surface-strip">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="font-semibold">{t.share.inviteTasters}</div>
          <div className="muted">{t.share.shareDescription}</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btn btn-pill" type="button" onClick={() => void copyUrl()}>
            <Copy size={15} />
            {copyState === "copied" ? t.share.copied : t.share.copySessionLink}
          </button>

          <button className="btn btn-pill" type="button" onClick={() => void toggle()}>
            <QrCode size={15} />
            {open ? t.share.hideQR : t.share.qr}
          </button>

          {supportsWebShare ? (
            <button className="btn btn-pill" type="button" onClick={() => void shareGame()}>
              <Share2 size={15} />
              {t.share.shareSession}
            </button>
          ) : null}

          {hostUrl ? (
            <button className="btn btn-pill" type="button" onClick={() => void copyHostUrl()}>
              <Copy size={15} />
              {hostCopyState === "copied" ? t.share.copied : t.share.copyHostLink}
            </button>
          ) : null}
        </div>

        {open ? (
          <div className="rounded-xl border border-line bg-[#14161b] p-3">
            <div className="flex flex-wrap items-center gap-3">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR"
                  className="h-[132px] w-[132px] rounded-lg border border-line bg-white p-1"
                />
              ) : null}
              <div className="flex min-w-[220px] flex-1 flex-col gap-2">
                <div className="muted">{qrStatus || t.share.loadingEllipsis}</div>
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
