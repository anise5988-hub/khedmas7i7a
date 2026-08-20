/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { IconCreditCard, IconShield, IconCheck } from "@/components/icons";

const depositMethods = [
  {
    id: "D17",
    name: "La Poste Tunisienne (D17)",
    recipientTitle: "Numéro D17 Profy",
    copyValue: "21000319",
    displayValue: "+216 21 000 319",
    instructions: "Effectuez le transfert depuis votre application D17 vers notre numéro ci-dessus, puis saisissez le numéro de transaction SMS.",
  },
  {
    id: "FLOUCI",
    name: "Flouci Wallet",
    recipientTitle: "Numéro / Compte Flouci",
    copyValue: "21000319",
    displayValue: "21000319 (@profy_tn)",
    instructions: "Transférez le montant vers le compte Flouci ci-dessus puis collez la référence de transfert.",
  },
  {
    id: "BANK_TRANSFER",
    name: "Virement Bancaire (RIB)",
    recipientTitle: "RIB Banque de Tunisie",
    copyValue: "08000123456789012345",
    displayValue: "08 000 1234567890123 45",
    instructions: "Effectuez votre virement vers ce RIB officiel et mentionnez votre Nom & Prénom en libellé.",
  },
  {
    id: "ZITOUNA",
    name: "Banque Zitouna",
    recipientTitle: "Compte Banque Zitouna",
    copyValue: "25000987654321012399",
    displayValue: "25 000 9876543210123 99",
    instructions: "Versement au guichet ou virement vers notre compte Zitouna ci-dessus.",
  },
] as const;

export default function AddMoneyPage() {
  const [amount, setAmount] = useState(30);
  const [method, setMethod] = useState<"D17" | "BANK_TRANSFER" | "FLOUCI" | "ZITOUNA">("D17");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const activeMethodConfig = depositMethods.find((m) => m.id === method) || depositMethods[0];

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
          text: "Demande de recharge enregistrée ! Notre équipe financière validera votre transaction sous 15 minutes.",
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

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/dashboard/wallet" className="text-sm font-semibold text-slate-500 hover:text-slate-800">
              ← Retour au Wallet
            </a>
            <span className="text-slate-300">/</span>
            <span className="font-bold text-sm">Recharger mon solde</span>
          </div>
          <a href="/" className="font-[family-name:var(--font-dm-sans)] text-xl font-bold tracking-[-.06em]">
            profy<span className="text-[#0d8d78]">.tn</span>
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0d8d78]/10 text-[#0d8d78] mb-3">
            <IconCreditCard className="h-6 w-6" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#0d8d78]">Recharge Instantanée</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Alimenter mon compte de cours</h1>
          <p className="mt-2 text-sm text-slate-500">
            Transférez le montant par votre méthode de paiement tunisienne favorite puis collez la référence.
          </p>
        </div>

        {message.text && (
          <div
            className={`mt-6 rounded-2xl p-4 text-sm font-semibold ${
              message.type === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center gap-2"
                : "border border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {message.type === "success" && <IconCheck className="h-5 w-5 text-emerald-600 shrink-0" />}
            <p>{message.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          {/* Amount Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              1. Sélectionnez ou saisissez le montant (DT) *
            </label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[20, 30, 50, 100].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setAmount(val)}
                  className={`rounded-2xl border py-3 text-sm font-bold transition duration-200 ${
                    amount === val
                      ? "border-[#0d8d78] bg-[#e5f7f2] text-[#0d8d78] shadow-sm ring-2 ring-[#0d8d78]"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {val} DT
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="10000"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="Montant libre en Dinars"
                className="w-full rounded-2xl border border-slate-200 p-3.5 pr-14 text-sm font-bold outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">TND</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              2. Choisissez le mode de paiement *
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {depositMethods.map((m) => (
                <label
                  key={m.id}
                  className={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition duration-200 ${
                    method === m.id
                      ? "border-[#0d8d78] bg-[#e5f7f2] shadow-sm ring-2 ring-[#0d8d78]"
                      : "border-slate-200 bg-white hover:border-slate-300"
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
                    <div>
                      <span className="font-bold text-sm block text-[#11233f]">{m.name}</span>
                      <span className="text-[11px] text-slate-500">{m.recipientTitle}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Copyable Payment Recipient Card */}
          <div className="rounded-2xl border border-[#72d6bf]/40 bg-[#f0faf7] p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#0d8d78]">
                  {activeMethodConfig.recipientTitle}
                </p>
                <p className="mt-1 font-mono text-lg font-bold text-[#11233f] select-all tracking-wide">
                  {activeMethodConfig.displayValue}
                </p>
              </div>

              <CopyButton
                text={activeMethodConfig.copyValue}
                label="Copier le numéro / RIB"
                className="self-start sm:self-center py-2 px-3 text-xs shadow-sm bg-white"
              />
            </div>

            <div className="mt-3 border-t border-[#72d6bf]/20 pt-3 text-xs text-slate-600 leading-relaxed">
              <strong>Instructions :</strong> {activeMethodConfig.instructions}
            </div>
          </div>

          {/* Transaction Reference Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              3. Référence de la transaction / Reçu de paiement *
            </label>
            <input
              type="text"
              required
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ex: TX-99882211 ou numéro de référence D17 / virement"
              className="w-full rounded-2xl border border-slate-200 p-3.5 font-mono text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
            />
            <p className="mt-1 text-xs text-slate-400">
              Collez la référence reçue par SMS ou affichée sur votre reçu de transfert pour validation immédiate.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[#0d8d78] py-4 text-center font-bold text-white shadow-lg shadow-[#0d8d78]/20 transition hover:bg-[#0b7866] hover:shadow-xl disabled:opacity-50"
          >
            {loading ? "Enregistrement en cours..." : `Confirmer la recharge de ${amount} DT →`}
          </button>

          <div className="flex items-center justify-center gap-2 pt-1 text-xs text-slate-400">
            <IconShield className="h-4 w-4 text-[#0d8d78]" />
            <span>Paiement 100% sécurisé et garanti par l'équipe financière ProfySpace.tn</span>
          </div>
        </form>
      </div>
    </main>
  );
}
