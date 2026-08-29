"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteNavbar } from "@/components/site-navbar";
import { formatTndFromMillimes } from "@/lib/finance/withdrawal";
import {
  IconCalendar,
  IconClock,
  IconCreditCard,
  IconUsers,
  IconStar,
  IconCheckCircle,
  IconSettings,
  IconWallet,
  IconChevronRight,
  IconSparkles,
  IconBookOpen,
} from "@/components/icons";
import { Course } from "@/lib/server/courses-store";

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

type Review = {
  id: string;
  rating: number;
  comment: string;
  studentName: string;
  createdAt: string;
};

function getStatusBadge(status: string) {
  switch (status) {
    case "CONFIRMED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Confirmée
        </span>
      );
    case "PENDING":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          En attente
        </span>
      );
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-700">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          Terminée
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-700">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          Annulée
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
          {status}
        </span>
      );
  }
}

function CalendarPreview({ bookings }: { bookings: TeacherData["bookings"] }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const bookingDays = new Set(
    bookings
      .filter((b) => {
        const d = new Date(b.startsAt);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .map((b) => new Date(b.startsAt).getDate())
  );

  const todayDate = today.getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[#11233f]">{monthNames[month]} {year}</h3>
        <IconCalendar className="h-5 w-5 text-[#0d8d78]" />
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((d) => (
          <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} />;
          const isToday = day === todayDate;
          const hasBooking = bookingDays.has(day);
          return (
            <div
              key={day}
              className={`relative flex items-center justify-center h-8 rounded-lg text-xs font-medium transition
                ${isToday ? "bg-[#0d8d78] text-white" : "text-slate-600 hover:bg-slate-50"}
                ${hasBooking && !isToday ? "font-bold text-[#0d8d78]" : ""}
              `}
            >
              {day}
              {hasBooking && !isToday && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[#72d6bf]" />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#0d8d78]" /> Aujourd'hui
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#72d6bf]" /> Réservation
        </span>
      </div>
    </div>
  );
}

export default function TeacherDashboardPage() {
  const [data, setData] = useState<TeacherData | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  function getAuthHeaders(): Record<string, string> {
    const userId = typeof window !== "undefined" ? localStorage.getItem("profyspace_user_id") || "" : "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (userId) headers["x-user-id"] = userId;
    return headers;
  }

  useEffect(() => {
    const headers = getAuthHeaders();
    // Courses must be fetched with this teacher's own profile id, resolved
    // server-side from the session — never from client-cached localStorage,
    // which can be empty/stale right after login and would otherwise make
    // the courses query fall back to the public (unfiltered) catalog.
    fetch("/api/teacher/profile", { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((teacherJson) => {
        if (teacherJson?.teacher) setData(teacherJson.teacher);
        const teacherId = teacherJson?.teacher?.id;
        if (!teacherId) return Promise.all([{ courses: [] }, { reviews: [] }]);
        return Promise.all([
          fetch(`/api/courses?teacherId=${teacherId}`, { headers }).then((res) =>
            res.ok ? res.json() : { courses: [] },
          ),
          fetch(`/api/reviews?teacherId=${teacherId}`, { headers }).then((res) =>
            res.ok ? res.json() : { reviews: [] },
          ),
        ]);
      })
      .then(([coursesJson, reviewsJson]) => {
        if (coursesJson?.courses) setCourses(coursesJson.courses);
        if (reviewsJson?.reviews) setReviews(reviewsJson.reviews);
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
  const completedBookings = teacher?.bookings.filter((b) => b.status === "COMPLETED") ?? [];
  const pendingBookings = teacher?.bookings.filter((b) => b.status === "PENDING") ?? [];

  const totalCourseStudents = courses.reduce((sum, c) => sum + (c.studentCount || 0), 0);
  const totalStudents = (teacher?.bookings.length ?? 0) + totalCourseStudents;

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f] overflow-x-hidden">
      <SiteNavbar dark={false} />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">

        {/* Verification Status Banners */}
        {isNewPending && (
          <div className="mt-6 rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50 to-emerald-50 p-5 sm:p-6 text-blue-950 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-xl">

                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#11233f]">Compléter mon profil et envoyer une demande</h2>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                    Afin de rendre votre profil visible auprès des élèves, veuillez remplir vos informations (matières, diplômes, tarifs) et soumettre votre demande de vérification.
                  </p>
                </div>
              </div>
              <Link
                href="/teacher/dashboard/profile"
                className="shrink-0 rounded-2xl bg-[#0d8d78] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b7866] shadow-sm"
              >
                Compléter mon profil & Envoyer →
              </Link>
            </div>
          </div>
        )}

        {isUnderReview && (
          <div className="mt-6 rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 sm:p-6 text-amber-950 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-200 text-xl">
                ⏳
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold">Votre profil est en cours d&apos;examen</h2>
                  <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-amber-900">
                    Examen Admin
                  </span>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-amber-800 max-w-2xl leading-relaxed">
                  Votre dossier a été soumis avec succès à l&apos;administration. Notre équipe vérifie actuellement vos informations.
                  Vous recevrez une notification dès approbation.
                </p>
              </div>
            </div>
          </div>
        )}

        {isRejected && (
          <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-5 sm:p-6 text-rose-950 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-200 text-xl">

              </div>
              <div>
                <h2 className="text-lg font-bold">Candidature non validée</h2>
                <p className="mt-1 text-sm text-rose-800 max-w-2xl">
                  Certaines informations ou pièces justificatives sont manquantes. Veuillez mettre à jour votre profil pour demander une nouvelle revue.
                </p>
                <Link
                  href="/teacher/dashboard/profile"
                  className="mt-3 inline-block rounded-xl bg-rose-900 px-4 py-2 text-xs font-bold text-white hover:bg-rose-800"
                >
                  Mettre à jour et renvoyer
                </Link>
              </div>
            </div>
          </div>
        )}

        {isApproved && (
          <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5 text-emerald-950 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
        <div className="mt-8 rounded-3xl bg-gradient-to-br from-[#11233f] via-[#1a3a5c] to-[#0d8d78] p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#72d6bf]/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#0d8d78]/20 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 text-[#72d6bf] mb-2">
              <IconSparkles className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Espace Enseignant</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {greeting()}, {teacher ? teacher.firstName : "Professeur"} !
            </h1>
            <p className="mt-2 text-sm text-white/70 max-w-xl">
              {teacher?.title || "Professeur particulier"}
              {teacher && teacher.subjects && teacher.subjects.length > 0 && (
                <span className="text-[#72d6bf]"> · {teacher.subjects.slice(0, 3).join(", ")}{teacher.subjects.length > 3 && ` +${teacher.subjects.length - 3}`}</span>
              )}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/teacher/dashboard/profile"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition"
              >
                <IconSettings className="h-4 w-4" />
                Modifier mon profil
              </Link>
              <Link
                href="/teacher/dashboard/availability"
                className="inline-flex items-center gap-2 rounded-xl bg-[#72d6bf] px-4 py-2 text-xs font-bold text-[#11233f] hover:bg-[#5cc9b0] transition"
              >
                <IconClock className="h-4 w-4" />
                Gérer mes disponibilités
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-6 grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0d8d78]/10">
                <IconUsers className="h-4 w-4 text-[#0d8d78]" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#11233f]">{totalStudents}</p>
            <p className="text-[11px] text-slate-500 font-medium">Élèves total</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50">
                <IconCalendar className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#11233f]">{upcomingBookings.length}</p>
            <p className="text-[11px] text-slate-500 font-medium">Séances à venir</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50">
                <IconCheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#11233f]">{completedBookings.length}</p>
            <p className="text-[11px] text-slate-500 font-medium">Séances terminées</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50">
                <IconClock className="h-4 w-4 text-amber-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#11233f]">{pendingBookings.length}</p>
            <p className="text-[11px] text-slate-500 font-medium">Demandes en attente</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50">
                <IconStar className="h-4 w-4 text-amber-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#11233f]">{averageRating || "—"}</p>
            <p className="text-[11px] text-slate-500 font-medium">Note moyenne</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0d8d78]/10">
                <IconWallet className="h-4 w-4 text-[#0d8d78]" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#0d8d78]">{formatTndFromMillimes(availableBalanceMillimes)}</p>
            <p className="text-[11px] text-slate-500 font-medium">Solde disponible</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">

          {/* Left Column - Bookings & Calendar */}
          <div className="lg:col-span-2 space-y-6">

            {/* Upcoming Bookings */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div>
                  <h2 className="font-bold text-[#11233f] flex items-center gap-2">
                    <IconCalendar className="h-5 w-5 text-[#0d8d78]" />
                    Prochaines séances
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">{upcomingBookings.length} réservation{upcomingBookings.length !== 1 ? "s" : ""} à venir</p>
                </div>
                <Link href="/teacher/dashboard/bookings" className="text-xs font-bold text-[#0d8d78] hover:underline flex items-center gap-1">
                  Voir tout <IconChevronRight className="h-3 w-3" />
                </Link>
              </div>

              {upcomingBookings.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 mb-4">
                    <IconCalendar className="h-8 w-8 text-slate-300" />
                  </div>
                  <p className="font-bold text-slate-700">Aucune séance à venir</p>
                  <p className="mt-1 text-xs text-slate-400 max-w-xs mx-auto">
                    {!isApproved
                      ? "Vos créneaux seront réservables une fois votre candidature approuvée."
                      : "Partagez votre profil pour recevoir des réservations."}
                  </p>
                  {isApproved && (
                    <Link
                      href="/teacher/dashboard/availability"
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0d8d78] px-4 py-2 text-xs font-bold text-white hover:bg-[#0b7866] transition"
                    >
                      <IconClock className="h-4 w-4" />
                      Configurer mes disponibilités
                    </Link>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {upcomingBookings.slice(0, 5).map((b) => (
                    <div key={b.id} className="p-4 sm:p-5 hover:bg-slate-50/50 transition">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0d8d78]/10 text-[#0d8d78] font-bold text-sm">
                            {b.student.firstName.charAt(0)}{b.student.lastName.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-[#11233f]">
                              {b.student.firstName} {b.student.lastName}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {new Date(b.startsAt).toLocaleDateString("fr-TN", { weekday: "short", day: "numeric", month: "short" })} ·{" "}
                              {new Date(b.startsAt).toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })} · {b.durationMinutes} min
                            </p>
                            {b.student.phone && (
                              <p className="text-[11px] text-slate-400 mt-0.5"> {b.student.phone}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                          {getStatusBadge(b.status)}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-bold text-sm text-[#0d8d78]">
                              {formatTndFromMillimes(b.amountMillimes)}
                            </span>
                            <a
                              href={`/classroom/${b.id}`}
                              className="rounded-lg bg-[#0d8d78] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#0b7866]"
                            >
                              Rejoindre →
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Reviews */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div>
                  <h2 className="font-bold text-[#11233f] flex items-center gap-2">
                    <IconStar className="h-5 w-5 text-amber-500" />
                    Avis récents
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Ce que disent vos élèves</p>
                </div>
              </div>

              {reviews.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/50 mb-4">
                    <IconStar className="h-8 w-8 text-amber-300" />
                  </div>
                  <p className="font-bold text-slate-700">Aucun avis pour le moment</p>
                  <p className="mt-1 text-xs text-slate-400 max-w-xs mx-auto">
                    Les avis de vos élèves apparaîtront ici après vos séances.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {reviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 font-bold text-sm">
                          {review.studentName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-bold text-sm text-[#11233f] truncate">{review.studentName}</h3>
                            <div className="flex items-center gap-0.5 shrink-0">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <IconStar
                                  key={star}
                                  className={`h-3.5 w-3.5 ${star <= review.rating ? "text-amber-400" : "text-slate-200"}`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{review.comment}</p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {new Date(review.createdAt).toLocaleDateString("fr-TN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Calendar, Earnings, Quick Actions */}
          <div className="space-y-6">

            {/* Calendar Preview */}
            <CalendarPreview bookings={teacher?.bookings ?? []} />

            {/* Earnings Summary */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#11233f] flex items-center gap-2">
                  <IconWallet className="h-5 w-5 text-[#0d8d78]" />
                  Résumé des gains
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-xs text-slate-500">Gains totaux</span>
                  <span className="font-bold text-sm text-[#11233f]">{formatTndFromMillimes(totalEarningsMillimes)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-xs text-slate-500">Retraits effectués</span>
                  <span className="font-bold text-sm text-slate-600">-{formatTndFromMillimes(totalPaidWithdrawals)}</span>
                </div>
                <div className="flex items-center justify-between py-3 bg-[#0d8d78]/5 rounded-xl px-3 mt-2">
                  <span className="text-xs font-bold text-[#0d8d78]">Solde disponible</span>
                  <span className="font-bold text-lg text-[#0d8d78]">{formatTndFromMillimes(availableBalanceMillimes)}</span>
                </div>
              </div>
              <Link
                href="/teacher/dashboard/withdrawals"
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#0d8d78] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0b7866] transition w-full"
              >
                <IconCreditCard className="h-4 w-4" />
                Demander un retrait
              </Link>
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-bold text-[#11233f] mb-4">Actions rapides</h3>
              <div className="space-y-2">
                <Link
                  href="/teacher/dashboard/availability"
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-[#0d8d78] hover:bg-[#0d8d78]/5 transition group"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0d8d78]/10 text-[#0d8d78] group-hover:bg-[#0d8d78] group-hover:text-white transition">
                    <IconClock className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[#11233f]">Gérer mes disponibilités</p>
                    <p className="text-[11px] text-slate-400">Créneaux ouverts aux réservations</p>
                  </div>
                  <IconChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#0d8d78] transition" />
                </Link>

                <Link
                  href="/teacher/dashboard/bookings"
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-[#0d8d78] hover:bg-[#0d8d78]/5 transition group"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
                    <IconCalendar className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[#11233f]">Voir mes réservations</p>
                    <p className="text-[11px] text-slate-400">{teacher && teacher.bookings ? teacher.bookings.length : 0} réservation{(teacher && teacher.bookings ? teacher.bookings.length : 0) !== 1 ? "s" : ""}</p>
                  </div>
                  <IconChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#0d8d78] transition" />
                </Link>

                <Link
                  href="/teacher/dashboard/profile"
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-[#0d8d78] hover:bg-[#0d8d78]/5 transition group"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition">
                    <IconSettings className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[#11233f]">Modifier mon profil</p>
                    <p className="text-[11px] text-slate-400">Bio, tarifs, matières</p>
                  </div>
                  <IconChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#0d8d78] transition" />
                </Link>

                <Link
                  href="/teacher/dashboard/courses"
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-[#0d8d78] hover:bg-[#0d8d78]/5 transition group"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition">
                    <IconBookOpen className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[#11233f]">Mes cours & packs</p>
                    <p className="text-[11px] text-slate-400">{courses.length} pack{courses.length !== 1 ? "s" : ""} publié{courses.length !== 1 ? "s" : ""}</p>
                  </div>
                  <IconChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#0d8d78] transition" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
