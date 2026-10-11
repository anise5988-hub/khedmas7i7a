"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteNavbar } from "@/components/site-navbar";
import { SessionCommunication } from "@/components/session-communication";
import { IconCalendar, IconClock, IconVideo } from "@/components/icons";

type Booking = {
  id: string;
  studentName: string;
  startsAt: string;
  durationMinutes: number;
  amountTnd: number;
  status: string;
  subject?: string;
};

export default function TeacherCalendarPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"UPCOMING" | "PAST" | "ALL">("UPCOMING");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; type: "success" | "error"; text: string } | null>(null);

  function refresh() {
    fetch("/api/bookings")
      .then((res) => (res.ok ? res.json() : { bookings: [] }))
      .then((data) => setBookings(data.bookings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function respond(bookingId: string, action: "accept" | "decline") {
    setBusyId(bookingId);
    setFeedback(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/${action}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ id: bookingId, type: "error", text: data.error || "Échec de l'opération." });
        return;
      }
      setFeedback({
        id: bookingId,
        type: "success",
        text: action === "accept"
          ? "Demande confirmée — l'élève a été notifié et les honoraires ont été crédités."
          : "Demande refusée — le paiement a été remboursé au portefeuille de l'élève.",
      });
      refresh();
    } catch {
      setFeedback({ id: bookingId, type: "error", text: "Erreur de connexion." });
    } finally {
      setBusyId(null);
    }
  }

  const now = new Date();
  const upcoming = bookings.filter((b) => new Date(b.startsAt) >= now);
  const past = bookings.filter((b) => new Date(b.startsAt) < now);

  const displayedBookings =
    filter === "UPCOMING" ? upcoming : filter === "PAST" ? past : bookings;

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f] dark:bg-[#0c1626] dark:text-white">
      <SiteNavbar dark={false} />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#e5f7f2] border border-[#0d8d78]/25 px-2.5 py-0.5 text-xs font-bold text-[#0d8d78] dark:bg-[#72d6bf]/15 dark:border-[#72d6bf]/30 dark:text-[#72d6bf]">
                Planning & Agenda
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight dark:text-white">
              Calendrier des Séances de Cours
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Retrouvez l'ensemble de vos cours programmés et accédez aux classes virtuelles HD en un clic.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/teacher/dashboard/availability"
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:border-[#0d8d78] hover:text-[#0d8d78] shadow-sm dark:border-white/15 dark:bg-white/[.05] dark:text-slate-300 dark:hover:border-[#72d6bf] dark:hover:text-[#72d6bf] dark:shadow-xl"
            >
              <IconClock className="h-4 w-4" />
              <span>Gérer mes créneaux</span>
            </Link>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 dark:border-white/10 pb-4">
          <button
            onClick={() => setFilter("UPCOMING")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filter === "UPCOMING"
                ? "bg-[#0d8d78] text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-white/[.05] dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10"
            }`}
          >
            À venir ({upcoming.length})
          </button>
          <button
            onClick={() => setFilter("PAST")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filter === "PAST"
                ? "bg-[#0d8d78] text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-white/[.05] dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10"
            }`}
          >
            Passées / Terminées ({past.length})
          </button>
          <button
            onClick={() => setFilter("ALL")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filter === "ALL"
                ? "bg-[#0d8d78] text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-white/[.05] dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10"
            }`}
          >
            Toutes les séances ({bookings.length})
          </button>
        </div>

        {/* List of Bookings */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0d8d78] border-t-transparent mx-auto"></div>
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Chargement de votre planning...</p>
          </div>
        ) : displayedBookings.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-white/10 dark:bg-white/[.05] dark:shadow-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3 dark:bg-white/10 dark:text-slate-400">
              <IconCalendar className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-bold dark:text-white">Aucune séance dans cette vue.</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {filter === "UPCOMING"
                ? "Vous n'avez pas de séance programmée prochainement."
                : "Aucune séance passée enregistrée."}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {displayedBookings.map((b) => {
              const sessionDate = new Date(b.startsAt);
              const isPast = sessionDate < now;
              return (
                <div
                  key={b.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-[#0d8d78]/40 dark:border-white/10 dark:bg-white/[.05] dark:shadow-xl dark:hover:border-[#72d6bf]/40"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#d9f1e9] text-base font-bold text-[#0d8d78] dark:bg-[#72d6bf]/15 dark:text-[#72d6bf]">
                      {b.studentName ? b.studentName.slice(0, 2).toUpperCase() : "EL"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base dark:text-white">{b.studentName}</h3>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            b.status === "CONFIRMED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : b.status === "COMPLETED"
                              ? "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
                          }`}
                        >
                          {b.status === "CONFIRMED"
                            ? "Confirmé"
                            : b.status === "COMPLETED"
                            ? "Terminé"
                            : b.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-[#0d8d78] dark:text-[#72d6bf]">
                        {b.subject || "Cours particulier"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {" "}
                        {sessionDate.toLocaleDateString("fr-TN", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}{" "}
                        à {sessionDate.toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })}{" "}
                        ({b.durationMinutes} minutes)
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 self-end sm:self-center">
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs text-slate-400 dark:text-slate-500">Honoraires :</span>
                        <p className="text-base font-bold text-[#0d8d78] dark:text-[#72d6bf]">{b.amountTnd} DT</p>
                      </div>

                      {!isPast && (
                        <Link
                          href={`/classroom/${b.id}`}
                          className="flex items-center gap-2 rounded-2xl bg-[#0d8d78] px-5 py-3 text-xs font-bold text-white shadow-md transition hover:bg-[#0b7866]"
                        >
                          <IconVideo className="h-4 w-4" />
                          <span>Rejoindre la classe →</span>
                        </Link>
                      )}
                    </div>

                    {/* Confirmer / Refuser — teacher-only endpoints */}
                    {b.status === "PENDING" && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => respond(b.id, "accept")}
                          disabled={busyId === b.id}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {busyId === b.id ? "…" : "✅ Confirmer la demande"}
                        </button>
                        <button
                          type="button"
                          onClick={() => respond(b.id, "decline")}
                          disabled={busyId === b.id}
                          className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/40 dark:bg-transparent dark:text-rose-300 dark:hover:bg-rose-500/10"
                        >
                          Refuser
                        </button>
                      </div>
                    )}
                    {feedback?.id === b.id && (
                      <span className={`text-[11px] font-bold ${feedback.type === "success" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-300"}`}>
                        {feedback.text}
                      </span>
                    )}
                    {/* Modifier l'horaire — same component the student side uses */}
                    {!isPast && b.status !== "CANCELLED" && (
                      <div className="w-full">
                        <SessionCommunication
                          booking={{
                            id: b.id,
                            subject: b.subject || "Cours particulier",
                            startsAt: b.startsAt,
                            durationMinutes: b.durationMinutes,
                            status: b.status,
                          }}
                          onUpdated={() => refresh()}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}