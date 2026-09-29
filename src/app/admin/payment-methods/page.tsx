/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconPlus, IconTrash, IconEdit } from "@/components/icons";

type PaymentMethod = {
  id: string;
  name: string;
  recipientTitle: string;
  recipientValue: string | null;
  instructions: string;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
};

const emptyForm = { name: "", recipientTitle: "", recipientValue: "", instructions: "" };

export default function AdminPaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function loadMethods() {
    setLoading(true);
    fetch("/api/admin/payment-methods")
      .then((res) => (res.ok ? res.json() : { methods: [] }))
      .then((data) => setMethods(data.methods || []))
      .catch(() => setError("Impossible de charger les méthodes de paiement."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadMethods();
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
    setError("");
  }

  function startEdit(m: PaymentMethod) {
    setEditingId(m.id);
    setForm({ name: m.name, recipientTitle: m.recipientTitle, recipientValue: m.recipientValue || "", instructions: m.instructions });
    setFormOpen(true);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const url = editingId ? `/api/admin/payment-methods/${editingId}` : "/api/admin/payment-methods";
    const res = await fetch(url, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setFormOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      loadMethods();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error || "Erreur lors de l'enregistrement.");
    }
  }

  async function toggleEnabled(m: PaymentMethod) {
    await fetch(`/api/admin/payment-methods/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !m.enabled }),
    });
    loadMethods();
  }

  async function deleteMethod(id: string) {
    await fetch(`/api/admin/payment-methods/${id}`, { method: "DELETE" });
    setConfirmDeleteId(null);
    loadMethods();
  }

  return (
    <main className="min-h-screen bg-[#101b2d] px-4 py-8 sm:px-6 sm:py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h1 className="text-3xl font-bold">Méthodes de paiement</h1>
            <p className="mt-1 text-sm text-slate-400">
              Moyens proposés aux élèves pour recharger leur portefeuille. Ajoutez, modifiez ou désactivez librement.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={startCreate}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#72d6bf] px-5 py-2.5 text-sm font-bold text-[#101b2d] transition hover:bg-[#5ec4ad]"
            >
              <IconPlus className="h-4 w-4" />
              Nouvelle méthode
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
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Nom de la méthode *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Ooredoo Money"
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:border-[#72d6bf]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Intitulé du destinataire *</label>
              <input
                type="text"
                required
                value={form.recipientTitle}
                onChange={(e) => setForm({ ...form, recipientTitle: e.target.value })}
                placeholder="Ex: Numéro Ooredoo Money"
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:border-[#72d6bf]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Valeur (numéro / RIB, optionnel)</label>
              <input
                type="text"
                value={form.recipientValue}
                onChange={(e) => setForm({ ...form, recipientValue: e.target.value })}
                placeholder="Ex: 21000319"
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:border-[#72d6bf]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Instructions pour l'élève *</label>
              <textarea
                required
                rows={3}
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                placeholder="Ex : Transférez le montant vers ce numéro puis saisissez la référence reçue."
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:border-[#72d6bf]"
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <button type="submit" className="rounded-xl bg-[#72d6bf] px-5 py-2.5 text-xs font-bold text-[#101b2d]">
                {editingId ? "Enregistrer" : "Créer"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false);
                  setEditingId(null);
                }}
                className="rounded-xl border border-white/20 px-5 py-2.5 text-xs font-bold text-white"
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 overflow-x-auto rounded-3xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[.03] text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Méthode</th>
                <th className="px-4 py-3">Destinataire</th>
                <th className="px-4 py-3">Valeur</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Chargement...</td></tr>
              ) : methods.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Aucune méthode de paiement configurée.</td></tr>
              ) : (
                methods.map((m) => (
                  <tr key={m.id} className="hover:bg-white/[.02]">
                    <td className="px-4 py-3 font-bold">{m.name}</td>
                    <td className="px-4 py-3 text-slate-300">{m.recipientTitle}</td>
                    <td className="px-4 py-3 font-mono text-slate-300">{m.recipientValue || "—"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleEnabled(m)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${m.enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-500/20 text-slate-400"}`}
                      >
                        {m.enabled ? "Actif" : "Désactivé"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => startEdit(m)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" title="Modifier">
                          <IconEdit className="h-4 w-4" />
                        </button>
                        {confirmDeleteId === m.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => deleteMethod(m.id)} className="rounded-lg bg-rose-500/20 px-2 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-500/30">
                              Confirmer
                            </button>
                            <button onClick={() => setConfirmDeleteId(null)} className="rounded-lg bg-white/10 px-2 py-1 text-[11px] font-bold text-slate-300 hover:bg-white/20">
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(m.id)} className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-500/10" title="Supprimer">
                            <IconTrash className="h-4 w-4" />
                          </button>
                        )}
                      </div>
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
