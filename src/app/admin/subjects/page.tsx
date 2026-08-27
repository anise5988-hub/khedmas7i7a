/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { IconPlus, IconTrash, IconEdit } from "@/components/icons";

type Subject = {
  id: string;
  name: string;
  cycle: string;
  section: string | null;
  active: boolean;
};

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", cycle: "PRIMARY", section: "", active: true });

  function loadSubjects() {
    setLoading(true);
    fetch("/api/admin/subjects")
      .then((res) => (res.ok ? res.json() : { subjects: [] }))
      .then((data) => setSubjects(data.subjects || []))
      .catch(() => setError("Impossible de charger les matières."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadSubjects();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const method = editingId ? "PATCH" : "POST";
      const url = editingId ? `/api/admin/subjects/${editingId}` : "/api/admin/subjects";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        loadSubjects();
        setFormOpen(false);
        setEditingId(null);
        setForm({ name: "", cycle: "PRIMARY", section: "", active: true });
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
    if (!confirm("Supprimer cette matière ?")) return;
    try {
      const res = await fetch(`/api/admin/subjects/${id}`, { method: "DELETE" });
      if (res.ok) loadSubjects();
    } catch {}
  }

  function startEdit(subject: Subject) {
    setEditingId(subject.id);
    setForm({ name: subject.name, cycle: subject.cycle, section: subject.section || "", active: subject.active });
    setFormOpen(true);
  }

  return (
    <main className="min-h-screen bg-[#101b2d] px-4 py-8 sm:px-6 sm:py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h1 className="text-3xl font-bold">Matières</h1>
            <p className="mt-1 text-sm text-slate-400">Catalogue des matières enseignées sur ProfySpace.tn</p>
          </div>
          <button
            onClick={() => { setFormOpen(true); setEditingId(null); setForm({ name: "", cycle: "PRIMARY", section: "", active: true }); }}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#72d6bf] px-5 py-2.5 text-sm font-bold text-[#101b2d] transition hover:bg-[#5ec4ad]"
          >
            <IconPlus className="h-4 w-4" />
            Ajouter une matière
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-300">
            {error}
          </div>
        )}

        {formOpen && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[.04] p-6">
            <h2 className="text-xl font-bold mb-4">{editingId ? "Modifier la matière" : "Nouvelle matière"}</h2>
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
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Cycle *</label>
                <select
                  value={form.cycle}
                  onChange={(e) => setForm({ ...form, cycle: e.target.value })}
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:border-[#72d6bf]"
                >
                  <option value="PRIMARY">Primaire</option>
                  <option value="BASIC">Base</option>
                  <option value="SECONDARY">Secondaire</option>
                  <option value="UNIVERSITY">Université</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Section BAC</label>
                <input
                  type="text"
                  value={form.section}
                  onChange={(e) => setForm({ ...form, section: e.target.value })}
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
                  Matière active
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
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className={`rounded-3xl border p-5 shadow-sm ${subject.active ? "border-white/10 bg-white/[.04]" : "border-white/5 bg-white/[.02] opacity-60"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-base">{subject.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">Cycle: {subject.cycle}</p>
                    {subject.section && <p className="text-xs text-slate-400">Section: {subject.section}</p>}
                    <span className={`inline-block mt-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${subject.active ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-500/20 text-slate-400"}`}>
                      {subject.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(subject)}
                      className="rounded-xl bg-white/10 p-2 text-white transition hover:bg-white/20"
                      title="Modifier"
                    >
                      <IconEdit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(subject.id)}
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
