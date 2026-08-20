/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { useEffect, useState } from "react";
import { IconCalendar } from "@/components/icons";

type Booking = {
  id: string;
  teacherName: string;
  teacherSlug: string;
  subject: string;
  startsAt: string;
  durationMinutes: number;
  amountTnd: number;
  status: string;
  createdAt: string;
};

export default function StudentClassesPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "UPCOMING" | "PAST">("ALL");

  useEffect(() => {
    fetch("/api/bookings")
      .then((res) => (res.ok ? res.json() : { bookings: [] }))
      .then((data) => setBookings(data.bookings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const filtered = bookings.filter((b) => {
    const isUpcoming = new Date(b.startsAt) >= now;
    if (filter === "UPCOMING") return isUpcoming;
    if (filter === "PAST") return !isUpcoming;
    return true;
  });

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-slate-500 hover:text-slate-800">
              ← Dashboard
            </a>
            <span className="text-slate-300">/</span>
            <span className="font-bold">Mes cours & séances</span>
          </div>
          <a
            href="/teachers"
            className="rounded-full bg-[#11233f] px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
          >
            Réserver un cours
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-3xl font-bold">Mes séances de cours</h1>
            <p className="mt-1 text-sm text-slate-500">
              Retrouvez toutes vos sessions réservées et accédez à la classe en direct.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilter("ALL")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                filter === "ALL" ? "bg-[#11233f] text-white" : "bg-white border border-slate-200 text-slate-700"
              }`}
            >
              Tous ({bookings.length})
            </button>
            <button
              onClick={() => setFilter("UPCOMING")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                filter === "UPCOMING" ? "bg-[#0d8d78] text-white" : "bg-white border border-slate-200 text-slate-700"
              }`}
            >
              À venir
            </button>
            <button
              onClick={() => setFilter("PAST")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                filter === "PAST" ? "bg-slate-600 text-white" : "bg-white border border-slate-200 text-slate-700"
              }`}
            >
              Passés
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0d8d78] border-t-transparent mx-auto"></div>
            <p className="mt-3 text-sm text-slate-500">Chargement de vos séances...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
              <IconCalendar className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-bold">Aucune séance dans cette vue.</h2>
            <p className="mt-1 text-xs text-slate-500">Choisissez un professeur et commencez votre apprentissage.</p>
            <a
              href="/teachers"
              className="mt-5 inline-block rounded-xl bg-[#0d8d78] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b7866]"
            >
              Explorer les professeurs →
            </a>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {filtered.map((b) => (
              <div
                key={b.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#d9f1e9] text-lg font-bold text-[#0d8d78]">
                    {b.teacherName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-base">{b.teacherName}</h3>
                    <p className="text-xs font-bold text-[#0d8d78]">{b.subject}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      📅 {new Date(b.startsAt).toLocaleDateString("fr-TN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} à{" "}
                      {new Date(b.startsAt).toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Durée : {b.durationMinutes} min · Tarif : {b.amountTnd} DT
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      b.status === "CONFIRMED"
                        ? "bg-emerald-100 text-emerald-800"
                        : b.status === "COMPLETED"
                        ? "bg-slate-100 text-slate-700"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {b.status}
                  </span>

                  <a
                    href={`/classroom/${b.id}`}
                    className="rounded-xl bg-[#0d8d78] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b7866]"
                  >
                    Rejoindre la classe →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
