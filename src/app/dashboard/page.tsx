"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteNavbar } from "@/components/site-navbar";
import {
  IconBookOpen,
  IconCreditCard,
  IconShield,
  IconHeart,
  IconStar,
  IconSearch,
  IconCalendar,
  IconGraduationCap,
  IconWallet,
} from "@/components/icons";

type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

type WalletData = {
  availableMillimes: number;
  availableTnd: number;
};

type BookingItem = {
  id: string;
  teacherName: string;
  teacherSlug: string;
  subject: string;
  startsAt: string;
  durationMinutes: number;
  amountTnd: number;
  status: string;
};

type FavoriteTeacher = {
  id: string;
  slug: string;
  avatarUrl?: string;
  name: string;
  title: string;
  rate: number;
  rating: number;
  reviewsCount: number;
  subjects: string[];
  city: string;
};

type RecommendedTeacher = {
  id: string;
  slug: string;
  avatarUrl?: string;
  name: string;
  title: string;
  rate: number;
  rating: number;
  reviewsCount: number;
  subjects: string[];
  city: string;
  verificationStatus: string;
};

const links = [
  ["Vue d'ensemble", "/dashboard"],
  ["Messagerie (Chat)", "/dashboard/messages"],
  ["Mes cours & packs", "/dashboard/classes"],
  ["Calendrier & planning", "/dashboard/calendar"],
  ["Portefeuille (Wallet)", "/dashboard/wallet"],
  ["Mes favoris", "/dashboard/favorites"],
  ["Notifications", "/dashboard/notifications"],
  ["Paramètres du compte", "/dashboard/settings"],
  ["Trouver un professeur", "/teachers"],
];

function getStatusBadge(status: string) {
  const s = status.toLowerCase();
  if (s.includes("confirm") || s.includes("paid") || s.includes("completed")) {
    return { label: "Confirmée", className: "bg-[#e5f7f2] text-[#0d8d78]" };
  }
  if (s.includes("pending")) {
    return { label: "En attente", className: "bg-[#fff7e5] text-[#b45309]" };
  }
  if (s.includes("cancel") || s.includes("reject")) {
    return { label: "Annulée", className: "bg-red-50 text-red-600" };
  }
  return { label: status, className: "bg-slate-100 text-slate-600" };
}

