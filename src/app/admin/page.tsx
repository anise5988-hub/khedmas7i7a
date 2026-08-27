/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { useEffect, useState } from "react";
import {
  IconHome,
  IconTeacher,
  IconUser,
  IconCalendar,
  IconStar,
  IconBookOpen,
  IconWallet,
  IconDollarSign,
  IconSettings,
  IconMenu,
  IconX,
  IconBell,
  IconSearch,
  IconPlus,
  IconChevronRight,
  IconUsers,
  IconClock,
} from "@/components/icons";
import { AnalyticsCharts } from "./analytics-charts";

type Analytics = {
  registrationsByDay: { date: string; value: number }[];
  bookingsByDay: { date: string; value: number }[];
  revenueTndByDay: { date: string; value: number }[];
  popularSubjects: { subject: string; count: number }[];
  bookingStatusDistribution: { status: string; count: number }[];
  teachersByGovernorate: { governorate: string; count: number }[];
};

type AdminStats = {
  totalUsers: number;
  studentsCount: number;
  teachersCount: number;
  pendingTeachersCount: number;
  approvedTeachersCount: number;
  totalBookings: number;
  pendingWithdrawals: number;
  pendingDeposits: number;
  totalDepositedTnd: number;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  badge?: number;
  active?: boolean;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: IconHome, active: true },
  {
    label: "Teachers",
    href: "/admin/teachers",
    icon: IconTeacher,
    badge: 0,
  },
  { label: "Students", href: "/admin/users", icon: IconUser },
  { label: "Bookings", href: "/admin/bookings", icon: IconCalendar },
  { label: "Reviews", href: "/admin/reviews", icon: IconStar },
  { label: "Subjects", href: "/admin/subjects", icon: IconBookOpen },
  { label: "Wallet", href: "/admin/wallets", icon: IconWallet },
  {
    label: "Withdrawals",
    href: "/admin/withdrawals",
    icon: IconDollarSign,
    badge: 0,
  },
  { label: "Settings", href: "/admin/settings", icon: IconSettings },
];

function Sidebar({
  open,
  onClose,
  stats,
}: {
  open: boolean;
  onClose: () => void;
  stats: AdminStats | null;
}) {
  const pendingTeachers = stats?.pendingTeachersCount ?? 0;
  const pendingWithdrawals = stats?.pendingWithdrawals ?? 0;
  const pendingDeposits = stats?.pendingDeposits ?? 0;

  const itemsWithBadges = navItems.map((item) => {
    if (item.label === "Teachers") {
      return { ...item, badge: pendingTeachers };
    }
    if (item.label === "Withdrawals") {
      return { ...item, badge: pendingWithdrawals };
    }
    if (item.label === "Deposits") {
      return { ...item, badge: pendingDeposits };
    }
    return item;
  });

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-[#0a1322] border-r border-white/10 transition-transform duration-300 lg:translate-x-0 lg:static lg:z-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <a href="/" className="flex items-center gap-2 font-[family-name:var(--font-dm-sans)] text-xl font-bold tracking-tight text-white">
              ProfySpace
              <span className="rounded-md bg-[#72d6bf] px-1.5 py-0.5 text-[10px] font-extrabold text-[#101b2d]">
                .admin
              </span>
            </a>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
            >
              <IconX />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-4">
            <p className="mb-3 px-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Navigation
            </p>
            <ul className="space-y-1">
              {itemsWithBadges.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      item.active
                        ? "bg-[#72d6bf]/15 text-[#72d6bf]"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <item.icon className="h-[18px] w-[18px]" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                        {item.badge}
                      </span>
                    ) : null}
                    {item.active && <IconChevronRight className="h-4 w-4 text-[#72d6bf]" />}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="border-t border-white/10 px-4 py-4">
            <a
              href="/"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              <IconX className="h-[18px] w-[18px]" />
              <span>Logout</span>
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  href,
  accent,
  loading,
  error,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  href?: string;
  accent?: "teal" | "amber" | "emerald" | "blue" | "slate";
  loading?: boolean;
  error?: boolean;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) {
  const accentStyles = {
    teal: "border-[#72d6bf]/30 bg-[#72d6bf]/10 text-[#72d6bf]",
    amber: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    blue: "border-blue-400/30 bg-blue-400/10 text-blue-300",
    slate: "border-white/10 bg-white/[.05] text-slate-400",
  };

  const content = (
    <div className="rounded-2xl border bg-white/[.04] p-5 shadow-xl transition hover:border-white/20">
      <div className="flex items-start justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {Icon && (
          <div className={`rounded-lg p-2 ${accentStyles[accent || "slate"]}`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <p className="mt-3 text-3xl font-bold text-white">
        {loading ? (
          <span className="inline-block h-8 w-20 animate-pulse rounded bg-white/10" />
        ) : error ? (
          <span className="text-red-400">!</span>
        ) : (
          value
        )}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
      )}
    </div>
  );

  if (href && !loading && !error) {
    return <a href={href}>{content}</a>;
  }
  return content;
}

