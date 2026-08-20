 
"use client";

import { useEffect, useState } from "react";
import { calculateTeacherWithdrawal, formatTndFromMillimes } from "@/lib/finance/withdrawal";

type Withdrawal = {
  id: string;
  requestedMillimes: number;
  feeMillimes: number;
  payoutMillimes: number;
  method: string;
  accountDetails: string;
  status: string;
  createdAt: string;
};

export default function TeacherWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [amountTnd, setAmountTnd] = useState(50);
  const [method, setMethod] = useState<"BANK_TRANSFER" | "D17" | "FLOUCI" | "DIGIPOST">("D17");
  const [accountDetails, setAccountDetails] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    loadWithdrawals();
  }, []);

  function loadWithdrawals() {
    fetch("/api/withdrawals")
      .then((res) => (res.ok ? res.json() : { withdrawals: [] }))
      .then((data) => setWithdrawals(data.withdrawals || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  const calculation = (() => {
    try {
      return calculateTeacherWithdrawal(Math.max(1, Math.round(Number(amountTnd) * 1000)));
    } catch {
      return { requestedAmountInMillimes: 0, feeAmountInMillimes: 0, payoutAmountInMillimes: 0 };
    }
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountInMillimes: Math.round(Number(amountTnd) * 1000),
          method,
          accountDetails: accountDetails.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: "success",
          text: data.message || "Demande de retrait transmise avec succès ! Virement sous 24h.",
        });
        setAccountDetails("");
        loadWithdrawals();
      } else {
        setMessage({ type: "error", text: data.error || "Une erreur est survenue." });
      }
    } catch {
      setMessage({ type: "error", text: "Erreur de connexion au serveur." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/teacher/dashboard" className="text-slate-500 hover:text-slate-800">
              ← Dashboard Professeur
            </a>
            <span className="text-slate-300">/</span>
            <span className="font-bold">Revenus & Demande de Retrait</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-3xl font-bold">Retraits & Revenus</h1>
        <p className="mt-1 text-sm text-slate-500">
          Demandez le versement de vos gains vers votre compte bancaire, D17 ou Flouci avec calcul automatique de la commission (10%).
        </p>

        {message.text && (
          <div
            className={`mt-6 rounded-2xl p-4 text-sm font-semibold ${
              message.type === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Withdrawal Form */}
          <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold">Nouvelle demande de retrait</h2>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Montant à retirer (DT) *
              </label>
              <input
                type="number"
                min="10"
                max="100000"
                required
                value={amountTnd}
                onChange={(e) => setAmountTnd(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Moyen de réception *
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as never)}
                className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
              >
                <option value="D17">La Poste Tunisienne (D17 / e-Dinar)</option>
                <option value="BANK_TRANSFER">Virement Bancaire (RIB 20 chiffres)</option>
                <option value="FLOUCI">Flouci Wallet</option>
                <option value="DIGIPOST">DigiPost</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Coordonnées de paiement (RIB, Téléphone D17 ou Identifiant) *
              </label>
              <input
                type="text"
                required
                value={accountDetails}
                onChange={(e) => setAccountDetails(e.target.value)}
                placeholder="Ex: RIB 08000... ou N° téléphone D17 +216..."
                className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-[#0d8d78] py-4 text-center font-bold text-white shadow-lg shadow-[#0d8d78]/20 transition hover:bg-[#0b7866] disabled:opacity-50"
            >
              {submitting ? "Envoi en cours..." : "Demander le virement →"}
            </button>
          </form>

          {/* Fee Calculation Breakdown Card */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-[#e7f5f1] p-6 sm:p-8">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0d8d78]">
                Décompte financier en direct
              </span>
              <h3 className="mt-1 text-xl font-bold">Transparence 10%</h3>

              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Montant demandé :</span>
                  <span className="font-bold">{formatTndFromMillimes(calculation.requestedAmountInMillimes)}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Frais plateforme Profy (10%) :</span>
                  <span className="font-bold text-amber-800">
                    - {formatTndFromMillimes(calculation.feeAmountInMillimes)}
                  </span>
                </div>

                <div className="border-t border-slate-300 pt-3 flex justify-between font-bold text-base text-[#11233f]">
                  <span>Vous recevez net :</span>
                  <span className="text-[#0d8d78] text-lg">
                    {formatTndFromMillimes(calculation.payoutAmountInMillimes)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm text-xs text-slate-500 leading-relaxed">
              <p className="font-bold text-slate-700 mb-1">⏱ Délais de versement :</p>
              <p>Les demandes sont traitées sous 24h ouvrées. Vous recevrez une notification par SMS / Email une fois le virement émis.</p>
            </div>
          </div>
        </div>

        {/* Withdrawals History Table */}
        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold">Historique de mes retraits</h2>

          {loading ? (
            <div className="py-12 text-center text-slate-400">Chargement...</div>
          ) : withdrawals.length === 0 ? (
            <div className="py-12 text-center text-slate-400">Aucune demande de retrait passée.</div>
          ) : (
            <div className="mt-4 divide-y divide-slate-100 overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="border-b border-slate-100 text-xs font-bold uppercase text-slate-400">
                  <tr>
                    <th className="py-3">Méthode</th>
                    <th className="py-3">Montant Brut</th>
                    <th className="py-3">Frais 10%</th>
                    <th className="py-3">Net Reçu</th>
                    <th className="py-3">Date</th>
                    <th className="py-3 text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {withdrawals.map((w) => (
                    <tr key={w.id}>
                      <td className="py-3 font-bold text-slate-800">{w.method}</td>
                      <td className="py-3 text-slate-700">{formatTndFromMillimes(w.requestedMillimes)}</td>
                      <td className="py-3 text-amber-700">- {formatTndFromMillimes(w.feeMillimes)}</td>
                      <td className="py-3 font-bold text-[#0d8d78]">{formatTndFromMillimes(w.payoutMillimes)}</td>
                      <td className="py-3 text-slate-400">{new Date(w.createdAt).toLocaleDateString("fr-TN")}</td>
                      <td className="py-3 text-right">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            w.status === "PAID" || w.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : w.status === "PENDING"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {w.status === "PAID" || w.status === "APPROVED" ? "Payé" : w.status === "PENDING" ? "En cours" : "Rejeté"}
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
