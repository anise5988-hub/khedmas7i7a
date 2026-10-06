"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Plays a lesson recording inline instead of handing the visitor a raw
 * Daily download link that opens (or silently fails) in a new tab — the
 * signed URL is also time-limited, so this is meant to be opened right
 * after the caller re-fetched a fresh one, not stored and reused later.
 *
 * Perceived-latency notes: a Daily recording is a large MP4, and the browser
 * only starts painting once enough has buffered. Without feedback the modal
 * just looks frozen, which is the "the video takes forever to open" report.
 * This component therefore shows a spinner while buffering, and requests an
 * aggressive preload so the buffer grows while the user reads the dialog
 * rather than after they press play.
 */
export function RecordingPlayerModal({ url, onClose }: { url: string; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [buffering, setBuffering] = useState(true);
  const [error, setError] = useState(false);

  // The caller may first open with the (possibly stale) listed URL and swap
  // in a freshly-signed one moments later. Re-mounting the <video> on that
  // swap would reset playback to zero; instead we hot-swap src and resume
  // from the viewer's current position — only if playback has actually
  // started (a metadata-less cold open has nothing to resume).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || video.src === url) return;
    const resumeAt = video.currentTime;
    const hadStarted = resumeAt > 0 || !video.paused;
    video.src = url;
    if (hadStarted) {
      const resume = () => {
        video.currentTime = resumeAt;
        video.play().catch(() => {});
        video.removeEventListener("loadedmetadata", resume);
      };
      video.addEventListener("loadedmetadata", resume);
    }
  }, [url]);

  // Escape closes the dialog — the overlay click already does, but a video
  // in fullscreen playback is exactly when users reach for the keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-[#0c1626] p-3 sm:p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold text-white">Enregistrement de la séance</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-lg font-bold text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
        <div className="relative">
          <video
            ref={videoRef}
            src={url}
            controls
            autoPlay
            playsInline
            preload="auto"
            onLoadedData={() => setBuffering(false)}
            onCanPlay={() => setBuffering(false)}
            onWaiting={() => setBuffering(true)}
            onPlaying={() => setBuffering(false)}
            onError={() => {
              setBuffering(false);
              setError(true);
            }}
            className="max-h-[75vh] w-full rounded-xl bg-black"
          >
            Votre navigateur ne prend pas en charge la lecture vidéo.
          </video>
          {buffering && !error && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/50">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#72d6bf] border-t-transparent" />
              <p className="text-xs font-semibold text-slate-200">Chargement de la vidéo…</p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/70 p-4 text-center">
              <p className="text-xs font-semibold text-rose-300">
                Impossible de charger la vidéo. Le lien a peut-être expiré — fermez et réessayez.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
