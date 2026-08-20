 
"use client";

import { useState } from "react";

const depositMethods = [
  { id: "D17", name: "La Poste Tunisienne (D17)", instructions: "Envoyez le montant au numéro D17 Profy : +216 20 000 000 puis saisissez le numéro de transaction reçu par SMS." },
  { id: "FLOUCI", name: "Flouci Wallet", instructions: "Transférez vers le compte Flouci : @profy_tn puis indiquez l'identifiant de transfert." },
  { id: "BANK_TRANSFER", name: "Virement Bancaire (RIB)", instructions: "Effectuez un virement vers le RIB : 08 000 1234567890123 45 (Banque de Tunisie) et indiquez votre nom en référence." },
  { id: "ZITOUNA", name: "Banque Zitouna", instructions: "Versement ou virement sur notre compte Zitouna : 25 000 9876543210123 99." },
] as const;

export default function AddMoneyPage() {
  const [amount, setAmount] = useState(30);
  const [method, setMethod] = useState<"D17" | "BANK_TRANSFER" | "FLOUCI" | "ZITOUNA">("D17");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/wallet/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountMillimes: Math.round(Number(amount) * 1000),
          method,
          reference: reference.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: "success",
          text: "Demande de recharge envoyée avec succès ! Notre équipe financière vérifiera votre référence sous 15 minutes et créditera votre solde.",
        });
        setReference("");
      } else {
        setMessage({ type: "error", text: data.error || "Une erreur est survenue." });
      }
    } catch {
      setMessage({ type: "error", text: "Erreur de connexion au serveur." });
    } finally {
      setLoading(false);
    }
  }

  const selectedInstructions = depositMethods.find((m) => m.id === method)?.instructions;

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/dashboard/wallet" className="text-slate-500 hover:text-slate-800">
              ← Retour au Wallet
            </a>
            <span className="text-slate-300">/</span>
            <span className="font-bold">Recharger mon compte</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#0d8d78]">Paiement Sécurisé Tunisie</p>
          <h1 className="mt-2 text-3xl font-bold">Recharger mon solde de cours</h1>
          <p className="mt-1 text-sm text-slate-500">
            Choisissez votre méthode de paiement locale préférée et indiquez votre référence de paiement.
          </p>
        </div>

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

        <form onSubmit={handleSubmit} className="mt-8 space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              1. Montant à recharger (DT) *
            </label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[20, 30, 50, 100].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setAmount(val)}
                  className={`rounded-xl border py-2.5 text-xs font-bold transition ${
                    amount === val
                      ? "border-[#0d8d78] bg-[#e5f7f2] text-[#0d8d78]"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {val} DT
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              max="10000"
              required
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="Montant libre en Dinars"
              className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              2. Méthode de paiement *
            </label>
            <div className="space-y-2">
              {depositMethods.map((m) => (
                <label
                  key={m.id}
                  className={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition ${
                    method === m.id ? "border-[#0d8d78] bg-[#e5f7f2]" : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="method"
                      checked={method === m.id}
                      onChange={() => setMethod(m.id as never)}
                      className="text-[#0d8d78] focus:ring-[#0d8d78]"
                    />
                    <span className="font-bold text-sm">{m.name}</span>
                  </div>
                  <span className="text-xs font-bold text-[#0d8d78]">TND</span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 leading-relaxed">
            <p className="font-bold mb-1">📌 Instructions de paiement :</p>
            <p>{selectedInstructions}</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              3. Référence de la transaction / Numéro de reçu *
            </label>
            <input
              type="text"
              required
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ex: D17-88992211 ou numéro de virement"
              className="w-full rounded-xl border border-slate-200 p-3.5 text-sm font-mono outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
            />
            <p className="mt-1 text-xs text-slate-400">
              Indiquez la référence fournie par votre application de paiement pour identification instantanée.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[#0d8d78] py-4 text-center font-bold text-white shadow-lg shadow-[#0d8d78]/20 transition duration-300 hover:bg-[#0b7866] hover:shadow-xl disabled:opacity-50"
          >
            {loading ? "Validation en cours..." : `Confirmer la recharge de ${amount} DT →`}
          </button>
        </form>
      </div>
    </main>
  );
}
