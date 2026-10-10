"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { SiteNavbar } from "@/components/site-navbar";
import { IconCalendar, IconStar } from "@/components/icons";
import { Course } from "@/lib/server/courses-store";
import { formatTunisiaDate, formatTunisiaTime } from "@/lib/timezone";

type Booking = {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherSlug: string;
  subject: string;
  startsAt: string;
  durationMinutes: number;
  amountTnd: number;
  status: string;
  createdAt: string;
};

const BOOKING_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  COMPLETED: "Terminée",
  CANCELLED: "Refusée / Annulée",
};

export default function StudentClassesPage() {
  const [activeTab, setActiveTab] = useState<"BOOKINGS" | "COURSES">("BOOKINGS");
  const [bookingFilter, setBookingFilter] = useState<"ALL" | "UPCOMING" | "PAST">("ALL");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [purchasedCourses, setPurchasedCourses] = useState<{ course: Course; access: { purchasedAt: string } }[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewedTeacherIds, setReviewedTeacherIds] = useState<Set<string>>(new Set());

  const [reviewTarget, setReviewTarget] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewPhotoUrl, setReviewPhotoUrl] = useState("");
  const [reviewPhotoUploading, setReviewPhotoUploading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewStatus, setReviewStatus] = useState({ type: "", text: "" });
  const reviewPhotoInputRef = useRef<HTMLInputElement>(null);

  function getAuthHeaders(): Record<string, string> {
    const userId = typeof window !== "undefined" ? localStorage.getItem("profyspace_user_id") || "" : "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (userId) headers["x-user-id"] = userId;
    return headers;
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/bookings", { headers: getAuthHeaders() }).then((res) => (res.ok ? res.json() : { bookings: [] })),
      fetch("/api/courses/my-learning", { headers: getAuthHeaders() }).then((res) => (res.ok ? res.json() : { courses: [] })),
      fetch("/api/reviews?mine=true", { headers: getAuthHeaders() }).then((res) => (res.ok ? res.json() : { reviews: [] })),
    ])
      .then(([bookingsData, coursesData, myReviewsData]) => {
        setBookings(bookingsData.bookings || []);
        setPurchasedCourses(coursesData.courses || []);
        setReviewedTeacherIds(new Set((myReviewsData.reviews || []).map((r: { teacherId: string }) => r.teacherId)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function openReviewModal(booking: Booking) {
    setReviewTarget(booking);
    setReviewRating(5);
    setReviewComment("");
    setReviewPhotoUrl("");
    setReviewStatus({ type: "", text: "" });
  }

  async function handleReviewPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setReviewStatus({ type: "error", text: "Veuillez choisir un fichier image." });
      return;
    }
    setReviewPhotoUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", "image");
    try {
      const res = await fetch("/api/uploads/video", { method: "POST", headers: getAuthHeaders(), body: formData });
      const data = await res.json();
      if (res.ok) setReviewPhotoUrl(data.url);
      else setReviewStatus({ type: "error", text: data.error || "Envoi de la photo impossible." });
    } catch {
      setReviewStatus({ type: "error", text: "Erreur de connexion au serveur." });
    } finally {
      setReviewPhotoUploading(false);
    }
  }

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewTarget) return;
    setReviewSubmitting(true);
    setReviewStatus({ type: "", text: "" });

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          teacherId: reviewTarget.teacherId,
          rating: reviewRating,
          comment: reviewComment.trim(),
          photoUrl: reviewPhotoUrl || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setReviewStatus({ type: "success", text: "Merci ! Votre avis a été publié avec succès !" });
        setReviewedTeacherIds((prev) => new Set(prev).add(reviewTarget.teacherId));
        setTimeout(() => setReviewTarget(null), 1200);
      } else {
        setReviewStatus({ type: "error", text: data.error || "Impossible de publier votre avis." });
      }
    } catch {
      setReviewStatus({ type: "error", text: "Erreur de connexion au serveur." });
    } finally {
      setReviewSubmitting(false);
    }
  }

  const now = new Date();
  const filteredBookings = bookings.filter((b) => {
    const isUpcoming = new Date(b.startsAt) >= now;
    if (bookingFilter === "UPCOMING") return isUpcoming;
    if (bookingFilter === "PAST") return !isUpcoming;
    return true;
  });

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f] dark:bg-[#0c1626] dark:text-white">
      <SiteNavbar dark={false} />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
          <div>
            <h1 className="text-3xl font-bold">Mon Apprentissage & Mes Cours</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Retrouvez vos séances en direct ainsi que vos cours et packs e-learning débloqués.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("BOOKINGS")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === "BOOKINGS" ? "bg-[#11233f] text-white" : "bg-white border border-slate-200 text-slate-700 dark:bg-white/10 dark:border-white/15 dark:text-slate-300"
              }`}
            >
               Séances Live ({bookings.length})
            </button>
            <button
              onClick={() => setActiveTab("COURSES")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === "COURSES" ? "bg-[#0d8d78] text-white" : "bg-white border border-slate-200 text-slate-700 dark:bg-white/10 dark:border-white/15 dark:text-slate-300"
              }`}
            >
               Packs & Cours ({purchasedCourses.length})
            </button>
            <Link
              href="/dashboard/replays"
              className="rounded-xl border border-[#0d8d78] bg-white px-4 py-2 text-xs font-bold text-[#0d8d78] transition hover:bg-[#e5f7f2] dark:bg-white/10 dark:border-[#72d6bf]/40 dark:text-[#72d6bf]"
            >
               🎬 Mes Replays
            </Link>
          </div>
        </div>

        {activeTab === "BOOKINGS" && (
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setBookingFilter("ALL")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                bookingFilter === "ALL" ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 dark:bg-white/10 dark:border-white/15 dark:text-slate-300"
              }`}
            >
              Toutes ({bookings.length})
            </button>
            <button
              onClick={() => setBookingFilter("UPCOMING")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                bookingFilter === "UPCOMING" ? "bg-[#0d8d78] text-white" : "bg-white border border-slate-200 text-slate-600 dark:bg-white/10 dark:border-white/15 dark:text-slate-300"
              }`}
            >
              À venir
            </button>
            <button
              onClick={() => setBookingFilter("PAST")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                bookingFilter === "PAST" ? "bg-slate-600 text-white" : "bg-white border border-slate-200 text-slate-600 dark:bg-white/10 dark:border-white/15 dark:text-slate-300"
              }`}
            >
              Passées
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0d8d78] border-t-transparent mx-auto"></div>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Chargement de votre espace...</p>
          </div>
        ) : activeTab === "BOOKINGS" ? (
          filteredBookings.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-white/10 dark:bg-white/[.05] dark:shadow-xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3 dark:bg-white/10 dark:text-slate-400">
                <IconCalendar className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-bold">Aucune séance en direct réservée.</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Choisissez un professeur et commencez votre apprentissage.</p>
              <Link
                href="/teachers"
                className="mt-5 inline-block rounded-xl bg-[#0d8d78] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b7866]"
              >
                Explorer les professeurs →
              </Link>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {filteredBookings.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 dark:border-white/10 dark:bg-white/[.05] dark:shadow-xl"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#d9f1e9] text-lg font-bold text-[#0d8d78] dark:bg-[#72d6bf]/20 dark:text-[#72d6bf]">
                      {b.teacherName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-base">{b.teacherName}</h3>
                      <p className="text-xs font-bold text-[#0d8d78] dark:text-[#72d6bf]">{b.subject}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {formatTunisiaDate(b.startsAt)} à {formatTunisiaTime(b.startsAt)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                        Durée : {b.durationMinutes} min · Tarif : {b.amountTnd} DT
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        b.status === "CONFIRMED"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
                          : b.status === "COMPLETED"
                          ? "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300"
                          : b.status === "CANCELLED"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
                      }`}
                    >
                      {BOOKING_STATUS_LABELS[b.status] ?? b.status}
                    </span>

                    {b.status === "PENDING" ? (
                      <span className="rounded-xl border border-amber-300 px-4 py-2.5 text-xs font-bold text-amber-700 dark:border-amber-500/30 dark:text-amber-300">
                        En attente du professeur
                      </span>
                    ) : b.status === "COMPLETED" ? (
                      reviewedTeacherIds.has(b.teacherId) ? (
                        <span className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-400 dark:border-white/15 dark:text-slate-500">
                          Avis publié ✓
                        </span>
                      ) : (
                        <button
                          onClick={() => openReviewModal(b)}
                          className="rounded-xl border border-[#0d8d78] px-4 py-2.5 text-xs font-bold text-[#0d8d78] transition hover:bg-[#e5f7f2] dark:border-[#72d6bf] dark:text-[#72d6bf] dark:hover:bg-white/5"
                        >
                          ⭐ Laisser un avis
                        </button>
                      )
                    ) : b.status === "CANCELLED" ? null : (
                      <Link
                        href={`/classroom/${b.id}`}
                        className="rounded-xl bg-[#0d8d78] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b7866]"
                      >
                        Rejoindre la classe →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          purchasedCourses.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-white/10 dark:bg-white/[.05] dark:shadow-xl">
              <h2 className="text-lg font-bold">Aucun pack ou cours vidéo débloqué.</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Parcourez le catalogue et débloquez des cours pour étudier à votre rythme.</p>
              <Link
                href="/courses"
                className="mt-5 inline-block rounded-xl bg-[#0d8d78] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b7866]"
              >
                Découvrir le catalogue de cours →
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {purchasedCourses.map(({ course }) => (
                <div key={course.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between space-y-4 dark:border-white/10 dark:bg-white/[.05] dark:shadow-xl">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#0d8d78] dark:text-[#72d6bf]">{course.subject}</span>
                    <h3 className="font-bold text-base text-[#11233f] dark:text-white">{course.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{course.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                    <span className="text-xs text-slate-400 dark:text-slate-500">{course.totalLessons} leçons ({course.durationMinutes} min)</span>
                    <Link
                      href={`/courses/${course.id}`}
                      className="rounded-xl bg-[#11233f] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#1a355e]"
                    >
                      Continuer l'apprentissage →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {reviewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-4 dark:bg-[#101b2d]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/10">
              <div>
                <h3 className="text-lg font-bold text-[#11233f] dark:text-white">Laisser un avis</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{reviewTarget.teacherName} · {reviewTarget.subject}</p>
              </div>
              <button
                type="button"
                onClick={() => setReviewTarget(null)}
                className="text-slate-400 hover:text-slate-600 font-bold dark:text-slate-500 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            {reviewStatus.text && (
              <div
                className={`rounded-xl p-3 text-xs font-semibold ${
                  reviewStatus.type === "success"
                    ? "bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20"
                    : "bg-rose-50 text-rose-900 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20"
                }`}
              >
                {reviewStatus.text}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Votre note (1 à 5 étoiles) *
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button type="button" key={star} onClick={() => setReviewRating(star)} className="p-1.5 focus:outline-none">
                      <IconStar className={`h-7 w-7 transition ${star <= reviewRating ? "fill-amber-400 text-amber-400 scale-110" : "text-slate-200 dark:text-slate-600"}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Votre commentaire *
                </label>
                <textarea
                  required
                  minLength={5}
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Partagez votre avis sur les cours, la pédagogie et vos résultats..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-[#0d8d78] dark:border-white/15 dark:bg-white/5 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Photo (optionnel)
                </label>
                <input type="file" ref={reviewPhotoInputRef} accept="image/*" onChange={handleReviewPhotoUpload} className="hidden" />
                {reviewPhotoUrl ? (
                  <div className="relative inline-block h-20 w-20">
                    <Image src={reviewPhotoUrl} alt="Aperçu" fill sizes="80px" className="rounded-xl object-cover border border-slate-200" />
                    <button
                      type="button"
                      onClick={() => setReviewPhotoUrl("")}
                      className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white text-xs font-bold shadow"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => reviewPhotoInputRef.current?.click()}
                    disabled={reviewPhotoUploading}
                    className="rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-500 transition hover:border-[#0d8d78] hover:text-[#0d8d78] disabled:opacity-50"
                  >
                    {reviewPhotoUploading ? "Envoi en cours..." : "+ Ajouter une photo"}
                  </button>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setReviewTarget(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="rounded-xl bg-[#0d8d78] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b7866] disabled:opacity-50"
                >
                  {reviewSubmitting ? "Publication..." : "Publier mon avis →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

