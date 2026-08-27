/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  IconStar,
  IconShield,
  IconCalendar,
  IconCheckCircle,
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

const timeSlots = [
  "08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00",
];

function getTomorrowDateString() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

function MapPinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20Z" />
      <path d="M2 12h20" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function AwardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  );
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

  const bookingRef = useRef<HTMLDivElement>(null);
  const availabilitiesRef = useRef<HTMLDivElement>(null);

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
        <p className="mt-2 text-sm text-slate-500">Ce professeur n&apos;existe pas ou sa candidature est en cours d&apos;examen.</p>
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

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <div className="space-y-6">
            {/* Premium Profile Header */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="relative mx-auto sm:mx-0 shrink-0">
                  <div className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-3xl bg-[#d9f1e9] text-3xl font-bold text-[#0d8d78] overflow-hidden border-2 border-[#0d8d78]/20 shadow-sm">
                    {teacher.avatarUrl ? (
                      <img src={teacher.avatarUrl} alt={teacher.name} className="h-full w-full object-cover" />
                    ) : (
                      <span>{teacher.initials}</span>
                    )}
                  </div>
                  {teacher.online && (
                    <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 border-2 border-white shadow-sm">
                      <span className="sr-only">En ligne</span>
                    </span>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#11233f]">{teacher.name}</h1>
                    {teacher.verificationStatus === "APPROVED" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-xs font-bold text-emerald-800 mx-auto sm:mx-0">
                        <IconCheckCircle className="h-3.5 w-3.5" />
                        Professeur Vérifié
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-base text-[#0d8d78] font-semibold">{teacher.title}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <MapPinIcon />
                      {teacher.city ? `${teacher.city}, ${teacher.governorate}` : teacher.governorate}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ClockIcon />
                      {teacher.experienceYears} ans d&apos;expérience
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    {teacher.online && (
                      <span className="inline-flex items-center gap-1 rounded-xl bg-[#e5f7f2] border border-[#0d8d78]/20 px-3 py-1 text-xs font-bold text-[#0d8d78]">
                        <GlobeIcon />
                        En ligne
                      </span>
                    )}
                    {teacher.inPerson && (
                      <span className="inline-flex items-center gap-1 rounded-xl bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-800">
                        <UsersIcon />
                        Présentiel
                      </span>
                    )}
                  </div>
                </div>

                <div className="mx-auto sm:mx-0 shrink-0 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-center min-w-[100px]">
                  <span className="flex items-center justify-center gap-1 text-xl font-bold text-amber-900">
                    <IconStar className="h-5 w-5 fill-amber-500 text-amber-500" />
                    {teacher.rating.toFixed(1)}
                  </span>
                  <span className="block text-xs text-amber-800 mt-0.5">{teacher.reviewsCount} avis</span>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0d8d78] py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-[#0d8d78]/20 transition hover:bg-[#0b7866]"
                >
                  <IconCalendar className="h-4 w-4" />
                  Réserver une séance
                </button>
                <button
                  onClick={() => availabilitiesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-[#0d8d78] bg-[#e5f7f2] py-3.5 text-center text-sm font-bold text-[#0d8d78] transition hover:bg-[#d4f2e9]"
                >
                  <ClockIcon />
                  Voir les disponibilités
                </button>
                <Link
                  href={`/dashboard/messages?teacherId=${teacher.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white py-3.5 text-center text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <MessageIcon />
                  Envoyer un message
                </Link>
              </div>
            </div>

            {/* About Section */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-bold text-[#11233f]">À propos</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 whitespace-pre-line">
                {teacher.bio}
              </p>
            </div>

            {/* Quick Info Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-bold text-[#11233f]">Informations rapides</h2>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4 text-center border border-slate-100">
                  <span className="block text-xs text-slate-400 mb-1">Expérience</span>
                  <strong className="text-sm font-bold text-[#11233f]">{teacher.experienceYears} ans</strong>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 text-center border border-slate-100">
                  <span className="block text-xs text-slate-400 mb-1">Tarif horaire</span>
                  <strong className="text-sm font-bold text-[#0d8d78]">{teacher.rateTnd} DT</strong>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 text-center border border-slate-100">
                  <span className="block text-xs text-slate-400 mb-1">Format</span>
                  <strong className="text-sm font-bold text-[#11233f]">
                    {teacher.online && teacher.inPerson ? "En ligne & Présentiel" : teacher.online ? "En ligne" : "Présentiel"}
                  </strong>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 text-center border border-slate-100">
                  <span className="block text-xs text-slate-400 mb-1">Classe virtuelle</span>
                  <strong className="text-sm font-bold text-[#0d8d78]">WebRTC Direct</strong>
                </div>
              </div>
            </div>

            {/* Specialties / Subjects */}
            {teacher.subjects.length > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-xl font-bold text-[#11233f]">Spécialités</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {teacher.subjects.map((s) => (
                    <span key={s} className="rounded-xl bg-[#e5f7f2] border border-[#0d8d78]/10 px-4 py-2 text-xs font-bold text-[#0d8d78]">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Availabilities */}
            <div ref={availabilitiesRef} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-bold text-[#11233f]">Créneaux habituels de disponibilité</h2>
              <p className="mt-1 text-xs text-slate-500">Heures régulières durant lesquelles le professeur dispense ses cours.</p>

              {teacher.availabilities.length === 0 ? (
                <p className="mt-4 text-xs text-slate-400">Disponibilités flexibles sur demande.</p>
              ) : (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {teacher.availabilities.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs border border-slate-100">
                      <span className="font-bold text-[#11233f]">{dayNames[a.dayOfWeek]}</span>
                      <span className="font-semibold text-[#0d8d78]">{a.startTime} – {a.endTime}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reviews */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-[#11233f]">Avis des élèves ({teacher.reviewsCount})</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Évaluations certifiées après chaque séance</p>
                </div>
                <span className="font-bold text-[#0d8d78] text-lg">★ {teacher.rating.toFixed(1)} / 5</span>
              </div>

              {teacher.reviews.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Nouveau professeur vérifié. Soyez le premier à réserver et à donner votre avis !
                </div>
              ) : (
                <div className="mt-4 space-y-0">
                  {teacher.reviews.map((r) => (
                    <div key={r.id} className="py-4 border-b border-slate-50 last:border-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e5f7f2] text-xs font-bold text-[#0d8d78]">
                            {r.studentName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-bold text-sm text-[#11233f]">{r.studentName}</span>
                        </div>
                        <span className="text-xs font-bold text-amber-700">★ {r.rating}/5</span>
                      </div>
                      {r.comment && <p className="mt-2 text-sm text-slate-600 leading-relaxed">{r.comment}</p>}
                      <span className="mt-1.5 block text-[11px] text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString("fr-TN", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Booking Sidebar */}
          <div ref={bookingRef}>
            <div className="sticky top-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tarif horaire</span>
                  <p className="mt-1 text-3xl font-bold text-[#0d8d78]">
                    {teacher.rateTnd} DT <span className="text-sm font-normal text-slate-500">/ heure</span>
                  </p>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-center">
                  <span className="flex items-center justify-center gap-1 text-sm font-bold text-amber-900">
                    <IconStar className="h-4 w-4 fill-amber-500 text-amber-500" />
                    {teacher.rating.toFixed(1)}
                  </span>
                  <span className="block text-[11px] text-amber-800">{teacher.reviewsCount} avis</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <a
                  href={`/dashboard/messages?teacherId=${teacher.id}`}
                  className="flex items-center justify-center gap-2 w-full rounded-2xl border-2 border-[#0d8d78] bg-[#e5f7f2] py-3 text-center text-xs font-bold text-[#0d8d78] transition hover:bg-[#d4f2e9]"
                >
                  <MessageIcon />
                  Envoyer un message
                </a>
                <p className="text-[11px] text-slate-400 text-center">Pour une offre spécifique ou un cours personnalisé</p>
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

              <form onSubmit={handleBook} className="space-y-4 border-t border-slate-100 pt-5">
                <h3 className="font-bold text-base text-[#11233f]">Réserver une séance</h3>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Durée du cours</label>
                  <div className="grid grid-cols-4 gap-2">
                    {([30, 60, 90, 120] as const).map((d) => (
                      <button
                        type="button"
                        key={d}
                        onClick={() => setDuration(d)}
                        className={`rounded-xl border py-2.5 text-xs font-bold transition ${
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
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Format</label>
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
                      🌐 En ligne
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
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Date</label>
                    <input
                      type="date"
                      required
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-[#0d8d78] focus:ring-1 focus:ring-[#0d8d78] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Heure</label>
                    <input
                      type="time"
                      required
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-[#0d8d78] focus:ring-1 focus:ring-[#0d8d78] transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Créneaux suggérés</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {timeSlots.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTime(t)}
                        className={`rounded-lg border py-1.5 text-[11px] font-bold transition ${
                          selectedTime === t
                            ? "border-[#0d8d78] bg-[#e5f7f2] text-[#0d8d78]"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 text-xs space-y-2 border border-slate-100">
                  <div className="flex justify-between text-slate-500">
                    <span>Durée sélectionnée :</span>
                    <span className="font-bold text-[#11233f]">{duration} minutes</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Tarif appliqué :</span>
                    <span className="font-bold text-[#11233f]">{teacher.rateTnd} DT / heure</span>
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

              <div className="flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400 pt-1">
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
