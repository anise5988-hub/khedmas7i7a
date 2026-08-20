/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { useEffect, useState } from "react";
import { IconCalendar } from "@/components/icons";

type Booking = {
  id: string;
  teacherName: string;
  subject: string;
  startsAt: string;
  durationMinutes: number;
  amountTnd: number;
  status: string;
};

export default function StudentCalendarPage() {
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
      <header className="border-b border-slate-200 bg-white px-4 py-3.5 sm:px-6 sticky top-0 z-20 shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-sm font-semibold text-slate-500 hover:text-slate-800">
              ← Dashboard
            </a>
            <span className="text-slate-300">/</span>
            <span className="font-bold text-sm">Calendrier des Séances</span>
          </div>

          <a href="/" className="flex items-center gap-1 font-[family-name:var(--font-dm-sans)] text-xl font-bold tracking-tight">
            <span>ProfySpace</span>
            <span className="rounded-md bg-[#0d8d78] px-1.5 py-0.5 text-xs font-extrabold text-white">.tn</span>
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-3xl font-bold">Mon Planning & Séances</h1>
        <p className="mt-1 text-sm text-slate-500">
          Retrouvez vos cours programmés par ordre chronologique.
        </p>

        {loading ? (
          <div className="py-20 text-center text-slate-400">Chargement...</div>
        ) : bookings.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
              <IconCalendar className="h-7 w-7" />
            </div>
            <h2 className="mt-3 text-lg font-bold">Aucune séance dans votre calendrier.</h2>
            <p className="mt-1 text-xs text-slate-500">Choisissez un professeur et réservez un créneau horaire.</p>
            <a
              href="/teachers"
              className="mt-4 inline-block rounded-xl bg-[#0d8d78] px-5 py-2.5 text-xs font-bold text-white"
            >
              Rechercher un professeur →
            </a>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#e5f7f2] font-bold text-[#0d8d78]">
                    <span className="text-xs uppercase">{new Date(b.startsAt).toLocaleDateString("fr-TN", { month: "short" })}</span>
                    <span className="text-lg leading-none">{new Date(b.startsAt).getDate()}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-base">{b.subject} · {b.teacherName}</h3>
                    <p className="text-xs text-slate-500">
                      ⏰ {new Date(b.startsAt).toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })} ({b.durationMinutes} minutes)
                    </p>
                    <p className="mt-1 text-xs text-slate-400">Tarif : {b.amountTnd} DT</p>
                  </div>
                </div>

                <a
                  href={`/classroom/${b.id}`}
                  className="rounded-xl bg-[#0d8d78] px-4 py-2.5 text-center text-xs font-bold text-white transition hover:bg-[#0b7866]"
                >
                  Accéder à la classe →
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
