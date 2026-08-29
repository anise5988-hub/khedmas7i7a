

"use client";

import { useEffect, useState } from "react";
import { SiteNavbar } from "@/components/site-navbar";
import { IconCalendar } from "@/components/icons";


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

const RECORDING_LABELS: Record<string, string> = {
  RECORDING: "Enregistrement en cours",
  PROCESSING: "Traitement en cours",
  AVAILABLE: "Enregistrement disponible",
  FAILED: "Échec de l'enregistrement",
};
const RECORDING_COLORS: Record<string, string> = {
  RECORDING: "bg-rose-100 text-rose-700",
  PROCESSING: "bg-amber-100 text-amber-800",
  AVAILABLE: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-rose-100 text-rose-700",
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

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <SiteNavbar dark={false} />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-3xl font-bold">Séances & Réservations ({bookings.length})</h1>
        <p className="mt-1 text-sm text-slate-500">
          Retrouvez les cours programmés avec vos élèves et rejoignez la classe virtuelle.
        </p>

        {loading ? (
          <div className="py-20 text-center text-slate-400">Chargement...</div>
        ) : bookings.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
              <IconCalendar className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-bold">Aucune réservation pour le moment.</h2>
            <p className="mt-1 text-xs text-slate-500">
              Assurez-vous que vos disponibilités sont bien renseignées.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#d9f1e9] text-lg font-bold text-[#0d8d78]">
                    {b.studentName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-base">{b.studentName}</h3>
                    <p className="text-xs text-[#0d8d78] font-bold">{b.subject}</p>
                    <p className="mt-1 text-xs text-slate-500">
                       {new Date(b.startsAt).toLocaleDateString("fr-TN", { weekday: "long", day: "numeric", month: "long" })} à{" "}
                      {new Date(b.startsAt).toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })} ({b.durationMinutes} min)
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">Gains pour ce cours : {b.amountTnd} DT</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    {b.status}
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
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
