"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteNavbar } from "@/components/site-navbar";
import { Course } from "@/lib/server/courses-store";

type BookingReplay = {
  id: string;
  teacherName: string;
  subject: string;
  startsAt: string;
  durationMinutes: number;
  status: string;
};

export default function ReplaysPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [pastBookings, setPastBookings] = useState<BookingReplay[]>([]);
  const [loading, setLoading] = useState(true);

  function getAuthHeaders(): Record<string, string> {
    const userId = typeof window !== "undefined" ? localStorage.getItem("profyspace_user_id") || "" : "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (userId) headers["x-user-id"] = userId;
    return headers;
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/courses/my-learning", { headers: getAuthHeaders() }).then((r) => (r.ok ? r.json() : { courses: [] })),
      fetch("/api/bookings", { headers: getAuthHeaders() }).then((r) => (r.ok ? r.json() : { bookings: [] })),
    ])
      .then(([learningData, bookingsData]) => {
        if (learningData?.courses) {
          setCourses(learningData.courses.map((item: { course: Course }) => item.course));
        }
        if (bookingsData?.bookings) {
          const past = bookingsData.bookings.filter(
            (b: BookingReplay) => new Date(b.startsAt) < new Date() || b.status === "COMPLETED"
          );
          setPastBookings(past);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <SiteNavbar dark={false} />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 space-y-8">
        <div className="border-b border-slate-200 pb-5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0d8d78]">
            E-Learning & Vidéos
          </span>
          <h1 className="mt-1 text-3xl font-bold">Mes Replays & Vidéos de Cours</h1>
          <p className="mt-1 text-sm text-slate-500">
            Retrouvez tous vos cours vidéo accessibles à tout moment pour vos révisions.
          </p>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0d8d78] border-t-transparent mx-auto"></div>
            <p className="mt-3 text-xs text-slate-500">Chargement de vos replays...</p>
          </div>
        ) : courses.length === 0 && pastBookings.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm space-y-3">
            <h2 className="text-lg font-bold">Aucun replay disponible pour le moment.</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Débloquez des packs de révision vidéo ou suivez des séances en direct pour retrouver vos contenus ici.
            </p>
            <Link
              href="/courses"
              className="mt-4 inline-block rounded-2xl bg-[#0d8d78] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b7866]"
            >
              Explorer les cours & packs vidéo →
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Unlocked Video Courses */}
            {courses.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-[#11233f]">Packs & Cours E-Learning Accessibles</h2>
                <div className="grid gap-6 sm:grid-cols-2">
                  {courses.map((c) => (
                    <div key={c.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#0d8d78]">{c.subject}</span>
                        <h3 className="font-bold text-base">{c.title}</h3>
                        <p className="text-xs text-slate-500 line-clamp-2">{c.description}</p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-400"> {c.totalLessons} vidéos ({c.durationMinutes} min)</span>
                        <Link
                          href={`/courses/${c.id}`}
                          className="rounded-xl bg-[#0d8d78] px-4 py-2 text-xs font-bold text-white hover:bg-[#0b7866] transition"
                        >
                          Visionner le cours →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past Live Sessions */}
            {pastBookings.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-[#11233f]">Historique des Séances Passées</h2>
                <div className="space-y-3">
                  {pastBookings.map((b) => (
                    <div key={b.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-sm">{b.subject} · {b.teacherName}</h3>
                        <p className="text-xs text-slate-500">
                          {new Date(b.startsAt).toLocaleDateString("fr-TN", { day: "numeric", month: "long", year: "numeric" })} ({b.durationMinutes} min)
                        </p>
                      </div>
                      <Link
                        href={`/classroom/${b.id}`}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                      >
                        Détails séance →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}