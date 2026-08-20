/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { useEffect, useState } from "react";


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

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.stats) setStats(data.stats);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[#101b2d] px-4 py-8 sm:px-6 sm:py-10 text-white">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-1 font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-tight">
              <span>ProfySpace</span>
              <span className="rounded-md bg-[#72d6bf] px-1.5 py-0.5 text-xs font-extrabold text-[#101b2d]">.admin</span>
            </a>
            <span className="rounded-full bg-[#72d6bf]/20 text-[#72d6bf] border border-[#72d6bf]/30 px-3 py-1 text-xs font-bold">
              Console Super-Admin
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/admin/teacher-verifications"
              className="rounded-2xl bg-[#72d6bf] px-4 py-2 text-xs font-bold text-[#101b2d] transition hover:bg-[#5ec4ad] shadow-sm sm:text-sm"
            >
              Candidatures ({stats?.pendingTeachersCount ?? 0} en attente)
            </a>
          </div>
        </div>

        {/* Title */}
        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#72d6bf]">Supervision Globale</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Vue d&apos;ensemble de la plateforme</h1>
          <p className="mt-1 text-sm text-slate-400">
            Gérez les utilisateurs, validez les professeurs, supervisez les réservations et contrôlez les flux financiers.
          </p>
        </div>

        {/* Real Stats Grid */}
        <div className="mt-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[.05] p-5 shadow-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Utilisateurs inscrits</span>
            <p className="mt-2 text-3xl font-bold text-white">
              {loading ? "..." : stats?.totalUsers ?? 0}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {stats?.studentsCount ?? 0} élèves · {stats?.teachersCount ?? 0} profs
            </p>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 shadow-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Candidatures en attente</span>
            <p className="mt-2 text-3xl font-bold text-amber-400">
              {loading ? "..." : stats?.pendingTeachersCount ?? 0}
            </p>
            <a href="/admin/teacher-verifications" className="mt-1 block text-xs font-semibold text-amber-300 hover:underline">
              Vérifier les dossiers →
            </a>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[.05] p-5 shadow-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Professeurs approuvés</span>
            <p className="mt-2 text-3xl font-bold text-emerald-400">
              {loading ? "..." : stats?.approvedTeachersCount ?? 0}
            </p>
            <p className="mt-1 text-xs text-slate-400">Actifs sur la marketplace</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[.05] p-5 shadow-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Réservations totales</span>
            <p className="mt-2 text-3xl font-bold text-white">
              {loading ? "..." : stats?.totalBookings ?? 0}
            </p>
            <p className="mt-1 text-xs text-slate-400">Séances programmées</p>
          </div>
        </div>

        {/* Financial Overview */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[.05] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Dépôts Wallets en attente</span>
              <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                {stats?.pendingDeposits ?? 0} demandes
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {stats?.pendingDeposits ? `${stats.pendingDeposits} recharges à valider` : "Aucune recharge en attente"}
            </p>
            <a href="/admin/wallets" className="mt-2 inline-block text-xs font-bold text-[#72d6bf] hover:underline">
              Examiner les recharges élèves →
            </a>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[.05] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Demandes de retraits</span>
              <span className="rounded-full bg-blue-400/20 px-2.5 py-0.5 text-xs font-bold text-blue-300">
                {stats?.pendingWithdrawals ?? 0} demandes
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {stats?.pendingWithdrawals ? `${stats.pendingWithdrawals} virements à effectuer` : "Aucun retrait en attente"}
            </p>
            <a href="/admin/withdrawals" className="mt-2 inline-block text-xs font-bold text-[#72d6bf] hover:underline">
              Traiter les paiements profs →
            </a>
          </div>
        </div>

        {/* Quick Admin Modules */}
        <div className="mt-8 rounded-3xl border border-white/10 bg-white/[.04] p-6 sm:p-8">
          <h2 className="text-xl font-bold">Modules d&apos;administration</h2>
          <p className="mt-1 text-xs text-slate-400">Accès direct aux données connectées à la base de données</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <a
              href="/admin/teacher-verifications"
              className="rounded-2xl border border-white/10 bg-white/[.05] p-5 transition hover:border-[#72d6bf] hover:bg-white/[.08]"
            >
              <span className="text-2xl">📋</span>
              <h3 className="mt-3 font-bold text-base">Candidatures Profs</h3>
              <p className="mt-1 text-xs text-slate-400">Valider ou rejeter les nouveaux profils inscrits.</p>
            </a>

            <a
              href="/admin/teachers"
              className="rounded-2xl border border-white/10 bg-white/[.05] p-5 transition hover:border-[#72d6bf] hover:bg-white/[.08]"
            >
              <span className="text-2xl">👨‍🏫</span>
              <h3 className="mt-3 font-bold text-base">Annuaire Professeurs</h3>
              <p className="mt-1 text-xs text-slate-400">Consulter tous les professeurs et leurs tarifs.</p>
            </a>

            <a
              href="/admin/users"
              className="rounded-2xl border border-white/10 bg-white/[.05] p-5 transition hover:border-[#72d6bf] hover:bg-white/[.08]"
            >
              <span className="text-2xl">👥</span>
              <h3 className="mt-3 font-bold text-base">Gestion Utilisateurs</h3>
              <p className="mt-1 text-xs text-slate-400">Liste complète des élèves, professeurs et admins.</p>
            </a>

            <a
              href="/admin/bookings"
              className="rounded-2xl border border-white/10 bg-white/[.05] p-5 transition hover:border-[#72d6bf] hover:bg-white/[.08]"
            >
              <span className="text-2xl">📅</span>
              <h3 className="mt-3 font-bold text-base">Toutes les réservations</h3>
              <p className="mt-1 text-xs text-slate-400">Suivre les séances programmées et leurs statuts.</p>
            </a>

            <a
              href="/admin/wallets"
              className="rounded-2xl border border-white/10 bg-white/[.05] p-5 transition hover:border-[#72d6bf] hover:bg-white/[.08]"
            >
              <span className="text-2xl">💳</span>
              <h3 className="mt-3 font-bold text-base">Dépôts & Wallets</h3>
              <p className="mt-1 text-xs text-slate-400">Approuver les recharges D17, Flouci et virement.</p>
            </a>

            <a
              href="/admin/withdrawals"
              className="rounded-2xl border border-white/10 bg-white/[.05] p-5 transition hover:border-[#72d6bf] hover:bg-white/[.08]"
            >
              <span className="text-2xl">💰</span>
              <h3 className="mt-3 font-bold text-base">Retraits Professeurs</h3>
              <p className="mt-1 text-xs text-slate-400">Vérifier les commissions (10%) et virer les gains.</p>
            </a>

            <a
              href="/admin/education"
              className="rounded-2xl border border-white/10 bg-white/[.05] p-5 transition hover:border-[#72d6bf] hover:bg-white/[.08]"
            >
              <span className="text-2xl">📚</span>
              <h3 className="mt-3 font-bold text-base">Catalogue Éducatif</h3>
              <p className="mt-1 text-xs text-slate-400">Niveaux, matières tunisiennes et sections.</p>
            </a>

            <a
              href="/admin/settings"
              className="rounded-2xl border border-white/10 bg-white/[.05] p-5 transition hover:border-[#72d6bf] hover:bg-white/[.08]"
            >
              <span className="text-2xl">⚙️</span>
              <h3 className="mt-3 font-bold text-base">Paramètres Plateforme</h3>
              <p className="mt-1 text-xs text-slate-400">Commissions (10%), paiements et sécurité.</p>
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
