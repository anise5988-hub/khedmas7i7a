"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  IconDollarSign,
  IconCreditCard,
  IconCheckCircle,
  IconShield,
} from "@/components/icons";

type Settings = {
  commissionRate: number;
  minWithdrawalTnd: number;
  d17Enabled: boolean;
  flouciEnabled: boolean;
  bankTransferEnabled: boolean;
  supportEmail: string;
  supportPhone: string;
  d17Recipient: string | null;
  flouciRecipient: string | null;
  bankRib: string | null;
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setSettings(data);
      })
      .catch(() => setError("Impossible de charger les paramètres."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(data.error || "Impossible d'enregistrer.");
      }
    } catch {
      setError("Erreur de connexion au serveur.");
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#101b2d] px-4 py-8 sm:px-6 sm:py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="mt-20 text-center text-sm text-slate-400">Chargement des paramètres...</div>
        </div>
      </main>
    );
  }

  if (!settings) {
    return (
      <main className="min-h-screen bg-[#101b2d] px-4 py-8 sm:px-6 sm:py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="mt-20 text-center text-sm text-rose-400">{error || "Impossible de charger les paramètres."}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#101b2d] px-4 py-8 sm:px-6 sm:py-10 text-white">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-1 font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-tight">
              <span>ProfySpace</span>
              <span className="rounded-md bg-[#72d6bf] px-1.5 py-0.5 text-xs font-extrabold text-[#101b2d]">.admin</span>
            </Link>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">
              Paramètres Plateforme
            </span>
          </div>

          <Link
            href="/admin"
            className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
          >
            ← Retour au Dashboard
          </Link>
        </div>

        {/* Title */}
        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#72d6bf]">Configuration Système</p>
          <h1 className="mt-1 text-3xl font-bold">Paramètres & Commissions ProfySpace.tn</h1>
          <p className="mt-1 text-sm text-slate-400">
            Ajustez les commissions de la marketplace, les règles financières et les canaux de communication.
          </p>
        </div>

        {saved && (
          <div className="mt-6 flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-300">
            <IconCheckCircle className="h-4 w-4" />
            <span>Paramètres de la plateforme enregistrés avec succès !</span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-8 space-y-6">
          {/* Section 1: Financial & Commission Rules */}
          <div className="rounded-3xl border border-white/10 bg-white/[.04] p-6 sm:p-8 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#72d6bf]/10 text-[#72d6bf]">
                <IconDollarSign className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">1. Commissions & Seuils Financiers</h2>
                <p className="text-xs text-slate-400">Règles de prélèvement appliquées aux gains des enseignants</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Commission Plateforme (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={settings.commissionRate}
                  onChange={(e) => update("commissionRate", Number(e.target.value))}
                  className="w-full rounded-xl border border-white/20 bg-white/5 p-3 text-sm text-white outline-none focus:border-[#72d6bf]"
                />
                <p className="mt-1 text-[11px] text-slate-400">Pourcentage standard déduit lors du virement des gains aux professeurs.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Seuil minimum de retrait (DT)
                </label>
                <input
                  type="number"
                  min={5}
                  value={settings.minWithdrawalTnd}
                  onChange={(e) => update("minWithdrawalTnd", Number(e.target.value))}
                  className="w-full rounded-xl border border-white/20 bg-white/5 p-3 text-sm text-white outline-none focus:border-[#72d6bf]"
                />
                <p className="mt-1 text-[11px] text-slate-400">Montant minimum requis dans le portefeuille du professeur pour demander un virement.</p>
              </div>
            </div>
          </div>

          {/* Section 2: Payment Providers in Tunisia */}
          <div className="rounded-3xl border border-white/10 bg-white/[.04] p-6 sm:p-8 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#72d6bf]/10 text-[#72d6bf]">
                <IconCreditCard className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">2. Moyens de Paiement Actifs en Tunisie</h2>
                <p className="text-xs text-slate-400">Canaux acceptés pour les recharges de solde et les retraits</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.02] p-4 cursor-pointer hover:bg-white/[.05] transition">
                <div>
                  <p className="font-bold text-sm">D17 (La Poste Tunisienne)</p>
                  <p className="text-xs text-slate-400">Recharge par mandat carte D17 ou transfert mobile</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.d17Enabled}
                  onChange={(e) => update("d17Enabled", e.target.checked)}
                  className="h-5 w-5 rounded border-white/20 text-[#0d8d78]"
                />
              </label>

              <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.02] p-4 cursor-pointer hover:bg-white/[.05] transition">
                <div>
                  <p className="font-bold text-sm">Flouci Wallet (Banque & Carte)</p>
                  <p className="text-xs text-slate-400">Recharge instantanée par QR code et portefeuille Flouci</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.flouciEnabled}
                  onChange={(e) => update("flouciEnabled", e.target.checked)}
                  className="h-5 w-5 rounded border-white/20 text-[#0d8d78]"
                />
              </label>

              <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.02] p-4 cursor-pointer hover:bg-white/[.05] transition">
                <div>
                  <p className="font-bold text-sm">Virement Bancaire / Banque Zitouna & Autres</p>
                  <p className="text-xs text-slate-400">Virement avec preuve de paiement transmise par l'élève</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.bankTransferEnabled}
                  onChange={(e) => update("bankTransferEnabled", e.target.checked)}
                  className="h-5 w-5 rounded border-white/20 text-[#0d8d78]"
                />
              </label>
            </div>
          </div>

          {/* Section 3: Contact & Support */}
          <div className="rounded-3xl border border-white/10 bg-white/[.04] p-6 sm:p-8 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#72d6bf]/10 text-[#72d6bf]">
                <IconShield className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">3. Coordonnées Officielles Support</h2>
                <p className="text-xs text-slate-400">Informations affichées aux utilisateurs pour toute assistance</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Email Support Officiel
                </label>
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => update("supportEmail", e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/5 p-3 text-sm text-white outline-none focus:border-[#72d6bf]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Téléphone Support
                </label>
                <input
                  type="text"
                  value={settings.supportPhone}
                  onChange={(e) => update("supportPhone", e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/5 p-3 text-sm text-white outline-none focus:border-[#72d6bf]"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-[#72d6bf] px-8 py-3.5 text-xs font-bold text-[#101b2d] hover:bg-[#5ec4ad] transition shadow-md disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : "Enregistrer les paramètres de la plateforme →"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}