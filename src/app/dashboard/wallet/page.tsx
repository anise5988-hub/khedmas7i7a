

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconCreditCard, IconShield, IconDownload, IconFileText, IconX } from "@/components/icons";


type Wallet = {
  id: string;
  availableMillimes: number;
  availableTnd: number;
  pendingMillimes: number;
  pendingTnd: number;
  deposits: {
    id: string;
    method: string;
    amountTnd: number;
    reference: string;
    status: string;
    createdAt: string;
  }[];
  transactions: {
    id: string;
    type: string;
    amountTnd: number;
    reference: string | null;
    createdAt: string;
  }[];
};

export default function StudentWalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<Wallet["deposits"][0] | null>(null);

  function getAuthHeaders(): Record<string, string> {
    const userId = typeof window !== "undefined" ? localStorage.getItem("profyspace_user_id") || "" : "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (userId) headers["x-user-id"] = userId;
    return headers;
  }

  useEffect(() => {
    fetch("/api/wallet", { headers: getAuthHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.wallet) setWallet(data.wallet);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f] dark:bg-[#0c1626] dark:text-white">
      <header className="border-b border-slate-200 bg-white px-4 py-3.5 sm:px-6 sticky top-0 z-20 shadow-xs dark:border-white/10 dark:bg-[#11233f]">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
              ← Dashboard
            </a>
            <span className="text-slate-300">/</span>
            <span className="font-bold text-sm">Mon Portefeuille (Wallet)</span>
          </div>

          <Link href="/" className="flex items-center gap-1 font-[family-name:var(--font-dm-sans)] text-xl font-bold tracking-tight">
            <span>ProfySpace</span>
            <span className="rounded-md bg-[#0d8d78] px-1.5 py-0.5 text-xs font-extrabold text-white">.tn</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
          <div>
            <h1 className="text-3xl font-bold">Portefeuille & Solde</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Gérez votre crédit de cours pour réserver vos professeurs instantanément.
            </p>
          </div>
        </div>

        {/* Balance Card */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-[#11233f] to-[#1a365d] p-6 text-white shadow-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-[#72d6bf]">Solde Disponible</span>
            <p className="mt-2 text-4xl font-bold">
              {loading ? "..." : `${(wallet?.availableTnd ?? 0).toFixed(3)} DT`}
            </p>
            <p className="mt-1 text-xs text-slate-300">Utilisable pour toutes les réservations de cours</p>

            <a
              href="/dashboard/wallet/add-money"
              className="mt-6 inline-block rounded-xl bg-[#72d6bf] px-4 py-2.5 text-xs font-bold text-[#11233f] transition hover:bg-[#5ec4ad]"
            >
              Recharger mon compte →
            </a>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between dark:border-white/10 dark:bg-white/[.05] dark:shadow-xl">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Moyens de recharge acceptés</span>
              <p className="mt-2 font-bold text-base">D17 · Flouci · Virement Bancaire</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Paiement direct en Dinars Tunisiens (TND) vérifié sous 15 minutes par notre service financier.
              </p>
            </div>

            <div className="mt-4 border-t border-slate-100 dark:border-white/10 pt-3 flex flex-col sm:flex-row justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <IconShield className="h-3.5 w-3.5 text-[#0d8d78] dark:text-[#72d6bf]" />
                Sécurité 100% garantie
              </span>
              <div className="text-slate-600 dark:text-slate-300 font-semibold">
                Support : <a href="tel:+21658249938" className="text-[#0d8d78] dark:text-[#72d6bf] hover:underline">+216 58 249 938</a>
              </div>
            </div>
          </div>
        </div>

        {/* Deposits History */}
        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-white/10 dark:bg-white/[.05] dark:shadow-xl">
          <h2 className="text-xl font-bold">Historique des recharges</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">Suivi des demandes de dépôts</p>

          {loading ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500">Chargement...</div>
          ) : !wallet?.deposits || wallet.deposits.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3 dark:bg-white/10 dark:text-slate-400">
                <IconCreditCard className="h-7 w-7" />
              </div>
              <p className="font-bold text-slate-600 dark:text-slate-300">Aucune recharge enregistrée.</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Alimentez votre solde pour commencer vos cours.</p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-100 dark:divide-white/10 overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="border-b border-slate-100 text-xs font-bold uppercase text-slate-400 dark:border-white/10 dark:text-slate-500">
                  <tr>
                    <th className="py-3">Méthode</th>
                    <th className="py-3">Montant</th>
                    <th className="py-3">Référence</th>
                    <th className="py-3">Date</th>
                    <th className="py-3 text-center">Statut</th>
                    <th className="py-3 text-right">Reçu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/10 text-xs">
                  {wallet.deposits.map((d) => (
                    <tr key={d.id}>
                      <td className="py-3 font-bold text-slate-800 dark:text-white">{d.method}</td>
                      <td className="py-3 font-bold text-[#0d8d78] dark:text-[#72d6bf]">{d.amountTnd.toFixed(3)} DT</td>
                      <td className="py-3 font-mono text-slate-500 dark:text-slate-400">{d.reference}</td>
                      <td className="py-3 text-slate-400 dark:text-slate-500">
                        {new Date(d.createdAt).toLocaleDateString("fr-TN")}
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            d.status === "PAID"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : d.status === "PENDING"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300"
                          }`}
                        >
                          {d.status === "PAID" ? "Validé" : d.status === "PENDING" ? "En attente" : "Refusé"}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt(d)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:border-[#0d8d78] hover:text-[#0d8d78] transition shadow-2xs dark:border-white/15 dark:bg-white/10 dark:text-slate-200 dark:hover:border-[#72d6bf] dark:hover:text-[#72d6bf]"
                        >
                          <IconFileText className="h-3 w-3" />
                          <span>Reçu</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Receipt Printable Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:p-0 print:bg-white">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-5 print:shadow-none print:border-none print:max-w-none dark:bg-[#101b2d]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 print:hidden dark:border-white/10">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0d8d78] dark:text-[#72d6bf]">
                Reçu de Transaction
              </span>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-slate-600 font-bold dark:text-slate-500 dark:hover:text-slate-300"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>

            {/* Printable Content */}
            <div className="space-y-4">
              <div className="text-center pb-2 border-b border-slate-100 dark:border-white/10">
                <h3 className="font-[family-name:var(--font-dm-sans)] text-2xl font-bold text-[#11233f] dark:text-white">
                  ProfySpace<span className="text-[#0d8d78] dark:text-[#72d6bf]">.tn</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 dark:text-slate-500">Marketplace Tunisienne de Cours Particuliers</p>
                <p className="text-xs font-semibold text-slate-500 mt-1 dark:text-slate-400">Reçu Officiel de Rechargement</p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-50 text-slate-500 dark:border-white/10 dark:text-slate-400">
                  <span>Numéro de Référence :</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-white">{selectedReceipt.reference}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50 text-slate-500 dark:border-white/10 dark:text-slate-400">
                  <span>Moyen de Paiement :</span>
                  <span className="font-bold text-slate-800 dark:text-white">{selectedReceipt.method}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50 text-slate-500 dark:border-white/10 dark:text-slate-400">
                  <span>Date de l'opération :</span>
                  <span className="font-semibold text-slate-800 dark:text-white">
                    {new Date(selectedReceipt.createdAt).toLocaleDateString("fr-TN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50 text-slate-500 dark:border-white/10 dark:text-slate-400">
                  <span>Statut :</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">{selectedReceipt.status === "PAID" ? "PAYÉ / VALIDÉ" : selectedReceipt.status}</span>
                </div>
                <div className="flex justify-between py-2 border-t border-slate-200 text-sm font-bold text-[#11233f] dark:border-white/15 dark:text-white">
                  <span>Montant Rechargé :</span>
                  <span className="text-lg font-extrabold text-[#0d8d78] dark:text-[#72d6bf]">{selectedReceipt.amountTnd.toFixed(3)} DT</span>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-[10px] text-slate-400 text-center leading-relaxed dark:bg-white/5 dark:text-slate-500">
                Ce reçu atteste du crédit ajouté à votre portefeuille pour les cours en ligne et en présentiel sur ProfySpace.tn.
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 print:hidden">
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0d8d78] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#0b7866] shadow-sm"
              >
                <IconDownload className="h-3.5 w-3.5" />
                <span>Imprimer / PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
