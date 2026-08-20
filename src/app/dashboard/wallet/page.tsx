 
"use client";

import { useEffect, useState } from "react";


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

  useEffect(() => {
    fetch("/api/wallet")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.wallet) setWallet(data.wallet);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-slate-500 hover:text-slate-800">
              ← Dashboard
            </a>
            <span className="text-slate-300">/</span>
            <span className="font-bold">Mon Portefeuille (Wallet)</span>
          </div>

          <a
            href="/dashboard/wallet/add-money"
            className="rounded-full bg-[#0d8d78] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0b7866]"
          >
            + Recharger mon solde
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-3xl font-bold">Portefeuille & Solde</h1>
            <p className="mt-1 text-sm text-slate-500">
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

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Moyens de recharge acceptés</span>
              <p className="mt-2 font-bold text-base">D17 · Flouci · Virement · Banque Zitouna</p>
              <p className="mt-1 text-xs text-slate-500">
                Paiement direct en Dinars Tunisiens (TND) vérifié sous quelques minutes par notre service financier.
              </p>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3 flex justify-between text-xs text-slate-500">
              <span>Sécurité plateforme : 100% garanti</span>
              <a href="/support" className="font-bold text-[#0d8d78] hover:underline">Support paiement</a>
            </div>
          </div>
        </div>

        {/* Deposits History */}
        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold">Historique des recharges</h2>
          <p className="text-xs text-slate-400">Suivi des demandes de dépôts</p>

          {loading ? (
            <div className="py-12 text-center text-slate-400">Chargement...</div>
          ) : !wallet?.deposits || wallet.deposits.length === 0 ? (
            <div className="py-12 text-center">
              <span className="text-3xl">💳</span>
              <p className="mt-2 font-bold text-slate-600">Aucune recharge enregistrée.</p>
              <p className="mt-1 text-xs text-slate-400">Alimentez votre solde pour commencer vos cours.</p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-100 overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="border-b border-slate-100 text-xs font-bold uppercase text-slate-400">
                  <tr>
                    <th className="py-3">Méthode</th>
                    <th className="py-3">Montant</th>
                    <th className="py-3">Référence</th>
                    <th className="py-3">Date</th>
                    <th className="py-3 text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {wallet.deposits.map((d) => (
                    <tr key={d.id}>
                      <td className="py-3 font-bold text-slate-800">{d.method}</td>
                      <td className="py-3 font-bold text-[#0d8d78]">{d.amountTnd.toFixed(3)} DT</td>
                      <td className="py-3 font-mono text-slate-500">{d.reference}</td>
                      <td className="py-3 text-slate-400">
                        {new Date(d.createdAt).toLocaleDateString("fr-TN")}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            d.status === "PAID"
                              ? "bg-emerald-100 text-emerald-800"
                              : d.status === "PENDING"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {d.status === "PAID" ? "Validé" : d.status === "PENDING" ? "En attente" : "Refusé"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