function QuickAction({
  title,
  description,
  href,
  icon: Icon,
  accent = "slate",
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  accent?: "teal" | "amber" | "emerald" | "blue" | "slate";
}) {
  const accentStyles = {
    teal: "text-[#72d6bf] group-hover:border-[#72d6bf]/40",
    amber: "text-amber-400 group-hover:border-amber-400/40",
    emerald: "text-emerald-400 group-hover:border-emerald-400/40",
    blue: "text-blue-400 group-hover:border-blue-400/40",
    slate: "text-slate-400 group-hover:border-white/20",
  };

  return (
    <a
      href={href}
      className={`group flex flex-col rounded-2xl border border-white/10 bg-white/[.04] p-5 transition hover:bg-white/[.07] ${accentStyles[accent]}`}
    >
      <Icon className="h-6 w-6" />
      <h3 className="mt-3 font-bold text-white">{title}</h3>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </a>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.stats) {
          setStats(data.stats);
          setError(false);
        } else {
          setError(true);
        }
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => setLoading(false));

    fetch("/api/admin/analytics")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && !data.error) setAnalytics(data);
      })
      .catch(() => {});
  }, []);

  const pendingTeachers = stats?.pendingTeachersCount ?? 0;
  const pendingWithdrawals = stats?.pendingWithdrawals ?? 0;
  const pendingDeposits = stats?.pendingDeposits ?? 0;

  return (
    <div className="flex min-h-screen bg-[#101b2d] text-white">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} stats={stats} />

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#101b2d]/90 backdrop-blur-md">
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
              >
                <IconMenu />
              </button>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#72d6bf]">
                  Supervision Globale
                </p>
                <h1 className="text-lg font-bold sm:text-xl">
                  Vue d&apos;ensemble de la plateforme
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white">
                <IconSearch />
              </button>
              <button className="relative rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white">
                <IconBell />
                {(pendingTeachers + pendingWithdrawals + pendingDeposits) > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400" />
                )}
              </button>
              <a
                href="/admin/teacher-verifications"
                className="hidden rounded-2xl bg-[#72d6bf] px-4 py-2 text-xs font-bold text-[#101b2d] transition hover:bg-[#5ec4ad] shadow-sm sm:inline-flex sm:items-center sm:gap-2"
              >
                {pendingTeachers > 0 && (
                  <span className="rounded-full bg-[#101b2d]/20 px-1.5 py-0.5 text-[10px] font-extrabold">
                    {pendingTeachers}
                  </span>
                )}
                Candidatures en attente
              </a>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs text-slate-400">
              Gérez les utilisateurs, validez les professeurs, supervisez les réservations et contrôlez les flux financiers.
            </p>

            {error && !loading && (
              <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300">
                Impossible de charger les statistiques. Veuillez réessayer plus tard.
              </div>
            )}

            {/* KPI Grid */}
            <div className="mt-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Utilisateurs inscrits"
                value={stats ? stats.totalUsers.toLocaleString("fr-FR") : 0}
                subtitle={`${stats?.studentsCount ?? 0} élèves · ${stats?.teachersCount ?? 0} profs`}
                href="/admin/users"
                accent="teal"
                loading={loading}
                error={error}
                icon={IconUsers}
              />

              <StatCard
                title="Candidatures en attente"
                value={stats ? stats.pendingTeachersCount.toLocaleString("fr-FR") : 0}
                href="/admin/teacher-verifications"
                accent="amber"
                loading={loading}
                error={error}
                icon={IconClock}
              />

              <StatCard
                title="Professeurs approuvés"
                value={stats ? stats.approvedTeachersCount.toLocaleString("fr-FR") : 0}
                subtitle="Actifs sur la marketplace"
                href="/admin/teachers"
                accent="emerald"
                loading={loading}
                error={error}
                icon={IconTeacher}
              />

              <StatCard
                title="Réservations totales"
                value={stats ? stats.totalBookings.toLocaleString("fr-FR") : 0}
                subtitle="Séances programmées"
                href="/admin/bookings"
                accent="blue"
                loading={loading}
                error={error}
                icon={IconCalendar}
              />
            </div>

            {/* Financial Overview */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <StatCard
                title="Dépôts Wallets en attente"
                value={stats ? `${stats.pendingDeposits} recharges` : "0 recharges"}
                subtitle={
                  stats?.totalDepositedTnd
                    ? `${stats.totalDepositedTnd.toLocaleString("fr-FR")} TND déposés`
                    : "Volume total déposé"
                }
                href="/admin/wallets"
                accent="teal"
                loading={loading}
                error={error}
                icon={IconWallet}
              />

              <StatCard
                title="Demandes de retraits"
                value={stats ? `${stats.pendingWithdrawals} virements` : "0 virements"}
                href="/admin/withdrawals"
                accent="amber"
                loading={loading}
                error={error}
                icon={IconDollarSign}
              />
            </div>

            {/* Quick Actions */}
            <div className="mt-8 rounded-3xl border border-white/10 bg-white/[.04] p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Actions rapides</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Accès direct aux tâches fréquentes
                  </p>
                </div>
                <IconPlus className="h-5 w-5 text-slate-500" />
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <QuickAction
                  title="Valider des profs"
                  description={`${pendingTeachers} dossier${pendingTeachers !== 1 ? "s" : ""} en attente`}
                  href="/admin/teacher-verifications"
                  icon={IconTeacher}
                  accent="amber"
                />
                <QuickAction
                  title="Voir les réservations"
                  description="Suivre les séances programmées"
                  href="/admin/bookings"
                  icon={IconCalendar}
                  accent="teal"
                />
                <QuickAction
                  title="Approuver les dépôts"
                  description={`${pendingDeposits} recharge${pendingDeposits !== 1 ? "s" : ""} à valider`}
                  href="/admin/wallets"
                  icon={IconWallet}
                  accent="emerald"
                />
                <QuickAction
                  title="Traiter les retraits"
                  description={`${pendingWithdrawals} virement${pendingWithdrawals !== 1 ? "s" : ""} en attente`}
                  href="/admin/withdrawals"
                  icon={IconDollarSign}
                  accent="blue"
                />
              </div>
            </div>

            {analytics && (
              <AnalyticsCharts
                registrationsByDay={analytics.registrationsByDay}
                bookingsByDay={analytics.bookingsByDay}
                revenueTndByDay={analytics.revenueTndByDay}
                popularSubjects={analytics.popularSubjects}
                bookingStatusDistribution={analytics.bookingStatusDistribution}
                teachersByGovernorate={analytics.teachersByGovernorate}
              />
            )}

            {/* Admin Modules */}
            <div className="mt-8 rounded-3xl border border-white/10 bg-white/[.04] p-6 sm:p-8">
              <h2 className="text-xl font-bold">Modules d&apos;administration</h2>
              <p className="mt-1 text-xs text-slate-400">
                Accès direct aux données connectées à la base de données
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <a
                  href="/admin/teacher-verifications"
                  className="rounded-2xl border border-white/10 bg-white/[.05] p-5 transition hover:border-[#72d6bf] hover:bg-white/[.08]"
                >
                  <IconTeacher className="h-6 w-6 text-[#72d6bf]" />
                  <h3 className="mt-3 font-bold text-base">Candidatures Profs</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Valider ou rejeter les nouveaux profils inscrits.
                  </p>
                </a>

                <a
                  href="/admin/teachers"
                  className="rounded-2xl border border-white/10 bg-white/[.05] p-5 transition hover:border-[#72d6bf] hover:bg-white/[.08]"
                >
                  <IconUsers className="h-6 w-6 text-[#72d6bf]" />
                  <h3 className="mt-3 font-bold text-base">Annuaire Professeurs</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Consulter tous les professeurs et leurs tarifs.
                  </p>
                </a>

                <a
                  href="/admin/users"
                  className="rounded-2xl border border-white/10 bg-white/[.05] p-5 transition hover:border-[#72d6bf] hover:bg-white/[.08]"
                >
                  <IconUsers className="h-6 w-6 text-[#72d6bf]" />
                  <h3 className="mt-3 font-bold text-base">Gestion Utilisateurs</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Liste complète des élèves, professeurs et admins.
                  </p>
                </a>

                <a
                  href="/admin/bookings"
                  className="rounded-2xl border border-white/10 bg-white/[.05] p-5 transition hover:border-[#72d6bf] hover:bg-white/[.08]"
                >
                  <IconCalendar className="h-6 w-6 text-[#72d6bf]" />
                  <h3 className="mt-3 font-bold text-base">Toutes les réservations</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Suivre les séances programmées et leurs statuts.
                  </p>
                </a>

                <a
                  href="/admin/wallets"
                  className="rounded-2xl border border-white/10 bg-white/[.05] p-5 transition hover:border-[#72d6bf] hover:bg-white/[.08]"
                >
                  <IconWallet className="h-6 w-6 text-[#72d6bf]" />
                  <h3 className="mt-3 font-bold text-base">Dépôts & Wallets</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Approuver les recharges D17, Flouci et virement.
                  </p>
                </a>

                <a
                  href="/admin/withdrawals"
                  className="rounded-2xl border border-white/10 bg-white/[.05] p-5 transition hover:border-[#72d6bf] hover:bg-white/[.08]"
                >
                  <IconDollarSign className="h-6 w-6 text-[#72d6bf]" />
                  <h3 className="mt-3 font-bold text-base">Retraits Professeurs</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Vérifier les commissions (10%) et virer les gains.
                  </p>
                </a>

                <a
                  href="/admin/education"
                  className="rounded-2xl border border-white/10 bg-white/[.05] p-5 transition hover:border-[#72d6bf] hover:bg-white/[.08]"
                >
                  <IconBookOpen className="h-6 w-6 text-[#72d6bf]" />
                  <h3 className="mt-3 font-bold text-base">Catalogue Éducatif</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Niveaux, matières tunisiennes et sections.
                  </p>
                </a>

                <a
                  href="/admin/settings"
                  className="rounded-2xl border border-white/10 bg-white/[.05] p-5 transition hover:border-[#72d6bf] hover:bg-white/[.08]"
                >
                  <IconSettings className="h-6 w-6 text-[#72d6bf]" />
                  <h3 className="mt-3 font-bold text-base">Paramètres Plateforme</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Commissions (10%), paiements et sécurité.
                  </p>
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
