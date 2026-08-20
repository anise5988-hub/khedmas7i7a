/* eslint-disable react/no-unescaped-entities */
"use client";

import { useEffect, useState } from "react";


type DepositItem = {
  id: string;
  walletId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  method: string;
  amountTnd: number;
  amountMillimes: number;
  reference: string;
  status: "PENDING" | "PAID" | "FAILED" | "CANCELLED";
  createdAt: string;
};

export default function AdminWalletsPage() {
  const [deposits, setDeposits] = useState<DepositItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadDeposits();
  }, []);

  function loadDeposits() {
    setLoading(true);
    fetch("/api/admin/deposits")
      .then((res) => (res.ok ? res.json() : { deposits: [] }))
      .then((data) => setDeposits(data.deposits || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  async function verifyDeposit(depositId: string, status: "PAID" | "FAILED") {
    setActionLoading(depositId);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/deposits/${depositId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        setDeposits((prev) =>
          prev.map((d) => (d.id === depositId ? { ...d, status } : d))
        );
      } else {
        setMessage(`Erreur : ${data.error || "Impossible de mettre à jour le dépôt."}`);
      }
    } catch {
      setMessage("Erreur de connexion.");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#101b2d] px-4 py-8 sm:px-6 sm:py-10 text-white">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-4">
            <a href="/admin" className="font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-[-.06em]">
              profy<span className="text-[#72d6bf]">.admin</span>
            </a>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">
              Recharges Wallet & Dépôts
            </span>
          </div>

          <a
            href="/admin"
            className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
          >
            ← Retour Dashboard
          </a>
        </div>

        {/* Title */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Recharges de compte ({deposits.length})</h1>
            <p className="mt-1 text-sm text-slate-400">
              Vérifiez la référence de paiement transmise par l'élève et créditez son solde de cours.
            </p>
          </div>

          <button
            onClick={loadDeposits}
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold transition hover:bg-white/20"
          >
            🔄 Actualiser
          </button>
        </div>

        {message && (
          <div className="mt-6 rounded-2xl border border-white/20 bg-white/10 p-4 text-sm font-semibold">
            {message}
          </div>
        )}

        {/* Deposits Table */}
        <div className="mt-6 overflow-x-auto rounded-3xl border border-white/10 bg-white/[.04] p-2">
          {loading ? (
            <div className="py-20 text-center text-slate-400">Chargement des dépôts...</div>
          ) : deposits.length === 0 ? (
            <div className="py-16 text-center text-slate-400">Aucune recharge enregistrée.</div>
          ) : (
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-white/10 text-xs font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Élève</th>
                  <th className="px-4 py-3">Méthode</th>
                  <th className="px-4 py-3">Montant</th>
                  <th className="px-4 py-3">Référence transaction</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {deposits.map((d) => (
                  <tr key={d.id} className="transition hover:bg-white/[.03]">
                    <td className="px-4 py-4">
                      <div className="font-bold text-white">{d.userName}</div>
                      <div className="text-xs text-slate-400">{d.userEmail} · {d.userPhone}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-bold text-[#72d6bf]">
                        {d.method}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-bold text-white text-base">
                      {d.amountTnd.toFixed(3)} DT
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-amber-300 font-bold">
                      {d.reference}
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-400">
                      {new Date(d.createdAt).toLocaleDateString("fr-TN")} à {new Date(d.createdAt).toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          d.status === "PAID"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : d.status === "PENDING"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {d.status === "PAID" ? "Validé & Crédité" : d.status === "PENDING" ? "En attente" : "Rejeté"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {d.status === "PENDING" ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => verifyDeposit(d.id, "PAID")}
                            disabled={actionLoading === d.id}
                            className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
                          >
                            ✓ Créditer
                          </button>
                          <button
                            onClick={() => verifyDeposit(d.id, "FAILED")}
                            disabled={actionLoading === d.id}
                            className="rounded-xl bg-rose-500/20 border border-rose-500/40 px-3 py-1.5 text-xs font-bold text-rose-300 transition hover:bg-rose-500/30 disabled:opacity-50"
                          >
                            ✕ Rejeter
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">Traité</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
