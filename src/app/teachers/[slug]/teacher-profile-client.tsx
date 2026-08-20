
/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  IconStar,
  IconShield,
  IconCalendar,
} from "@/components/icons";

type TeacherData = {
  id: string;
  slug: string;
  avatarUrl?: string | null;
  name: string;
  initials: string;
  title: string;
  bio: string;
  experienceYears: number;
  hourlyRateMillimes: number;
  rateTnd: number;
  governorate: string;
  city: string;
  online: boolean;
  inPerson: boolean;
  verificationStatus: string;
  subjects: string[];
  rating: number;
  reviewsCount: number;
  availabilities: { id: string; dayOfWeek: number; startTime: string; endTime: string }[];
  reviews: { id: string; studentName: string; rating: number; comment: string | null; createdAt: string }[];
};

const dayNames = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function getTomorrowDateString() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

export function TeacherProfileClient({ slug }: { slug: string }) {
  const [teacher, setTeacher] = useState<TeacherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [duration, setDuration] = useState<30 | 60 | 90 | 120>(60);
  const [mode, setMode] = useState<"ONLINE" | "IN_PERSON">("ONLINE");
  const [selectedDate, setSelectedDate] = useState(getTomorrowDateString);
  const [selectedTime, setSelectedTime] = useState("18:00");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingResult, setBookingResult] = useState<{ success: boolean; message: string; bookingId?: string } | null>(null);

  useEffect(() => {
    fetch(`/api/teachers/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Professeur introuvable");
        return res.json();
      })
      .then((data) => {
        setTeacher(data);
        if (!data.online && data.inPerson) setMode("IN_PERSON");
      })
      .catch((err) => {
        setError(err.message || "Impossible de charger le professeur");
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0d8d78] border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm font-semibold text-slate-600">Chargement du profil...</p>
        </div>
      </main>
    );
  }

  if (error || !teacher) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#f8fafc] px-4 text-center">
        <span className="text-4xl">👨‍🏫</span>
        <h1 className="mt-4 text-2xl font-bold">Professeur introuvable</h1>
        <p className="mt-2 text-sm text-slate-500">Ce professeur n'existe pas ou sa candidature est en cours d'examen.</p>
        <Link href="/teachers" className="mt-6 rounded-xl bg-[#0d8d78] px-5 py-2.5 text-xs font-bold text-white">
          Explorer les professeurs vérifiés →
        </Link>
      </main>
    );
  }

  const calculatedPrice = Math.round((teacher.rateTnd * duration) / 60);

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    setBookingLoading(true);
    setBookingResult(null);

    const startsAtIso = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: teacher?.id,
          startsAt: startsAtIso,
          durationMinutes: duration,
          amountInMillimes: calculatedPrice * 1000,
          mode,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setBookingResult({
          success: true,
          message: data.message || "Séance réservée avec succès !",
          bookingId: data.bookingId,
        });
      } else {
        if (res.status === 401) {
          setBookingResult({
            success: false,
            message: "Veuillez vous connecter avec votre compte élève pour confirmer votre réservation.",
          });
        } else {
          setBookingResult({
            success: false,
            message: data.error || "Impossible de réserver ce créneau.",
          });
        }
      }
    } catch {
      setBookingResult({
        success: false,
        message: "Erreur de connexion au serveur.",
      });
    } finally {
      setBookingLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/teachers" className="text-slate-500 hover:text-slate-800 text-sm font-semibold">
              ← Tous les professeurs
            </Link>
            <span className="text-slate-300">/</span>
            <span className="font-bold text-sm">{teacher.name}</span>
          </div>
          <Link href="/" className="flex items-center gap-1 font-[family-name:var(--font-dm-sans)] text-xl font-bold tracking-tight">
            <span>ProfySpace</span>
            <span className="rounded-md bg-[#0d8d78] px-1.5 py-0.5 text-xs font-extrabold text-white">.tn</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-[#d9f1e9] text-2xl font-bold text-[#0d8d78] overflow-hidden border-2 border-[#0d8d78]/20 shadow-sm">
                  {teacher.avatarUrl ? (
                    <img src={teacher.avatarUrl} alt={teacher.name} className="h-full w-full object-cover" />
                  ) : (
                    <span>{teacher.initials}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-bold">{teacher.name}</h1>
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-xs font-bold text-emerald-800">
                      ✓ Vérifié Admin
                    </span>
                  </div>
                  <p className="mt-1 text-base text-[#0d8d78] font-semibold">{teacher.title}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    📍 {teacher.city ? `${teacher.city}, ${teacher.governorate}` : teacher.governorate} · 🎓 {teacher.experienceYears} ans d'expérience
                  </p>
                </div>

                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-center min-w-[85px]">
                  <span className="flex items-center justify-center gap-1 text-lg font-bold text-amber-900">
                    <IconStar className="h-4 w-4 fill-amber-500 text-amber-500" />
                    {teacher.rating.toFixed(1)}
                  </span>
                  <span className="block text-xs text-amber-800">{teacher.reviewsCount} avis</span>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Matières enseignées</p>
                <div className="flex flex-wrap gap-2">
                  {teacher.subjects.map((s) => (
                    <span key={s} className="rounded-xl bg-[#e5f7f2] px-3 py-1 text-xs font-bold text-[#0d8d78]">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 space-y-4">
              <h2 className="text-xl font-bold">À propos & Pédagogie</h2>
              <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">
                {teacher.bio}
              </p>

              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-slate-100 pt-4">
                <div className="rounded-2xl bg-slate-50 p-3 text-center">
                  <span className="block text-xs text-slate-400">Expérience</span>
                  <strong className="mt-1 block text-sm">{teacher.experienceYears} ans</strong>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 text-center">
                  <span className="block text-xs text-slate-400">Format de cours</span>
                  <strong className="mt-1 block text-sm">
                    {teacher.online && teacher.inPerson ? "En ligne & Présentiel" : teacher.online ? "En ligne" : "Présentiel"}
                  </strong>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 text-center col-span-2 sm:col-span-1">
                  <span className="block text-xs text-slate-400">Classe virtuelle</span>
                  <strong className="mt-1 block text-sm text-[#0d8d78]">WebRTC Direct</strong>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-bold">Créneaux habituels de disponibilité</h2>
              <p className="mt-1 text-xs text-slate-500">Heures régulières durant lesquelles le professeur dispense ses cours.</p>

              {teacher.availabilities.length === 0 ? (
                <p className="mt-4 text-xs text-slate-400">Disponibilités flexibles sur demande.</p>
              ) : (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {teacher.availabilities.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs">
                      <span className="font-bold">{dayNames[a.dayOfWeek]}</span>
                      <span className="font-semibold text-[#0d8d78]">{a.startTime} – {a.endTime}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold">Avis des élèves ({teacher.reviewsCount})</h2>
                  <p className="text-xs text-slate-400">Évaluations certifiées après chaque séance</p>
                </div>
                <span className="font-bold text-[#0d8d78]">★ {teacher.rating.toFixed(1)} / 5</span>
              </div>

              {teacher.reviews.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Nouveau professeur vérifié. Soyez le premier à réserver et à donner votre avis !
                </div>
              ) : (
                <div className="mt-4 divide-y divide-slate-100">
                  {teacher.reviews.map((r) => (
                    <div key={r.id} className="py-4">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{r.studentName}</span>
                        <span className="text-xs font-bold text-amber-700">★ {r.rating}/5</span>
                      </div>
                      {r.comment && <p className="mt-1 text-xs text-slate-600">{r.comment}</p>}
                      <span className="mt-1 block text-[10px] text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString("fr-TN")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="sticky top-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tarif horaire</span>
                <p className="mt-1 text-3xl font-bold text-[#0d8d78]">
                  {teacher.rateTnd} DT <span className="text-sm font-normal text-slate-500">/ heure</span>
                </p>
              </div>

              {bookingResult && (
                <div
                  className={`rounded-2xl p-4 text-xs font-semibold ${
                    bookingResult.success
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border border-rose-200 bg-rose-50 text-rose-900"
                  }`}
                >
                  <p>{bookingResult.message}</p>
                  {bookingResult.bookingId && (
                    <a
                      href={`/classroom/${bookingResult.bookingId}`}
                      className="mt-3 block rounded-xl bg-[#0d8d78] py-2 text-center font-bold text-white transition hover:bg-[#0b7866]"
                    >
                      Entrer dans la salle du cours →
                    </a>
                  )}
                  {!bookingResult.success && bookingResult.message.includes("connecter") && (
                    <a
                      href={`/login?redirect=/teachers/${teacher.slug}`}
                      className="mt-2 inline-block font-bold text-slate-900 underline"
                    >
                      Se connecter maintenant →
                    </a>
                  )}
                </div>
              )}

              <form onSubmit={handleBook} className="space-y-4 border-t border-slate-100 pt-4">
                <h3 className="font-bold text-base">Réserver une séance</h3>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Durée du cours</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {([30, 60, 90, 120] as const).map((d) => (
                      <button
                        type="button"
                        key={d}
                        onClick={() => setDuration(d)}
                        className={`rounded-xl border py-2 text-xs font-bold transition ${
                          duration === d
                            ? "border-[#0d8d78] bg-[#e5f7f2] text-[#0d8d78]"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        {d} min
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!teacher.online}
                      onClick={() => setMode("ONLINE")}
                      className={`rounded-xl border p-2.5 text-xs font-bold transition disabled:opacity-30 ${
                        mode === "ONLINE"
                          ? "border-[#0d8d78] bg-[#e5f7f2] text-[#0d8d78]"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      🌐 En ligne (WebRTC)
                    </button>
                    <button
                      type="button"
                      disabled={!teacher.inPerson}
                      onClick={() => setMode("IN_PERSON")}
                      className={`rounded-xl border p-2.5 text-xs font-bold transition disabled:opacity-30 ${
                        mode === "IN_PERSON"
                          ? "border-[#0d8d78] bg-[#e5f7f2] text-[#0d8d78]"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      🏠 Présentiel
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Heure</label>
                    <input
                      type="time"
                      required
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 text-xs space-y-1.5 border border-slate-100">
                  <div className="flex justify-between text-slate-500">
                    <span>Durée :</span>
                    <span>{duration} minutes</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Tarif appliqué :</span>
                    <span>{teacher.rateTnd} DT / heure</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-[#11233f]">
                    <span>Total à régler :</span>
                    <span className="text-[#0d8d78] text-base">{calculatedPrice} DT</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="flex items-center justify-center gap-2 w-full rounded-2xl bg-[#0d8d78] py-4 text-center font-bold text-white shadow-lg shadow-[#0d8d78]/20 transition hover:bg-[#0b7866] disabled:opacity-50"
                >
                  <IconCalendar className="h-4 w-4" />
                  <span>{bookingLoading ? "Réservation en cours..." : `Confirmer et Réserver (${calculatedPrice} DT) →`}</span>
                </button>
              </form>

              <div className="flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
                <IconShield className="h-3.5 w-3.5 text-[#0d8d78]" />
                <span>Paiement sécurisé par Wallet ProfySpace.tn ou règlement direct</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