export default function StudentDashboard() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem("profyspace_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [unlockedCoursesCount, setUnlockedCoursesCount] = useState<number>(0);
  const [favorites, setFavorites] = useState<FavoriteTeacher[]>([]);
  const [recommendedTeachers, setRecommendedTeachers] = useState<RecommendedTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  function getAuthHeaders(): Record<string, string> {
    const userId = typeof window !== "undefined" ? localStorage.getItem("profyspace_user_id") || "" : "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (userId) headers["x-user-id"] = userId;
    return headers;
  }

  useEffect(() => {
    const headers = getAuthHeaders();

    Promise.all([
      fetch("/api/auth/me", { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/wallet", { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/bookings", { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/courses/my-learning", { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/favorites", { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/teachers", { headers }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([userData, walletData, bookingsData, learningData, favoritesData, teachersData]) => {
        if (userData?.user) {
          setUser(userData.user);
          localStorage.setItem("profyspace_user", JSON.stringify(userData.user));
          if (userData.user.id) localStorage.setItem("profyspace_user_id", userData.user.id);
        }
        if (walletData?.wallet) setWallet(walletData.wallet);
        if (bookingsData?.bookings) setBookings(bookingsData.bookings);
        if (learningData?.courses) setUnlockedCoursesCount(learningData.courses.length);
        if (favoritesData?.favorites) setFavorites(favoritesData.favorites);
        if (teachersData) setRecommendedTeachers(teachersData.slice(0, 4));
      })
      .catch(() => setFetchError("Impossible de charger votre espace. Veuillez réessayer."))
      .finally(() => setLoading(false));
  }, []);

  const upcomingBookings = bookings.filter((b) => new Date(b.startsAt) >= new Date());

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <SiteNavbar dark={false} />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-10 lg:grid-cols-[230px_1fr] lg:gap-8">
        <aside className="min-w-0">
          <p className="mb-3 text-xs font-bold uppercase tracking-[.16em] text-slate-400">Espace élève</p>
          <nav className="flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-1 lg:overflow-visible">
            {links.map(([label, href], index) => (
              <Link
                key={label}
                href={href}
                className={`block shrink-0 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  index === 0
                    ? "bg-[#e5f7f2] text-[#0d8d78]"
                    : "text-slate-500 hover:bg-white hover:text-[#0d8d78]"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="min-w-0">
          {loading ? (
            <div className="py-20 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0d8d78] border-t-transparent mx-auto"></div>
              <p className="mt-3 text-sm text-slate-500">Chargement de votre espace...</p>
            </div>
          ) : fetchError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
              <p className="text-sm font-semibold text-rose-800">Erreur de chargement</p>
              <p className="mt-1 text-sm text-rose-600">{fetchError}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-700"
              >
                Réessayer
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-[#0d8d78]">Bonjour, bienvenue</p>
                <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
                  {user ? `${user.firstName} ${user.lastName}` : "Mon espace élève"}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Gérez vos cours particuliers, vos packs de révision et votre solde d'apprentissage.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#e5f7f2] text-[#0d8d78]">
                      <IconWallet className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Solde Wallet</span>
                  </div>
                  <p className="mt-3 text-2xl font-bold text-[#0d8d78]">
                    {wallet ? `${wallet.availableTnd.toFixed(3)} DT` : "0.000 DT"}
                  </p>
                  <Link href="/dashboard/wallet/add-money" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#0d8d78] hover:underline">
                    + Ajouter des fonds →
                  </Link>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#e5f7f2] text-[#0d8d78]">
                      <IconCalendar className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Séances à venir</span>
                  </div>
                  <p className="mt-3 text-2xl font-bold text-[#11233f]">
                    {upcomingBookings.length}
                  </p>
                  <Link href="/dashboard/calendar" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:underline">
                    Voir le planning →
                  </Link>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#e5f7f2] text-[#0d8d78]">
                      <IconGraduationCap className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Packs & Cours Débloqués</span>
                  </div>
                  <p className="mt-3 text-2xl font-bold text-[#11233f]">
                    {unlockedCoursesCount}
                  </p>
                  <Link href="/dashboard/classes" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:underline">
                    Accéder aux cours →
                  </Link>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold">Prochaines séances</h2>
                        <p className="text-xs text-slate-400">Vos cours à venir</p>
                      </div>
                    </div>

                    {upcomingBookings.length > 0 ? (
                      <div className="mt-5 space-y-3">
                        {upcomingBookings.slice(0, 5).map((booking) => {
                          const badge = getStatusBadge(booking.status);
                          return (
                            <Link
                              key={booking.id}
                              href={`/classroom/${booking.id}`}
                              className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition hover:border-[#0d8d78]/30 hover:bg-[#e5f7f2]/30"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#d9f1e9] text-lg font-bold text-[#0d8d78]">
                                  {booking.teacherName.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <h3 className="truncate font-bold text-sm">{booking.teacherName}</h3>
                                  <p className="text-xs text-[#0d8d78] font-semibold">{booking.subject}</p>
                                  <p className="text-xs text-slate-500">
                                     {new Date(booking.startsAt).toLocaleDateString("fr-TN", { weekday: "short", day: "numeric", month: "short" })} à{" "}
                                    {new Date(booking.startsAt).toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                </div>
                              </div>
                              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${badge.className}`}>
                                {badge.label}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-12 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                          <IconBookOpen className="h-7 w-7" />
                        </div>
                        <p className="font-bold text-slate-700">Aucun cours prévu prochainement.</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Explorez les professeurs vérifiés et réservez votre première séance !
                        </p>
                        <Link
                          href="/teachers"
                          className="mt-4 inline-block rounded-2xl bg-[#0d8d78] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b7866] shadow-sm"
                        >
                          Trouver un professeur →
                        </Link>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold">Mes favoris</h2>
                    <p className="text-xs text-slate-400">Professeurs que vous suivez</p>
                    {favorites.length > 0 ? (
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        {favorites.slice(0, 4).map((fav) => (
                          <Link
                            key={fav.id}
                            href={`/teachers/${fav.slug}`}
                            className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition hover:border-[#0d8d78]/30 hover:bg-[#e5f7f2]/30"
                          >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#11233f] text-sm font-bold text-white">
                              {fav.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h3 className="truncate font-bold text-sm">{fav.name}</h3>
                              <p className="text-xs text-slate-500 truncate">{fav.title}</p>
                              <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                                <span className="flex items-center gap-0.5 text-amber-500">
                                  <IconStar className="h-3 w-3" /> {fav.rating}
                                </span>
                                <span>• {fav.subjects[0]}</span>
                                <span>• {fav.city}</span>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="py-10 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                          <IconHeart className="h-7 w-7" />
                        </div>
                        <p className="font-bold text-slate-700">Vous n&apos;avez pas encore de favoris.</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Ajoutez des professeurs à vos favoris pour les retrouver facilement.
                        </p>
                        <Link
                          href="/teachers"
                          className="mt-4 inline-flex items-center gap-1 rounded-2xl border border-[#0d8d78] px-5 py-2.5 text-xs font-bold text-[#0d8d78] transition hover:bg-[#e5f7f2]"
                        >
                          <IconSearch className="h-4 w-4" />
                          Explorer les professeurs
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-[#e5f7f2] to-[#d9f1e9] p-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0d8d78]/10 text-[#0d8d78]">
                      <IconSearch className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 font-bold text-base text-[#11233f]">Trouver un professeur</h3>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      Des professeurs vérifiés et disponibles pour tous les niveaux et matières.
                    </p>
                    <Link
                      href="/teachers"
                      className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-[#0d8d78] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b7866] shadow-sm"
                    >
                      <IconSearch className="h-4 w-4" />
                      Voir les professeurs →
                    </Link>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0d8d78]/10 text-[#0d8d78]">
                      <IconCreditCard className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 font-bold text-base text-[#11233f]">Recharger le wallet</h3>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      Alimentez votre solde via D17, Flouci ou virement pour réserver instantanément.
                    </p>
                    <Link
                      href="/dashboard/wallet/add-money"
                      className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-[#0d8d78] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b7866] shadow-sm"
                    >
                      <IconWallet className="h-4 w-4" />
                      Effectuer un dépôt →
                    </Link>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#11233f]/10 text-[#11233f]">
                      <IconCalendar className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 font-bold text-base text-[#11233f]">Voir mon planning</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Consultez toutes vos réservations passées et à venir.
                    </p>
                    <Link
                      href="/dashboard/calendar"
                      className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-[#11233f] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0d8d78] shadow-sm"
                    >
                      <IconCalendar className="h-4 w-4" />
                      Ouvrir le calendrier →
                    </Link>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#11233f]/10 text-[#11233f]">
                      <IconShield className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 font-bold text-base">Besoin d&apos;aide ?</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Une question sur vos cours ou un paiement ? L&apos;équipe support ProfySpace.tn est disponible.
                    </p>
                    <div className="mt-3 space-y-1 text-xs">
                      <p className="font-semibold text-slate-700">+216 58 249 938</p>
                      <p className="text-slate-500">profyspace@gmail.com</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold">Professeurs recommandés</h2>
                    <p className="text-xs text-slate-400">Sélectionnés pour vous</p>
                  </div>
                  <Link href="/teachers" className="text-xs font-bold text-[#0d8d78] hover:underline">
                    Voir tout →
                  </Link>
                </div>

                {recommendedTeachers.length > 0 ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {recommendedTeachers.map((teacher) => (
                      <Link
                        key={teacher.id}
                        href={`/teachers/${teacher.slug}`}
                        className="flex flex-col items-center rounded-2xl border border-slate-100 bg-slate-50/50 p-5 text-center transition hover:border-[#0d8d78]/30 hover:bg-[#e5f7f2]/30"
                      >
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#11233f] text-xl font-bold text-white">
                          {teacher.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <h3 className="mt-3 font-bold text-sm">{teacher.name}</h3>
                        <p className="text-xs text-slate-500">{teacher.title}</p>
                        <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-600">
                          <IconStar className="h-3.5 w-3.5" />
                          {teacher.rating}
                          <span className="text-slate-400">({teacher.reviewsCount})</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{teacher.subjects[0]}</p>
                        <p className="text-sm font-bold text-[#0d8d78] mt-2">{teacher.rate} DT/h</p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                      <IconSearch className="h-7 w-7" />
                    </div>
                    <p className="font-bold text-slate-700">Aucun professeur recommandé pour le moment.</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Complétez votre profil pour recevoir des recommandations personnalisées.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
