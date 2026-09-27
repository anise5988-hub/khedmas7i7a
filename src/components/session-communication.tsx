"use client";

import { useState } from "react";

/**
 * Communication dédiée à une séance réservée.
 *
 * Un seul composant pour les deux tableaux de bord (élève / professeur) :
 *   - "Discuter" ouvre le fil privé lié à la réservation ;
 *   - "Modifier la date" propose un nouvel horaire, qui met à jour la séance
 *     ET notifie l'autre partie (notification + e-mail + ligne dans le fil).
 *
 * Aucun identifiant tiers n'est envoyé par le client : le serveur retrouve
 * le professeur et l'élève à partir de la réservation et vérifie que
 * l'appelant en fait bien partie.
 */

function getAuthHeaders(): Record<string, string> {
  const userId = typeof window !== "undefined" ? localStorage.getItem("profyspace_user_id") || "" : "";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (userId) headers["x-user-id"] = userId;
  return headers;
}

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

export type SessionBooking = {
  id: string;
  startsAt: string;
  durationMinutes: number;
  subject?: string;
  status: string;
};

export function SessionCommunication({
  booking,
  variant = "row",
  onUpdated,
}: {
  booking: SessionBooking;
  variant?: "row" | "panel";
  onUpdated?: (updated: { startsAt: string; durationMinutes: number }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showReschedule, setShowReschedule] = useState(false);
  const [newStartsAt, setNewStartsAt] = useState(() => {
    const base = new Date(booking.startsAt);
    if (Number.isNaN(base.getTime()) || base.getTime() <= Date.now()) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(18, 0, 0, 0);
      return toLocalInputValue(tomorrow);
    }
    return toLocalInputValue(base);
  });
  const [duration, setDuration] = useState(booking.durationMinutes);
  const [message, setMessage] = useState("");

  const isClosed = booking.status === "CANCELLED" || booking.status === "COMPLETED";

  async function openThread() {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const res = await fetch("/api/bookings/thread", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Impossible d'ouvrir la discussion de cette séance.");
        return;
      }
      setNotice("Ouverture de la discussion de la séance…");
      if (typeof window !== "undefined" && data.link) {
        window.location.href = data.link;
      }
    } catch {
      setError("Erreur de connexion.");
    } finally {
      setBusy(false);
    }
  }

  async function submitReschedule(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");

    const startsAtDate = new Date(newStartsAt);
    if (Number.isNaN(startsAtDate.getTime())) {
      setError("Veuillez choisir une date et une heure valides.");
      return;
    }
    if (startsAtDate.getTime() <= Date.now()) {
      setError("La nouvelle date doit être dans le futur.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/reschedule`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          startsAt: startsAtDate.toISOString(),
          durationMinutes: duration,
          message: message.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Impossible de mettre à jour la date de cette séance.");
        return;
      }

      setNotice(data.message || "Nouvelle date enregistrée.");
      setShowReschedule(false);
      setMessage("");
      if (data.booking) {
        onUpdated?.({ startsAt: data.booking.startsAt, durationMinutes: data.booking.durationMinutes });
      }
    } catch {
      setError("Erreur de connexion.");
    } finally {
      setBusy(false);
    }
  }

  const wrapperClass =
    variant === "panel"
      ? "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[.05] dark:shadow-xl"
      : "mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[.04]";

  return (
    <div className={wrapperClass}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={openThread}
          disabled={busy}
          className="rounded-xl bg-[#0d8d78] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#0b7866] disabled:opacity-50"
        >
          💬 Discuter de cette séance
        </button>
        <button
          type="button"
          onClick={() => {
            setShowReschedule((open) => !open);
            setError("");
            setNotice("");
          }}
          disabled={busy || isClosed}
          title={isClosed ? "Séance terminée ou annulée" : "Proposer une nouvelle date"}
          className="rounded-xl border border-[#0d8d78] bg-white px-3.5 py-2 text-xs font-bold text-[#0d8d78] transition hover:bg-[#e5f7f2] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#72d6bf]/40 dark:bg-transparent dark:text-[#72d6bf] dark:hover:bg-[#72d6bf]/15"
        >
          📅 {showReschedule ? "Fermer" : "Modifier la date"}
        </button>
        {notice && !error && (
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">{notice}</span>
        )}
      </div>

      {showReschedule && (
        <form onSubmit={submitReschedule} className="mt-3 space-y-2.5">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Nouvelle date et heure
              </span>
              <input
                type="datetime-local"
                required
                value={newStartsAt}
                onChange={(e) => setNewStartsAt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs outline-none focus:border-[#0d8d78] dark:border-white/15 dark:bg-[#162844] dark:text-white"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Durée
              </span>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs outline-none focus:border-[#0d8d78] dark:border-white/15 dark:bg-[#162844] dark:text-white"
              >
                <option value={30}>30 min</option>
                <option value={60}>60 min (1h)</option>
                <option value={90}>90 min (1h30)</option>
                <option value={120}>120 min (2h)</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Message (optionnel)
            </span>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={600}
              placeholder="Ex : Je ne suis pas disponible à 18h, possible plus tôt ?"
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs outline-none focus:border-[#0d8d78] dark:border-white/15 dark:bg-[#162844] dark:text-white"
            />
          </label>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            L&apos;autre partie reçoit une notification et un e-mail, et peut répondre dans la discussion de la séance. Le
            montant déjà réglé ne change pas.
          </p>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[#11233f] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#1a3a5c] disabled:opacity-50 dark:bg-[#72d6bf] dark:text-[#11233f] dark:hover:bg-[#5cc9b0]"
          >
            {busy ? "Enregistrement…" : "Enregistrer la nouvelle date et prévenir →"}
          </button>
        </form>
      )}

      {error && (
        <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-[11px] font-bold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}