"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconCreditCard, IconDollarSign } from "@/components/icons";

export default function AdminPaymentsPage() {
  const [stats, setStats] = useState<{
    pendingDeposits: number;
    pendingWithdrawals: number;
    totalDepositedTnd: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.stats) setStats(data.stats);
      })
      .catch(() => {});
  }, []);

  return (
    <main className="min-h-screen bg-[#101b2d] px-4 py-8 sm:px-6 sm:py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-1 font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-tight">
              <span>ProfySpace</span>
              <span className="rounded-md bg-[#72d6bf] px-1.5 py-0.5 text-xs font-extrabold text-[#101b2d]">.admin</span>
            </Link>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">
              Paiements & Flux Financiers
            </span>
          </div>

          <Link
            href="/admin"
            className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
          >
            ← Retour au Dashboard
          </Link>
        </div>

        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#72d6bf]">Contrôle Financier</p>
          <h1 className="mt-1 text-3xl font-bold">Gestion des Paiements & Trésorerie</h1>
          <p className="mt-1 text-sm text-slate-400">
            Validez les recharges des élèves et traitez les demandes de virement des professeurs.
          </p>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {/* Card 1: Deposits */}
          <div className="rounded-3xl border border-white/10 bg-white/[.04] p-6 sm:p-8 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#72d6bf]/10 text-[#72d6bf]">
                <IconCreditCard className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-amber-500/20 text-amber-300 px-3 py-1 text-xs font-bold">
                {stats?.pendingDeposits ?? 0} en attente
              </span>
            </div>

            <h2 className="text-xl font-bold">Recharges Élèves (D17 & Flouci)</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Consultez les références de paiement fournies par les élèves pour créditer leurs soldes.
            </p>

            <Link
              href="/admin/wallets"
              className="inline-block w-full text-center rounded-2xl bg-[#72d6bf] py-3 text-xs font-bold text-[#101b2d] hover:bg-[#5ec4ad] transition"
            >
              Gérer les recharges →
            </Link>
          </div>

          {/* Card 2: Withdrawals */}
          <div className="rounded-3xl border border-white/10 bg-white/[.04] p-6 sm:p-8 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                <IconDollarSign className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-blue-500/20 text-blue-300 px-3 py-1 text-xs font-bold">
                {stats?.pendingWithdrawals ?? 0} demandes
              </span>
            </div>

            <h2 className="text-xl font-bold">Retraits & Gains Enseignants</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Effectuez les virements des professeurs après déduction des 10% de frais plateforme.
            </p>

            <Link
              href="/admin/withdrawals"
              className="inline-block w-full text-center rounded-2xl border border-white/20 bg-white/10 py-3 text-xs font-bold text-white hover:bg-white/20 transition"
            >
              Traiter les virements profs →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}