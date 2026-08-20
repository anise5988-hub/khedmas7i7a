"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconCalendar } from "@/components/icons";
import { Course } from "@/lib/server/courses-store";

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
  const [activeTab, setActiveTab] = useState<"BOOKINGS" | "COURSES">("BOOKINGS");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [purchasedCourses, setPurchasedCourses] = useState<{ course: Course; access: { purchasedAt: string } }[]>([]);
  const [loading, setLoading] = useState(true);

  function getAuthHeaders(): Record<string, string> {
    const userId = typeof window !== "undefined" ? localStorage.getItem("profyspace_user_id") || "" : "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (userId) headers["x-user-id"] = userId;
    return headers;
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/bookings", { headers: getAuthHeaders() }).then((res) => (res.ok ? res.json() : { bookings: [] })),
      fetch("/api/courses?visibility=LOCKED", { headers: getAuthHeaders() }).then((res) => (res.ok ? res.json() : { courses: [] })),
    ])
      .then(([bookingsData, coursesData]) => {
        setBookings(bookingsData.bookings || []);
        // Get unlocked courses
        const cList = (coursesData.courses || []).map((c: Course) => ({
          course: c,
          access: { purchasedAt: c.createdAt },
        }));
        setPurchasedCourses(cList);
      })
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
      <header className="border-b border-slate-200 bg-white px-4 py-3.5 sm:px-6 sticky top-0 z-20 shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm font-semibold text-slate-500 hover:text-slate-800">
              ← Dashboard
            </Link>
            <span className="text-slate-300">/</span>
            <span className="font-bold text-sm">Mon Apprentissage</span>
          </div>

          <Link href="/" className="flex items-center gap-1 font-[family-name:var(--font-dm-sans)] text-xl font-bold tracking-tight">
            <span>ProfySpace</span>
            <span className="rounded-md bg-[#0d8d78] px-1.5 py-0.5 text-xs font-extrabold text-white">.tn</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-3xl font-bold">Mon Apprentissage & Mes Cours</h1>
            <p className="mt-1 text-sm text-slate-500">
              Retrouvez vos séances en direct ainsi que vos cours et packs e-learning débloqués.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("BOOKINGS")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === "BOOKINGS" ? "bg-[#11233f] text-white" : "bg-white border border-slate-200 text-slate-700"
              }`}
            >
              📅 Séances Live ({bookings.length})
            </button>
            <button
              onClick={() => setActiveTab("COURSES")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === "COURSES" ? "bg-[#0d8d78] text-white" : "bg-white border border-slate-200 text-slate-700"
              }`}
            >
              📚 Packs & Cours ({purchasedCourses.length})
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
            <Link
              href="/teachers"
              className="mt-5 inline-block rounded-xl bg-[#0d8d78] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b7866]"
            >
              Explorer les professeurs →
            </Link>
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

                  <Link
                    href={`/classroom/${b.id}`}
                    className="rounded-xl bg-[#0d8d78] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b7866]"
                  >
                    Rejoindre la classe →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
