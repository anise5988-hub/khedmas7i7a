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
  userId: string;
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



export function TeacherProfileClient({ slug }: { slug: string }) {
  const [teacher, setTeacher] = useState<TeacherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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

    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setCurrentUserId(data?.user?.id || null))
      .catch(() => {});
  }, [slug]);

  const [copied, setCopied] = useState(false);

  function copyProfileLink() {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function shareWhatsApp() {
    if (typeof window !== "undefined" && teacher) {
      const text = encodeURIComponent(`Je vous recommande le professeur ${teacher.name} (${teacher.title}) sur ProfySpace.tn : ${window.location.href}`);
      window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
    }
  }

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
        <h1 className="text-2xl font-bold">Professeur introuvable</h1>
        <p className="mt-2 text-sm text-slate-500">Ce professeur n&apos;existe pas ou sa candidature est en cours d&apos;examen.</p>
        <Link href="/teachers" className="mt-6 rounded-xl bg-[#0d8d78] px-5 py-2.5 text-xs font-bold text-white">
          Explorer les professeurs vérifiés →
        </Link>
      </main>
    );
  }

  const calculatedPrice = Math.round((teacher.rateTnd * duration) / 60);
  const isOwnProfile = currentUserId !== null && currentUserId === teacher.userId;

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
    <main className="min-h-screen bg-[#0c1626] text-white">
      <header className="border-b border-white/10 bg-[#101b2d]/95 px-4 py-3 sm:py-4 sm:px-6 sticky top-0 z-30 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link href="/teachers" className="text-slate-400 hover:text-white text-xs sm:text-sm font-semibold shrink-0">
              ← Professeurs
            </Link>
            <span className="text-slate-600">/</span>
            <span className="font-bold text-xs sm:text-sm truncate text-white">{teacher.name}</span>
          </div>
          <Link href="/" className="flex items-center gap-1 font-[family-name:var(--font-dm-sans)] text-lg sm:text-xl font-bold tracking-tight shrink-0 text-white">
            <span>ProfySpace</span>
            <span className="rounded-md bg-[#0d8d78] px-1.5 py-0.5 text-[10px] sm:text-xs font-extrabold text-white">.tn</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-8 lg:px-10 pb-28 lg:pb-12">
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <div className="space-y-4 sm:space-y-6">
            {/* Premium Profile Header */}
            <div className="rounded-3xl border border-white/15 bg-[#101b2d] p-4 sm:p-8 shadow-xl">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                {/* Mobile Top Row: Avatar + Rating */}
                <div className="flex items-start justify-between sm:block">
                  <div className="relative shrink-0">
                    <div className="flex h-20 w-20 sm:h-28 sm:w-28 items-center justify-center rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#72d6bf] to-[#0d8d78] text-2xl sm:text-3xl font-bold text-[#11233f] overflow-hidden shadow-md">
                      {teacher.avatarUrl ? (
                        <img src={teacher.avatarUrl} alt={teacher.name} className="h-full w-full object-cover" />
                      ) : (
                        <span>{teacher.initials}</span>
                      )}
                    </div>
                    {teacher.online && (
                      <span className="absolute bottom-1 right-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-emerald-400 ring-2 ring-[#101b2d] shadow-sm" title="En ligne">
                        <span className="sr-only">En ligne</span>
                      </span>
                    )}
                  </div>

                  {/* Rating Badge shown on top-right on mobile */}
                  <div className="sm:hidden shrink-0 rounded-2xl bg-amber-400/15 border border-amber-400/30 p-2.5 text-center min-w-[70px]">
                    <span className="flex items-center justify-center gap-1 text-base font-black text-amber-300">
                      <IconStar className="h-4 w-4 fill-amber-400 text-amber-400" />
                      {teacher.rating.toFixed(1)}
                    </span>
                    <span className="block text-[10px] font-semibold text-amber-200">{teacher.reviewsCount} avis</span>
                  </div>
                </div>

                <div className="flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl sm:text-3xl font-bold text-white">{teacher.name}</h1>
                    {teacher.verificationStatus === "APPROVED" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#72d6bf]/15 border border-[#72d6bf]/30 px-2.5 py-0.5 text-[11px] sm:text-xs font-bold text-[#72d6bf]">
                        <IconCheckCircle className="h-3.5 w-3.5 text-[#72d6bf]" />
                        Vérifié
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm sm:text-base text-[#72d6bf] font-semibold">{teacher.title}</p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                    <span className="inline-flex items-center gap-1">
                      <MapPinIcon />
                      {teacher.city ? `${teacher.city}, ${teacher.governorate}` : teacher.governorate || "Tunisie"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ClockIcon />
                      {teacher.experienceYears} ans d&apos;expérience
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {teacher.online && (
                      <span className="inline-flex items-center gap-1 rounded-xl bg-[#72d6bf]/15 border border-[#72d6bf]/30 px-2.5 py-1 text-xs font-bold text-[#72d6bf]">
                        <GlobeIcon />
                        En ligne
                      </span>
                    )}
                    {teacher.inPerson && (
                      <span className="inline-flex items-center gap-1 rounded-xl bg-white/10 border border-white/20 px-2.5 py-1 text-xs font-bold text-slate-200">
                        <UsersIcon />
                        Présentiel
                      </span>
                    )}
                  </div>
                </div>

                {/* Rating Box on Desktop */}
                <div className="hidden sm:block shrink-0 rounded-2xl bg-amber-400/15 border border-amber-400/30 p-4 text-center min-w-[100px] self-start">
                  <span className="flex items-center justify-center gap-1 text-xl font-bold text-amber-300">
                    <IconStar className="h-5 w-5 fill-amber-400 text-amber-400" />
                    {teacher.rating.toFixed(1)}
                  </span>
                  <span className="block text-xs text-amber-200 mt-0.5">{teacher.reviewsCount} avis</span>
                </div>
              </div>

              {isOwnProfile && (
                <div className="mt-5 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-xs font-semibold text-slate-300">
                  Ceci est votre profil public — c&apos;est ainsi que les élèves vous voient. Vous ne pouvez pas réserver ou vous
                  envoyer un message à vous-même.
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-5 sm:mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                {!isOwnProfile && (
                  <button
                    onClick={() => bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0d8d78] py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-[#0d8d78]/25 transition hover:bg-[#0b7866] active:scale-95"
                  >
                    <IconCalendar className="h-4 w-4" />
                    Réserver une séance
                  </button>
                )}
                <button
                  onClick={() => availabilitiesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#72d6bf]/40 bg-[#72d6bf]/15 py-3.5 text-center text-sm font-bold text-[#72d6bf] transition hover:bg-[#72d6bf]/25 active:scale-95"
                >
                  <ClockIcon />
                  Disponibilités
                </button>
                {!isOwnProfile && (
                <Link
                  href={`/dashboard/messages?teacherId=${teacher.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 py-3.5 text-center text-sm font-bold text-white transition hover:bg-white/15 active:scale-95"
                >
                  <MessageIcon />
                  Envoyer un message
                </Link>
                )}
              </div>

              {/* Social Share Bar */}
              <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-400 font-medium">Recommander ce prof :</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={copyProfileLink}
                    className="inline-flex items-center gap-1 rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 font-bold text-slate-200 hover:bg-white/10 transition active:scale-95"
                  >
                    {copied ? "✓ Copié !" : "📋 Copier le lien"}
                  </button>
                  <button
                    type="button"
                    onClick={shareWhatsApp}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#25D366]/20 border border-[#25D366]/40 px-3 py-1.5 font-bold text-[#25D366] hover:bg-[#25D366]/30 transition active:scale-95"
                  >
                    💬 WhatsApp
                  </button>
                </div>
              </div>
            </div>

            {/* About Section */}
            <div className="rounded-3xl border border-white/15 bg-[#101b2d] p-5 sm:p-8 shadow-xl">
              <h2 className="text-lg sm:text-xl font-bold text-white">À propos</h2>
              <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm leading-relaxed text-slate-300 whitespace-pre-line">
                {teacher.bio}
              </p>
            </div>

            {/* Quick Info Card */}
            <div className="rounded-3xl border border-white/15 bg-[#101b2d] p-5 sm:p-8 shadow-xl">
              <h2 className="text-lg sm:text-xl font-bold text-white">Informations rapides</h2>
              <div className="mt-3.5 sm:mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                <div className="rounded-2xl bg-[#162844] p-3 sm:p-4 text-center border border-white/10">
                  <span className="block text-[11px] sm:text-xs text-slate-400 mb-0.5">Expérience</span>
                  <strong className="text-xs sm:text-sm font-bold text-white">{teacher.experienceYears} ans</strong>
                </div>
                <div className="rounded-2xl bg-[#162844] p-3 sm:p-4 text-center border border-white/10">
                  <span className="block text-[11px] sm:text-xs text-slate-400 mb-0.5">Tarif horaire</span>
                  <strong className="text-xs sm:text-sm font-bold text-[#72d6bf]">{teacher.rateTnd} DT / h</strong>
                </div>
                <div className="rounded-2xl bg-[#162844] p-3 sm:p-4 text-center border border-white/10">
                  <span className="block text-[11px] sm:text-xs text-slate-400 mb-0.5">Format</span>
                  <strong className="text-xs sm:text-sm font-bold text-white">
                    {teacher.online && teacher.inPerson ? "En ligne & Présentiel" : teacher.online ? "En ligne" : "Présentiel"}
                  </strong>
                </div>
                <div className="rounded-2xl bg-[#162844] p-3 sm:p-4 text-center border border-white/10">
                  <span className="block text-[11px] sm:text-xs text-slate-400 mb-0.5">Classe virtuelle</span>
                  <strong className="text-xs sm:text-sm font-bold text-[#72d6bf]">WebRTC Direct</strong>
                </div>
              </div>
            </div>

            {/* Specialties / Subjects */}
            {teacher.subjects.length > 0 && (
              <div className="rounded-3xl border border-white/15 bg-[#101b2d] p-5 sm:p-8 shadow-xl">
                <h2 className="text-lg sm:text-xl font-bold text-white">Spécialités</h2>
                <div className="mt-3 sm:mt-4 flex flex-wrap gap-2">
                  {teacher.subjects.map((s) => (
                    <span key={s} className="rounded-xl bg-[#72d6bf]/15 border border-[#72d6bf]/30 px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold text-[#72d6bf]">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Availabilities */}
            <div ref={availabilitiesRef} className="rounded-3xl border border-white/15 bg-[#101b2d] p-5 sm:p-8 shadow-xl">
              <h2 className="text-lg sm:text-xl font-bold text-white">Créneaux habituels de disponibilité</h2>
              <p className="mt-1 text-xs text-slate-400">Heures régulières durant lesquelles le professeur dispense ses cours.</p>

              {teacher.availabilities.length === 0 ? (
                <p className="mt-4 text-xs text-slate-400">Disponibilités flexibles sur demande.</p>
              ) : (
                <div className="mt-3.5 sm:mt-4 grid gap-2 sm:grid-cols-2">
                  {teacher.availabilities.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-xl bg-[#162844] p-3 text-xs border border-white/10">
                      <span className="font-bold text-white">{dayNames[a.dayOfWeek]}</span>
                      <span className="font-semibold text-[#72d6bf]">{a.startTime} – {a.endTime}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reviews */}
            <div className="rounded-3xl border border-white/15 bg-[#101b2d] p-5 sm:p-8 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">Avis des élèves ({teacher.reviewsCount})</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Évaluations certifiées après chaque séance</p>
                </div>
                <span className="font-bold text-[#72d6bf] text-base sm:text-lg"> {teacher.rating.toFixed(1)} / 5</span>
              </div>

              {teacher.reviews.length === 0 ? (
                <div className="py-6 sm:py-8 text-center text-xs text-slate-400">
                  Nouveau professeur vérifié. Soyez le premier à réserver et à donner votre avis !
                </div>
              ) : (
                <div className="mt-3 sm:mt-4 space-y-0">
                  {teacher.reviews.map((r) => (
                    <div key={r.id} className="py-3 sm:py-4 border-b border-white/5 last:border-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#72d6bf]/20 text-xs font-bold text-[#72d6bf] border border-[#72d6bf]/30">
                            {r.studentName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-bold text-xs sm:text-sm text-white">{r.studentName}</span>
                        </div>
                        <span className="text-xs font-bold text-amber-300"> {r.rating}/5</span>
                      </div>
                      {r.comment && <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">{r.comment}</p>}
                      <span className="mt-1.5 block text-[10px] sm:text-[11px] text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString("fr-TN", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Booking Sidebar */}
          <div ref={bookingRef} id="booking-section">
            <div className="sticky top-20 rounded-3xl border border-white/15 bg-[#101b2d] p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Tarif horaire</span>
                  <p className="mt-0.5 sm:mt-1 text-2xl sm:text-3xl font-bold text-[#72d6bf]">
                    {teacher.rateTnd} DT <span className="text-xs sm:text-sm font-normal text-slate-400">/ heure</span>
                  </p>
                </div>
                <div className="rounded-xl bg-amber-400/15 border border-amber-400/30 px-3 py-1.5 sm:py-2 text-center">
                  <span className="flex items-center justify-center gap-1 text-xs sm:text-sm font-bold text-amber-300">
                    <IconStar className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-amber-400 text-amber-400" />
                    {teacher.rating.toFixed(1)}
                  </span>
                  <span className="block text-[10px] sm:text-[11px] text-amber-200">{teacher.reviewsCount} avis</span>
                </div>
              </div>

              {!isOwnProfile && (
              <div className="space-y-1.5">
                <a
                  href={`/dashboard/messages?teacherId=${teacher.id}`}
                  className="flex items-center justify-center gap-2 w-full rounded-2xl border border-[#72d6bf]/40 bg-[#72d6bf]/15 py-2.5 sm:py-3 text-center text-xs font-bold text-[#72d6bf] transition hover:bg-[#72d6bf]/25 active:scale-95"
                >
                  <MessageIcon />
                  Envoyer un message
                </a>
                <p className="text-[10px] sm:text-[11px] text-slate-400 text-center">Pour une offre spécifique ou un cours personnalisé</p>
              </div>
              )}

              {bookingResult && (
                <div
                  className={`rounded-2xl p-4 text-xs font-semibold ${
                    bookingResult.success
                      ? "border border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                      : "border border-rose-400/30 bg-rose-500/10 text-rose-300"
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
                      className="mt-2 inline-block font-bold text-[#72d6bf] underline"
                    >
                      Se connecter maintenant →
                    </a>
                  )}
                </div>
              )}

              {isOwnProfile ? (
                <p className="border-t border-white/10 pt-4 text-xs text-slate-400 text-center">
                  Vous ne pouvez pas réserver une séance sur votre propre profil.
                </p>
              ) : (
              <form onSubmit={handleBook} className="space-y-4 border-t border-white/10 pt-4">
                <h3 className="font-bold text-sm sm:text-base text-white">Réserver une séance</h3>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-300 uppercase mb-1.5">Durée du cours</label>
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    {([30, 60, 90, 120] as const).map((d) => (
                      <button
                        type="button"
                        key={d}
                        onClick={() => setDuration(d)}
                        className={`rounded-xl border py-2 sm:py-2.5 text-xs font-bold transition active:scale-95 ${
                          duration === d
                            ? "border-[#72d6bf] bg-[#72d6bf]/20 text-[#72d6bf]"
                            : "border-white/20 bg-[#162844] text-slate-300 hover:border-white/40"
                        }`}
                      >
                        {d} min
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-300 uppercase mb-1.5">Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!teacher.online}
                      onClick={() => setMode("ONLINE")}
                      className={`rounded-xl border p-2.5 text-xs font-bold transition active:scale-95 disabled:opacity-30 ${
                        mode === "ONLINE"
                          ? "border-[#72d6bf] bg-[#72d6bf]/20 text-[#72d6bf]"
                          : "border-white/20 bg-[#162844] text-slate-300"
                      }`}
                    >
                       💻 En ligne
                    </button>
                    <button
                      type="button"
                      disabled={!teacher.inPerson}
                      onClick={() => setMode("IN_PERSON")}
                      className={`rounded-xl border p-2.5 text-xs font-bold transition active:scale-95 disabled:opacity-30 ${
                        mode === "IN_PERSON"
                          ? "border-[#72d6bf] bg-[#72d6bf]/20 text-[#72d6bf]"
                          : "border-white/20 bg-[#162844] text-slate-300"
                      }`}
                    >
                       🏫 Présentiel
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-slate-300 uppercase mb-1">Date</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split("T")[0]}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full rounded-xl border border-white/20 bg-[#162844] p-2.5 text-xs text-white outline-none focus:border-[#72d6bf] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-slate-300 uppercase mb-1">Heure</label>
                    <input
                      type="time"
                      required
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-full rounded-xl border border-white/20 bg-[#162844] p-2.5 text-xs text-white outline-none focus:border-[#72d6bf] transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-300 uppercase mb-1.5">Créneaux suggérés</label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    {timeSlots.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTime(t)}
                        className={`rounded-lg border py-1.5 text-[11px] font-bold transition active:scale-95 ${
                          selectedTime === t
                            ? "border-[#72d6bf] bg-[#72d6bf]/20 text-[#72d6bf]"
                            : "border-white/20 bg-[#162844] text-slate-300 hover:border-white/40"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-[#162844] p-3.5 sm:p-4 text-xs space-y-2 border border-white/10">
                  <div className="flex justify-between text-slate-300">
                    <span>Durée sélectionnée :</span>
                    <span className="font-bold text-white">{duration} minutes</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Tarif appliqué :</span>
                    <span className="font-bold text-white">{teacher.rateTnd} DT / heure</span>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-sm text-white">
                    <span>Total à régler :</span>
                    <span className="text-[#72d6bf] text-base font-black">{calculatedPrice} DT</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="flex items-center justify-center gap-2 w-full rounded-2xl bg-[#0d8d78] py-3.5 sm:py-4 text-center font-bold text-white shadow-lg shadow-[#0d8d78]/25 transition hover:bg-[#0b7866] active:scale-95 disabled:opacity-50"
                >
                  <IconCalendar className="h-4 w-4" />
                  <span>{bookingLoading ? "Réservation en cours..." : `Confirmer (${calculatedPrice} DT) →`}</span>
                </button>
              </form>
              )}

              {!isOwnProfile && (
              <div className="flex items-center justify-center gap-1.5 text-center text-[10px] sm:text-[11px] text-slate-400 pt-1">
                <IconShield className="h-3.5 w-3.5 text-[#72d6bf]" />
                <span>Paiement sécurisé · ProfySpace.tn</span>
              </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Booking Action Bar for Mobile Viewports */}
      {!isOwnProfile && (
        <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-[#101b2d]/95 backdrop-blur-lg border-t border-white/15 px-4 py-3 shadow-2xl">
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <div>
              <p className="text-xs text-slate-400 font-medium leading-none">Tarif horaire</p>
              <p className="text-lg font-black text-[#72d6bf] mt-0.5">
                {teacher.rateTnd} DT <span className="text-[11px] font-normal text-slate-400">/ h</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`/dashboard/messages?teacherId=${teacher.id}`}
                className="rounded-2xl border border-[#72d6bf]/40 bg-[#72d6bf]/15 p-2.5 text-[#72d6bf] transition hover:bg-[#72d6bf]/25 active:scale-95"
                aria-label="Discuter"
              >
                <MessageIcon />
              </a>
              <button
                type="button"
                onClick={() => {
                  bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="rounded-2xl bg-[#0d8d78] px-5 py-3 text-xs font-bold text-white shadow-md shadow-[#0d8d78]/25 transition hover:bg-[#0b7866] active:scale-95 flex items-center gap-1.5"
              >
                <IconCalendar className="h-4 w-4" />
                <span>Réserver maintenant</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
