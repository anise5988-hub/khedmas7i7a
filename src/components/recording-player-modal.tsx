"use client";

/**
 * Plays a lesson recording inline instead of handing the visitor a raw
 * Daily download link that opens (or silently fails) in a new tab — the
 * signed URL is also time-limited, so this is meant to be opened right
 * after the caller re-fetched a fresh one, not stored and reused later.
 */
export function RecordingPlayerModal({ url, onClose }: { url: string; onClose: () => void }) {
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
        <video
          key={url}
          src={url}
          controls
          autoPlay
          className="max-h-[75vh] w-full rounded-xl bg-black"
        >
          Votre navigateur ne prend pas en charge la lecture vidéo.
        </video>
      </div>
    </div>
  );
}
