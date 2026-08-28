"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteNavbar } from "@/components/site-navbar";
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

  useEffect(() => {
    fetch("/api/bookings")
      .then((res) => (res.ok ? res.json() : { bookings: [] }))
      .then((data) => setBookings(data.bookings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const upcoming = bookings.filter((b) => new Date(b.startsAt) >= now);
  const past = bookings.filter((b) => new Date(b.startsAt) < now);

  const displayedBookings =
    filter === "UPCOMING" ? upcoming : filter === "PAST" ? past : bookings;

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <SiteNavbar dark={false} />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#e5f7f2] border border-[#0d8d78]/25 px-2.5 py-0.5 text-xs font-bold text-[#0d8d78]">
                Planning & Agenda
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">
              Calendrier des Séances de Cours
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Retrouvez l'ensemble de vos cours programmés et accédez aux classes virtuelles HD en un clic.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/teacher/dashboard/availability"
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:border-[#0d8d78] hover:text-[#0d8d78] shadow-sm"
            >
              <IconClock className="h-4 w-4" />
              <span>Gérer mes créneaux</span>
            </Link>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
          <button
            onClick={() => setFilter("UPCOMING")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filter === "UPCOMING"
                ? "bg-[#0d8d78] text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            À venir ({upcoming.length})
          </button>
          <button
            onClick={() => setFilter("PAST")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filter === "PAST"
                ? "bg-[#0d8d78] text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Passées / Terminées ({past.length})
          </button>
          <button
            onClick={() => setFilter("ALL")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filter === "ALL"
                ? "bg-[#0d8d78] text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Toutes les séances ({bookings.length})
          </button>
        </div>

        {/* List of Bookings */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0d8d78] border-t-transparent mx-auto"></div>
            <p className="mt-4 text-xs text-slate-500">Chargement de votre planning...</p>
          </div>
        ) : displayedBookings.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
              <IconCalendar className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-bold">Aucune séance dans cette vue.</h2>
            <p className="mt-1 text-xs text-slate-500">
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
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-[#0d8d78]/40"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#d9f1e9] text-base font-bold text-[#0d8d78]">
                      {b.studentName ? b.studentName.slice(0, 2).toUpperCase() : "EL"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base">{b.studentName}</h3>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            b.status === "CONFIRMED"
                              ? "bg-emerald-100 text-emerald-800"
                              : b.status === "COMPLETED"
                              ? "bg-slate-100 text-slate-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {b.status === "CONFIRMED"
                            ? "Confirmé"
                            : b.status === "COMPLETED"
                            ? "Terminé"
                            : b.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-[#0d8d78]">
                        {b.subject || "Cours particulier"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
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

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="text-right">
                      <span className="text-xs text-slate-400">Honoraires :</span>
                      <p className="text-base font-bold text-[#0d8d78]">{b.amountTnd} DT</p>
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}