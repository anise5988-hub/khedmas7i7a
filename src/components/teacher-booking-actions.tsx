"use client";

import { useState } from "react";

/**
 * Confirmer / Refuser buttons for a PENDING booking request, as seen from
 * the teacher side. Calls the teacher-only endpoints (which handle the
 * wallet credit on accept and the student refund on decline) and calls
 * onChanged() so the host page can refresh its list.
 */
export function TeacherBookingActions({
  bookingId,
  onChanged,
}: {
  bookingId: string;
  onChanged?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function respond(action: "accept" | "decline") {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/${action}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ type: "error", text: data.error || "Échec de l'opération." });
        return;
      }
      setFeedback({
        type: "success",
        text:
          action === "accept"
            ? "Demande confirmée — l'élève a été notifié."
            : "Demande refusée — l'élève a été remboursé.",
      });
      onChanged?.();
    } catch {
      setFeedback({ type: "error", text: "Erreur de connexion." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => respond("accept")}
          disabled={busy}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? "…" : "✅ Confirmer"}
        </button>
        <button
          type="button"
          onClick={() => respond("decline")}
          disabled={busy}
          className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-[11px] font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/40 dark:bg-transparent dark:text-rose-300 dark:hover:bg-rose-500/10"
        >
          Refuser
        </button>
      </div>
      {feedback && (
        <span className={`text-[10px] font-bold ${feedback.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-300"}`}>
          {feedback.text}
        </span>
      )}
    </div>
  );
}
