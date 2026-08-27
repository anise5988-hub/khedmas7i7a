/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconPlus, IconTrash } from "@/components/icons";

type Coupon = {
  id: string;
  code: string;
  discountType: "PERCENT" | "FIXED_AMOUNT";
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  minAmountMillimes: number | null;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discountType: "PERCENT" as "PERCENT" | "FIXED_AMOUNT",
    discountValue: 10,
    maxUses: "",
    minAmountTnd: "",
    expiresAt: "",
  });

  function loadCoupons() {
    setLoading(true);
    fetch("/api/admin/coupons")
      .then((res) => (res.ok ? res.json() : { coupons: [] }))
      .then((data) => setCoupons(data.coupons || []))
      .catch(() => setError("Impossible de charger les coupons."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadCoupons();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.code,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        minAmountMillimes: form.minAmountTnd ? Math.round(Number(form.minAmountTnd) * 1000) : null,
        expiresAt: form.expiresAt || null,
      }),
    });

    if (res.ok) {
      setFormOpen(false);
      setForm({ code: "", discountType: "PERCENT", discountValue: 10, maxUses: "", minAmountTnd: "", expiresAt: "" });
      loadCoupons();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error || "Erreur lors de la création.");
    }
  }

  async function toggleActive(coupon: Coupon) {
    await fetch(`/api/admin/coupons/${coupon.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !coupon.active }),
    });
    loadCoupons();
  }

  async function deleteCoupon(id: string) {
    if (!confirm("Supprimer ce coupon ?")) return;
    await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
    loadCoupons();
  }

  return (
    <main className="min-h-screen bg-[#101b2d] px-4 py-8 sm:px-6 sm:py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h1 className="text-3xl font-bold">Coupons</h1>
            <p className="mt-1 text-sm text-slate-400">
              Codes de réduction applicables aux recharges de portefeuille (bonus crédité à la validation).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFormOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#72d6bf] px-5 py-2.5 text-sm font-bold text-[#101b2d] transition hover:bg-[#5ec4ad]"
            >
              <IconPlus className="h-4 w-4" />
              Nouveau coupon
            </button>
            <Link
              href="/admin"
              className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
            >
              ← Retour Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div>
        )}

        {formOpen && (
          <form onSubmit={handleSubmit} className="mt-6 grid gap-4 rounded-3xl border border-white/10 bg-white/[.04] p-6 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Code *</label>
              <input
                type="text"
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="RENTREE2026"
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:border-[#72d6bf]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Type de réduction</label>
              <select
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value as "PERCENT" | "FIXED_AMOUNT" })}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:border-[#72d6bf]"
              >
                <option value="PERCENT">Pourcentage (%)</option>
                <option value="FIXED_AMOUNT">Montant fixe (DT)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                Valeur {form.discountType === "PERCENT" ? "(%)" : "(DT)"}
              </label>
              <input
                type="number"
                required
                min={1}
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:border-[#72d6bf]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Utilisations max (optionnel)</label>
              <input
                type="number"
                min={1}
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:border-[#72d6bf]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Recharge minimum (DT, optionnel)</label>
              <input
                type="number"
                min={0}
                value={form.minAmountTnd}
                onChange={(e) => setForm({ ...form, minAmountTnd: e.target.value })}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:border-[#72d6bf]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Expire le (optionnel)</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:border-[#72d6bf]"
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <button type="submit" className="rounded-xl bg-[#72d6bf] px-5 py-2.5 text-xs font-bold text-[#101b2d]">
                Créer
              </button>
              <button type="button" onClick={() => setFormOpen(false)} className="rounded-xl border border-white/20 px-5 py-2.5 text-xs font-bold text-white">
                Annuler
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 overflow-x-auto rounded-3xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[.03] text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Réduction</th>
                <th className="px-4 py-3">Utilisations</th>
                <th className="px-4 py-3">Min. recharge</th>
                <th className="px-4 py-3">Expire</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Chargement...</td></tr>
              ) : coupons.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Aucun coupon créé.</td></tr>
              ) : (
                coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[.02]">
                    <td className="px-4 py-3 font-mono font-bold">{c.code}</td>
                    <td className="px-4 py-3">{c.discountType === "PERCENT" ? `${c.discountValue}%` : `${(c.discountValue / 1000).toFixed(0)} DT`}</td>
                    <td className="px-4 py-3">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</td>
                    <td className="px-4 py-3">{c.minAmountMillimes ? `${(c.minAmountMillimes / 1000).toFixed(0)} DT` : "—"}</td>
                    <td className="px-4 py-3">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("fr-TN") : "—"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(c)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${c.active ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-500/20 text-slate-400"}`}
                      >
                        {c.active ? "Actif" : "Inactif"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => deleteCoupon(c.id)} className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-500/10" title="Supprimer">
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
