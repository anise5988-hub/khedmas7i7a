

"use client";

import { useEffect, useState } from "react";
import { SiteNavbar } from "@/components/site-navbar";
import { IconCalendar } from "@/components/icons";
import { SessionCommunication } from "@/components/session-communication";


type Booking = {
  id: string;
  studentName: string;
  startsAt: string;
  durationMinutes: number;
  amountTnd: number;
  amountMillimes: number;
  status: string;
  subject: string;
  recordingStatus?: "NOT_AVAILABLE" | "RECORDING" | "PROCESSING" | "AVAILABLE" | "FAILED";
  recordingUrl?: string | null;
};

/**
 * Court libellé de statut : les statuts arrivent en anglais depuis l'API et
 * un « CONFIRMED » brut dans l'interface n'est pas présentable.
 */
const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
};
const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300",
  CONFIRMED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300",
  COMPLETED: "bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300",
  CANCELLED: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

const RECORDING_LABELS: Record<string, string> = {
  RECORDING: "Enregistrement en cours",
  PROCESSING: "Traitement en cours",
  AVAILABLE: "Enregistrement disponible",
  FAILED: "Échec de l'enregistrement",
};
const RECORDING_COLORS: Record<string, string> = {
  RECORDING: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  PROCESSING: "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300",
  AVAILABLE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  FAILED: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

export default function TeacherBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bookings")
      .then((res) => (res.ok ? res.json() : { bookings: [] }))
      .then((data) => setBookings(data.bookings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /** Répercuté après une modification de date, sans recharger toute la page. */
  function applyBookingUpdate(bookingId: string, updated: { startsAt: string; durationMinutes: number }) {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, startsAt: updated.startsAt, durationMinutes: updated.durationMinutes } : b)),
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f] dark:bg-[#0c1626] dark:text-white">
      <SiteNavbar dark={false} />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-3xl font-bold dark:text-white">Séances & Réservations ({bookings.length})</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Retrouvez les cours programmés avec vos élèves et rejoignez la classe virtuelle.
        </p>

        {loading ? (
          <div className="py-20 text-center text-slate-400 dark:text-slate-500">Chargement...</div>
        ) : bookings.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-white/10 dark:bg-white/[.05] dark:shadow-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3 dark:bg-white/10 dark:text-slate-400">
              <IconCalendar className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-bold dark:text-white">Aucune réservation pour le moment.</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Assurez-vous que vos disponibilités sont bien renseignées.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[.05] dark:shadow-xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#d9f1e9] text-lg font-bold text-[#0d8d78] dark:bg-[#72d6bf]/15 dark:text-[#72d6bf]">
                    {b.studentName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-base dark:text-white">{b.studentName}</h3>
                    <p className="text-xs text-[#0d8d78] font-bold dark:text-[#72d6bf]">{b.subject}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                       {new Date(b.startsAt).toLocaleDateString("fr-TN", { weekday: "long", day: "numeric", month: "long" })} à{" "}
                      {new Date(b.startsAt).toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })} ({b.durationMinutes} min)
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Gains pour ce cours : {b.amountTnd} DT</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_COLORS[b.status] || "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300"}`}>
                    {STATUS_LABELS[b.status] || b.status}
                  </span>
                  {b.recordingStatus && b.recordingStatus !== "NOT_AVAILABLE" && (
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${RECORDING_COLORS[b.recordingStatus]}`}>
                      {RECORDING_LABELS[b.recordingStatus]}
                    </span>
                  )}
                  {b.recordingStatus === "AVAILABLE" && b.recordingUrl ? (
                    <a
                      href={b.recordingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl bg-[#0d8d78] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b7866]"
                    >
                      Voir l&apos;enregistrement →
                    </a>
                  ) : (
                    <a
                      href={`/classroom/${b.id}`}
                      className="rounded-xl bg-[#0d8d78] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b7866]"
                    >
                      Ouvrir la classe →
                    </a>
                  )}
                </div>
                </div>

                {/* Communication élève ↔ professeur pour cette séance */}
                <SessionCommunication
                  booking={b}
                  onUpdated={(updated) => applyBookingUpdate(b.id, updated)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
