/* eslint-disable @next/next/no-html-link-for-pages, @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useState } from "react";
import {
  IconVideo,
  IconBookOpen,
  IconCreditCard,
  IconCalendar,
  IconShield,
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

const links = [
  ["Vue d'ensemble", "/dashboard"],
  ["Mes cours", "/dashboard/classes"],
  ["Calendrier", "/dashboard/calendar"],
  ["Wallet & Solde", "/dashboard/wallet"],
  ["Recharger mon compte", "/dashboard/wallet/add-money"],
  ["Trouver un professeur", "/teachers"],
];

export default function StudentDashboard() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/wallet").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/bookings").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([userData, walletData, bookingsData]) => {
        if (userData?.user) setUser(userData.user);
        if (walletData?.wallet) setWallet(walletData.wallet);
        if (bookingsData?.bookings) setBookings(bookingsData.bookings);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const upcomingBookings = bookings.filter((b) => new Date(b.startsAt) >= new Date());
  const nextBooking = upcomingBookings[0] || null;

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white px-4 py-3.5 sm:px-6 sticky top-0 z-20 shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <a href="/" className="flex items-center gap-1 font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-tight">
            <span>ProfySpace</span>
            <span className="rounded-md bg-[#0d8d78] px-1.5 py-0.5 text-xs font-extrabold text-white">.tn</span>
          </a>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <a
              href="/dashboard/wallet/add-money"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 hover:border-slate-300 sm:text-sm"
            >
              Recharger solde
            </a>
            <a
              href="/teachers"
              className="rounded-2xl bg-[#0d8d78] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0b7866] shadow-sm sm:text-sm"
            >
              Trouver un professeur
            </a>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-10 lg:grid-cols-[230px_1fr] lg:gap-8">
        {/* Sidebar */}
        <aside className="min-w-0">
          <p className="mb-3 text-xs font-bold uppercase tracking-[.16em] text-slate-400">Espace élève</p>
          <nav className="flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-1 lg:overflow-visible">
            {links.map(([label, href], index) => (
              <a
                key={label}
                href={href}
                className={`block shrink-0 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  index === 0
                    ? "bg-[#e5f7f2] text-[#0d8d78]"
                    : "text-slate-500 hover:bg-white hover:text-[#0d8d78]"
                }`}
              >
                {label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <section className="min-w-0">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#0d8d78]">Bonjour, bienvenue</p>
            <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
              {user ? `${user.firstName} ${user.lastName}` : "Mon espace élève"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Gérez vos cours particuliers, votre planning et votre solde d'apprentissage.
            </p>
          </div>

          {/* Metrics */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Solde Wallet</span>
              <p className="mt-2 text-2xl font-bold text-[#0d8d78]">
                {wallet ? `${wallet.availableTnd.toFixed(3)} DT` : "0.000 DT"}
              </p>
              <a href="/dashboard/wallet/add-money" className="mt-1 block text-xs font-semibold text-[#0d8d78] hover:underline">
                + Ajouter des fonds →
              </a>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Séances à venir</span>
              <p className="mt-2 text-2xl font-bold text-[#11233f]">
                {upcomingBookings.length}
              </p>
              <a href="/dashboard/classes" className="mt-1 block text-xs font-semibold text-slate-500 hover:underline">
                Voir le planning →
              </a>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total séances suivies</span>
              <p className="mt-2 text-2xl font-bold text-[#11233f]">
                {bookings.length}
              </p>
              <span className="mt-1 block text-xs text-slate-400">Depuis l'inscription</span>
            </div>
          </div>

          {/* Next Booking Card & Actions */}
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold">Prochaine séance en direct</h2>
                  <p className="text-xs text-slate-400">Votre classe virtuelle interactive</p>
                </div>
                {nextBooking && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    {nextBooking.status}
                  </span>
                )}
              </div>

              {nextBooking ? (
                <div className="mt-5 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#d9f1e9] text-xl font-bold text-[#0d8d78]">
                      {nextBooking.teacherName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{nextBooking.teacherName}</h3>
                      <p className="text-xs text-[#0d8d78] font-bold">{nextBooking.subject}</p>
                      <p className="text-xs text-slate-500">
                        📅 {new Date(nextBooking.startsAt).toLocaleDateString("fr-TN", { weekday: "long", day: "numeric", month: "long" })} à{" "}
                        {new Date(nextBooking.startsAt).toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
                    Durée : <strong>{nextBooking.durationMinutes} minutes</strong> · Tarif : <strong>{nextBooking.amountTnd} DT</strong>
                  </div>

                  <a
                    href={`/classroom/${nextBooking.id}`}
                    className="flex items-center justify-center gap-2 w-full rounded-2xl bg-[#0d8d78] py-3.5 text-center text-sm font-bold text-white transition hover:bg-[#0b7866] shadow-lg shadow-[#0d8d78]/20"
                  >
                    <IconVideo className="h-4 w-4" />
                    <span>Rejoindre la salle WebRTC en direct →</span>
                  </a>
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
                  <a
                    href="/teachers"
                    className="mt-4 inline-block rounded-2xl bg-[#0d8d78] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b7866] shadow-sm"
                  >
                    Trouver un professeur →
                  </a>
                </div>
              )}
            </div>

            {/* Quick Actions Side Card */}
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-[#e7f5f1] p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0d8d78]/10 text-[#0d8d78]">
                  <IconCreditCard className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-bold text-base text-[#11233f]">Recharge Wallet Rapide</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Alimentez votre solde via D17, Flouci ou virement pour réserver instantanément.
                </p>
                <a
                  href="/dashboard/wallet/add-money"
                  className="mt-4 inline-block rounded-2xl bg-[#0d8d78] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b7866] shadow-sm"
                >
                  Effectuer un dépôt →
                </a>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#11233f]/10 text-[#11233f]">
                  <IconShield className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-bold text-base">Besoin d&apos;aide ?</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Une question sur vos cours ou un paiement ? L'équipe support ProfySpace.tn est disponible.
                </p>
                <div className="mt-3 space-y-1 text-xs">
                  <p className="font-semibold text-slate-700">📞 +216 58 249 938</p>
                  <p className="text-slate-500">✉️ profyspace@gmail.com</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
