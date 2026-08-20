/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { useEffect, useState } from "react";
import { formatTndFromMillimes } from "@/lib/finance/withdrawal";
import {
  IconCalendar,
  IconClock,
  IconCreditCard,
} from "@/components/icons";


type TeacherData = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string | null;
  bio: string | null;
  experienceYears: number;
  hourlyRateMillimes: number;
  hourlyRateTnd: number;
  governorate: string | null;
  city: string | null;
  verificationStatus: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED";
  subjects: string[];
  bookings: {
    id: string;
    startsAt: string;
    durationMinutes: number;
    amountMillimes: number;
    status: string;
    student: { firstName: string; lastName: string; email: string; phone: string | null };
  }[];
  withdrawals: {
    id: string;
    requestedMillimes: number;
    feeMillimes: number;
    payoutMillimes: number;
    status: string;
    createdAt: string;
  }[];
};

export default function TeacherDashboardPage() {
  const [data, setData] = useState<TeacherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/teacher/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.teacher) setData(json.teacher);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0d8d78] border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm font-semibold text-slate-600">Chargement de votre espace...</p>
        </div>
      </main>
    );
  }

  const teacher = data;
  const isNewPending = teacher?.verificationStatus === "PENDING";
  const isUnderReview = teacher?.verificationStatus === "UNDER_REVIEW";
  const isRejected = teacher?.verificationStatus === "REJECTED";
  const isApproved = teacher?.verificationStatus === "APPROVED";

  const totalEarningsMillimes =
    teacher?.bookings
      .filter((b) => b.status === "COMPLETED" || b.status === "CONFIRMED")
      .reduce((sum, b) => sum + b.amountMillimes, 0) ?? 0;

  const totalPaidWithdrawals =
    teacher?.withdrawals
      .filter((w) => w.status === "APPROVED" || w.status === "PAID")
      .reduce((sum, w) => sum + w.requestedMillimes, 0) ?? 0;

  const availableBalanceMillimes = Math.max(0, totalEarningsMillimes - totalPaidWithdrawals);
  const upcomingBookings = teacher?.bookings.filter((b) => new Date(b.startsAt) >= new Date()) ?? [];

  return (
    <main className="min-h-screen bg-[#f8fafc] px-4 py-8 sm:px-6 sm:py-10 text-[#11233f]">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-1 font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-tight">
              <span>ProfySpace</span>
              <span className="rounded-md bg-[#0d8d78] px-1.5 py-0.5 text-xs font-extrabold text-white">.tn</span>
            </a>
            <span className="rounded-full bg-[#e5f7f2] border border-[#0d8d78]/20 px-3 py-1 text-xs font-bold text-[#0d8d78]">
              Espace Professeur
            </span>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <a
              href="/dashboard/messages"
              className="rounded-2xl border border-slate-200 bg-[#e5f7f2] px-4 py-2 text-xs font-bold text-[#0d8d78] transition hover:bg-[#d4f2e9] sm:text-sm"
            >
              💬 Messagerie / Chat
            </a>
            <a
              href="/teacher/onboarding"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 sm:text-sm"
            >
              Modifier mon dossier / tarifs
            </a>
            <a
              href="/teacher/dashboard/withdrawals"
              className="rounded-2xl bg-[#0d8d78] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0b7866] shadow-sm sm:text-sm"
            >
              Retraits & Revenus
            </a>
          </div>
        </div>

        {/* Verification Status Banners */}
        {isNewPending && (
          <div className="mt-8 rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50 to-emerald-50 p-6 sm:p-8 text-blue-950 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-2xl">
                  📝
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#11233f]">Compléter mon profil et envoyer une demande</h2>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                    Afin de rendre votre profil visible auprès des élèves, veuillez remplir vos informations (matières, diplômes, tarifs) et soumettre votre demande de vérification.
                  </p>
                </div>
              </div>
              <a
                href="/teacher/onboarding"
                className="shrink-0 rounded-2xl bg-[#0d8d78] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#0b7866] shadow-sm"
              >
                Compléter mon profil & Envoyer →
              </a>
            </div>
          </div>
        )}

        {isUnderReview && (
          <div className="mt-8 rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-6 sm:p-8 text-amber-950 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-200 text-2xl">
                ⏳
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">Votre profil est en cours d'examen</h2>
                  <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-amber-900">
                    Examen Admin
                  </span>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-amber-800 max-w-2xl leading-relaxed">
                  Votre dossier a été soumis avec succès à l'administration. Notre équipe vérifie actuellement vos informations.
                  Vous recevrez une notification dès approbation.
                </p>
              </div>
            </div>
          </div>
        )}

        {isRejected && (
          <div className="mt-8 rounded-3xl border border-rose-200 bg-rose-50 p-6 sm:p-8 text-rose-950 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-200 text-2xl">
                ❌
              </div>
              <div>
                <h2 className="text-xl font-bold">Candidature non validée</h2>
                <p className="mt-1 text-sm text-rose-800 max-w-2xl">
                  Certaines informations ou pièces justificatives sont manquantes. Veuillez mettre à jour votre profil pour demander une nouvelle revue.
                </p>
                <a
                  href="/teacher/onboarding"
                  className="mt-4 inline-block rounded-xl bg-rose-900 px-4 py-2 text-xs font-bold text-white"
                >
                  Mettre à jour et renvoyer
                </a>
              </div>
            </div>
          </div>
        )}

        {isApproved && (
          <div className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6 text-emerald-950 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white font-bold text-xs">
                ✓
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-emerald-900">Profil Enseignant Vérifié & Visible</h2>
                <p className="text-xs text-emerald-700">Votre fiche est certifiée. Les élèves peuvent consulter vos offres et réserver vos séances.</p>
              </div>
            </div>
            {teacher?.slug && (
              <a
                href={`/teachers/${teacher.slug}`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-xl bg-[#0d8d78] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0b7866]"
              >
                Voir ma fiche publique ↗
              </a>
            )}
          </div>
        )}

        {/* Welcome Section */}
        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#0d8d78]">Tableau de bord</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
            Bonjour, {teacher ? `${teacher.firstName} ${teacher.lastName}` : "Professeur"}.
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {teacher?.title || "Professeur particulier"} · {teacher?.subjects.join(", ") || "Matières non renseignées"}
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="mt-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Solde disponible</span>
            <p className="mt-2 text-2xl font-bold text-[#0d8d78]">
              {formatTndFromMillimes(availableBalanceMillimes)}
            </p>
            <p className="mt-1 text-xs text-slate-400">Prêt pour retrait</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Séances confirmées</span>
            <p className="mt-2 text-2xl font-bold text-[#11233f]">
              {teacher?.bookings.length ?? 0}
            </p>
            <p className="mt-1 text-xs text-slate-400">Historique total</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tarif horaire</span>
            <p className="mt-2 text-2xl font-bold text-[#11233f]">
              {teacher?.hourlyRateTnd ? `${teacher.hourlyRateTnd} DT / h` : "—"}
            </p>
            <p className="mt-1 text-xs text-slate-400">Déterminé par vous</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Statut profil</span>
            <div className="mt-2 flex items-center gap-1.5 font-bold text-lg text-[#11233f]">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isApproved ? "bg-emerald-500" : isUnderReview ? "bg-amber-500" : "bg-blue-500"
                }`}
              />
              <span>{isApproved ? "✓ Vérifié" : isUnderReview ? "En cours d'examen" : "Profil à compléter"}</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Visibilité marketplace</p>
          </div>
        </div>

        {/* Quick Nav Cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <a
            href="/teacher/dashboard/courses"
            className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-[#0d8d78] hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0d8d78]/10 text-[#0d8d78] group-hover:bg-[#0d8d78] group-hover:text-white transition duration-200 text-xl font-bold">
              📚
            </div>
            <h3 className="mt-4 font-bold text-lg text-[#11233f] group-hover:text-[#0d8d78]">Mes cours & packs</h3>
            <p className="mt-1 text-xs text-slate-500">Créez et publiez vos cours vidéo enregistrés avec verrouillage payant.</p>
          </a>

          <a
            href="/teacher/dashboard/bookings"
            className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-[#0d8d78] hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0d8d78]/10 text-[#0d8d78] group-hover:bg-[#0d8d78] group-hover:text-white transition duration-200">
              <IconCalendar className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-bold text-lg text-[#11233f] group-hover:text-[#0d8d78]">Mes séances live</h3>
            <p className="mt-1 text-xs text-slate-500">Consultez votre planning et rejoignez la classe WebRTC en direct.</p>
          </a>

          <a
            href="/teacher/dashboard/availability"
            className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-[#0d8d78] hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0d8d78]/10 text-[#0d8d78] group-hover:bg-[#0d8d78] group-hover:text-white transition duration-200">
              <IconClock className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-bold text-lg text-[#11233f] group-hover:text-[#0d8d78]">Gérer mes disponibilités</h3>
            <p className="mt-1 text-xs text-slate-500">Configurez vos créneaux horaires ouverts aux réservations des élèves.</p>
          </a>

          <a
            href="/teacher/dashboard/withdrawals"
            className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-[#0d8d78] hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0d8d78]/10 text-[#0d8d78] group-hover:bg-[#0d8d78] group-hover:text-white transition duration-200">
              <IconCreditCard className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-bold text-lg text-[#11233f] group-hover:text-[#0d8d78]">Retraits & Virement</h3>
            <p className="mt-1 text-xs text-slate-500">Demandez le versement de vos gains via D17, Flouci ou virement bancaire.</p>
          </a>
        </div>

        {/* Upcoming Sessions */}
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold">Prochaines séances</h2>
              <p className="text-xs text-slate-400">Séances programmées avec vos élèves</p>
            </div>
            <a href="/teacher/dashboard/bookings" className="text-xs font-bold text-[#0d8d78] hover:underline">
              Voir toutes ({teacher?.bookings.length ?? 0}) →
            </a>
          </div>

          {upcomingBookings.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                <IconCalendar className="h-7 w-7" />
              </div>
              <p className="font-bold text-slate-700">Aucune séance à venir pour le moment.</p>
              <p className="mt-1 text-xs text-slate-400">
                {!isApproved
                  ? "Vos créneaux seront réservables une fois votre candidature approuvée par l'admin."
                  : "Partagez votre profil pour recevoir des réservations."}
              </p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {upcomingBookings.map((b) => (
                <div key={b.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div>
                    <h3 className="font-bold text-base">
                      {b.student.firstName} {b.student.lastName}
                    </h3>
                    <p className="text-xs text-slate-500">
                      📅 {new Date(b.startsAt).toLocaleDateString("fr-TN", { weekday: "long", day: "numeric", month: "long" })} à{" "}
                      {new Date(b.startsAt).toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })} ({b.durationMinutes} min)
                    </p>
                    {b.student.phone && <p className="text-xs text-slate-400">📞 {b.student.phone}</p>}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-[#0d8d78]">
                      {formatTndFromMillimes(b.amountMillimes)}
                    </span>
                    <a
                      href={`/classroom/${b.id}`}
                      className="rounded-xl bg-[#0d8d78] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0b7866]"
                    >
                      Rejoindre la classe →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
