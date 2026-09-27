"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteNavbar } from "@/components/site-navbar";
import { IconCreditCard, IconPlus } from "@/components/icons";

type WalletTransaction = {
  id: string;
  type: string;
  amountTnd: number;
  reference?: string;
  createdAt: string;
};

type WalletData = {
  availableTnd: number;
  transactions: WalletTransaction[];
  deposits: {
    id: string;
    method: string;
    amountTnd: number;
    reference: string;
    status: string;
    createdAt: string;
  }[];
};

export default function StudentPaymentsPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/wallet")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.wallet) setWallet(data.wallet);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const deposits = wallet?.deposits || [];

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f] dark:bg-[#0c1626] dark:text-white">
      <SiteNavbar dark={false} />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#e5f7f2] border border-[#0d8d78]/25 px-2.5 py-0.5 text-xs font-bold text-[#0d8d78] dark:bg-[#72d6bf]/15 dark:border-[#72d6bf]/30 dark:text-[#72d6bf]">
                Finance & Portefeuille
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">
              Historique des Paiements & Recharges
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Suivez vos recharges par D17/Flouci et vos règlements de séances de cours.
            </p>
          </div>

          <Link
            href="/dashboard/wallet/add-money"
            className="flex items-center gap-2 rounded-2xl bg-[#0d8d78] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b7866] shadow-sm"
          >
            <IconPlus className="h-4 w-4" />
            <span>Recharger mon solde</span>
          </Link>
        </div>

        {/* Balance Card */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 dark:border-white/10 dark:bg-white/[.05] dark:shadow-xl">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Solde disponible</span>
            <p className="mt-1 text-3xl font-bold text-[#0d8d78] dark:text-[#72d6bf]">
              {wallet ? `${wallet.availableTnd.toFixed(3)} DT` : "0.000 DT"}
            </p>
            <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">Utilisable pour réserver des cours particuliers et packs</p>
          </div>

          <Link
            href="/dashboard/wallet/add-money"
            className="rounded-2xl border-2 border-[#0d8d78] bg-[#e5f7f2] px-5 py-3 text-xs font-bold text-[#0d8d78] hover:bg-[#d4f2e9] transition dark:border-[#72d6bf] dark:bg-[#72d6bf]/15 dark:text-[#72d6bf] dark:hover:bg-[#72d6bf]/25"
          >
            + Effectuer un dépôt (D17 / Flouci)
          </Link>
        </div>

        {/* Deposits History */}
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-4 dark:border-white/10 dark:bg-white/[.05] dark:shadow-xl">
          <h2 className="text-lg font-bold">Demandes de recharge</h2>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">Chargement...</div>
          ) : deposits.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
              <IconCreditCard className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              Aucune recharge effectuée pour le moment.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/10">
              {deposits.map((d) => (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-4 py-3.5 text-xs">
                  <div>
                    <span className="font-bold text-sm text-[#11233f] dark:text-white">{d.method}</span>
                    <p className="text-slate-400 font-mono text-[11px] dark:text-slate-500">Réf : {d.reference}</p>
                    <span className="text-slate-400 text-[10px] dark:text-slate-500">
                      {new Date(d.createdAt).toLocaleDateString("fr-TN")} à {new Date(d.createdAt).toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-base text-[#0d8d78] dark:text-[#72d6bf]">+{d.amountTnd.toFixed(3)} DT</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        d.status === "PAID"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
                          : d.status === "PENDING"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300"
                      }`}
                    >
                      {d.status === "PAID" ? "Validé" : d.status === "PENDING" ? "En attente admin" : "Rejeté"}
                    </span>
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