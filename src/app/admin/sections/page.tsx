/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { IconPlus, IconTrash, IconEdit } from "@/components/icons";

type Section = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
};

export default function AdminSectionsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", active: true });

  function loadSections() {
    setLoading(true);
    fetch("/api/admin/bac-sections")
      .then((res) => (res.ok ? res.json() : { sections: [] }))
      .then((data) => setSections(data.sections || []))
      .catch(() => setError("Impossible de charger les sections."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadSections();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const method = editingId ? "PATCH" : "POST";
      const url = editingId ? `/api/admin/bac-sections/${editingId}` : "/api/admin/bac-sections";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        loadSections();
        setFormOpen(false);
        setEditingId(null);
        setForm({ name: "", slug: "", active: true });
      } else {
        setError(data.error || "Erreur lors de l'enregistrement.");
      }
    } catch {
      setError("Erreur de connexion au serveur.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette section ?")) return;
    try {
      const res = await fetch(`/api/admin/bac-sections/${id}`, { method: "DELETE" });
      if (res.ok) loadSections();
    } catch {}
  }

  function startEdit(section: Section) {
    setEditingId(section.id);
    setForm({ name: section.name, slug: section.slug, active: section.active });
    setFormOpen(true);
  }

  return (
    <main className="min-h-screen bg-[#101b2d] px-4 py-8 sm:px-6 sm:py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h1 className="text-3xl font-bold">Sections BAC</h1>
            <p className="mt-1 text-sm text-slate-400">Gère les sections du baccalauréat tunisien</p>
          </div>
          <button
            onClick={() => { setFormOpen(true); setEditingId(null); setForm({ name: "", slug: "", active: true }); }}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#72d6bf] px-5 py-2.5 text-sm font-bold text-[#101b2d] transition hover:bg-[#5ec4ad]"
          >
            <IconPlus className="h-4 w-4" />
            Ajouter une section
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-300">
            {error}
          </div>
        )}

        {formOpen && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[.04] p-6">
            <h2 className="text-xl font-bold mb-4">{editingId ? "Modifier la section" : "Nouvelle section"}</h2>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Nom *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:border-[#72d6bf]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Slug *</label>
                <input
                  type="text"
                  required
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:border-[#72d6bf]"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="active"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-[#72d6bf] focus:ring-[#72d6bf]"
                />
                <label htmlFor="active" className="text-sm font-medium text-slate-300 cursor-pointer select-none">
                  Section active
                </label>
              </div>
              <div className="flex gap-3 sm:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#72d6bf] px-6 py-2.5 text-sm font-bold text-[#101b2d] transition hover:bg-[#5ec4ad] disabled:opacity-50"
                >
                  {saving ? "Enregistrement..." : editingId ? "Mettre à jour" : "Créer"}
                </button>
                <button
                  type="button"
                  onClick={() => { setFormOpen(false); setEditingId(null); }}
                  className="rounded-xl border border-white/20 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="mt-6 text-center text-sm text-slate-400">Chargement...</div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((section) => (
              <div
                key={section.id}
                className={`rounded-3xl border p-5 shadow-sm ${section.active ? "border-white/10 bg-white/[.04]" : "border-white/5 bg-white/[.02] opacity-60"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-base">{section.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">Slug: {section.slug}</p>
                    <span className={`inline-block mt-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${section.active ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-500/20 text-slate-400"}`}>
                      {section.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(section)}
                      className="rounded-xl bg-white/10 p-2 text-white transition hover:bg-white/20"
                      title="Modifier"
                    >
                      <IconEdit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(section.id)}
                      className="rounded-xl bg-rose-500/20 p-2 text-rose-300 transition hover:bg-rose-500/30"
                      title="Supprimer"
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
