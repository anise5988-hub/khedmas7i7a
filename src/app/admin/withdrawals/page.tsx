"use client";

import { useEffect, useState } from "react";
import { formatTndFromMillimes } from "@/lib/finance/withdrawal";


type WithdrawalItem = {
  id: string;
  requestedMillimes: number;
  feeMillimes: number;
  payoutMillimes: number;
  method: string;
  accountDetails: string;
  status: "PENDING" | "APPROVED" | "PAID" | "REJECTED";
  createdAt: string;
  teacher?: {
    user: { firstName: string; lastName: string; email: string; phone: string | null };
  };
};

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadWithdrawals();
  }, []);

  function loadWithdrawals() {
    setLoading(true);
    fetch("/api/withdrawals")
      .then((res) => (res.ok ? res.json() : { withdrawals: [] }))
      .then((data) => setWithdrawals(data.withdrawals || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  async function updateStatus(withdrawalId: string, status: "PAID" | "REJECTED") {
    setActionLoading(withdrawalId);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/withdrawals/${withdrawalId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        setWithdrawals((prev) =>
          prev.map((w) => (w.id === withdrawalId ? { ...w, status } : w))
        );
      } else {
        setMessage(`Erreur : ${data.error || "Impossible de mettre à jour le retrait."}`);
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
            <a href="/admin" className="flex items-center gap-1 font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-tight">
              <span>ProfySpace</span>
              <span className="rounded-md bg-[#72d6bf] px-1.5 py-0.5 text-xs font-extrabold text-[#101b2d]">.admin</span>
            </a>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">
              Retraits Professeurs & Commissions
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
            <h1 className="text-3xl font-bold">Demandes de retraits ({withdrawals.length})</h1>
            <p className="mt-1 text-sm text-slate-400">
              Vérifiez les gains professeurs et les 10% de frais plateforme ProfySpace.tn avant virement.
            </p>
          </div>

          <button
            onClick={loadWithdrawals}
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

        {/* Withdrawals Table */}
        <div className="mt-6 overflow-x-auto rounded-3xl border border-white/10 bg-white/[.04] p-2">
          {loading ? (
            <div className="py-20 text-center text-slate-400">Chargement des demandes...</div>
          ) : withdrawals.length === 0 ? (
            <div className="py-16 text-center text-slate-400">Aucune demande de retrait pour le moment.</div>
          ) : (
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-white/10 text-xs font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Professeur</th>
                  <th className="px-4 py-3">Montant Brut</th>
                  <th className="px-4 py-3">Frais Profy (10%)</th>
                  <th className="px-4 py-3">Net à virer</th>
                  <th className="px-4 py-3">Mode & Coordonnées</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {withdrawals.map((w) => (
                  <tr key={w.id} className="transition hover:bg-white/[.03]">
                    <td className="px-4 py-4">
                      <div className="font-bold text-white">
                        {w.teacher ? `${w.teacher.user.firstName} ${w.teacher.user.lastName}` : "Professeur"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {w.teacher?.user.email} · {w.teacher?.user.phone ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs font-semibold text-white">
                      {formatTndFromMillimes(w.requestedMillimes)}
                    </td>
                    <td className="px-4 py-4 text-xs text-amber-300 font-bold">
                      - {formatTndFromMillimes(w.feeMillimes)}
                    </td>
                    <td className="px-4 py-4 font-bold text-emerald-400 text-base">
                      {formatTndFromMillimes(w.payoutMillimes)}
                    </td>
                    <td className="px-4 py-4 text-xs">
                      <span className="font-bold text-[#72d6bf]">{w.method}</span>
                      <p className="mt-0.5 text-slate-400 max-w-xs truncate">{w.accountDetails}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          w.status === "PAID" || w.status === "APPROVED"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : w.status === "PENDING"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {w.status === "PAID" || w.status === "APPROVED" ? "Viré & Payé" : w.status === "PENDING" ? "En attente" : "Rejeté"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {w.status === "PENDING" ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => updateStatus(w.id, "PAID")}
                            disabled={actionLoading === w.id}
                            className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
                          >
                            ✓ Virer
                          </button>
                          <button
                            onClick={() => updateStatus(w.id, "REJECTED")}
                            disabled={actionLoading === w.id}
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
