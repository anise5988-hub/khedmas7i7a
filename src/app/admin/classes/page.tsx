/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Course } from "@/lib/server/courses-store";
import { IconBookOpen, IconSearch, IconTrash } from "@/components/icons";

export default function AdminClassesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  function loadCourses() {
    setLoading(true);
    fetch("/api/courses")
      .then((res) => (res.ok ? res.json() : { courses: [] }))
      .then((data) => {
        setCourses(data.courses || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadCourses();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce cours ?")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/courses/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCourses((prev) => prev.filter((c) => c.id !== id));
      }
    } catch {} finally {
      setActionLoading(null);
    }
  }

  const filtered = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.teacherName.toLowerCase().includes(search.toLowerCase()) ||
      c.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#101b2d] px-4 py-8 sm:px-6 sm:py-10 text-white">
      <div className="mx-auto max-w-7xl">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-1 font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-tight">
              <span>ProfySpace</span>
              <span className="rounded-md bg-[#72d6bf] px-1.5 py-0.5 text-xs font-extrabold text-[#101b2d]">.admin</span>
            </Link>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">
              Supervision des Cours & Packs
            </span>
          </div>

          <Link
            href="/admin"
            className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
          >
            ← Retour au Dashboard
          </Link>
        </div>

        {/* Page Title */}
        <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#72d6bf]">Catalogue & Packs</p>
            <h1 className="mt-1 text-3xl font-bold">Tous les cours de la plateforme ({courses.length})</h1>
            <p className="mt-1 text-sm text-slate-400">
              Supervisez les packs e-learning et les leçons vidéo publiés par les enseignants.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <IconSearch className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher cours, matière, prof..."
                className="rounded-xl border border-white/20 bg-white/10 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-[#72d6bf]"
              />
            </div>
            <button
              onClick={loadCourses}
              className="rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-bold hover:bg-white/20 transition"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="mt-8 overflow-x-auto rounded-3xl border border-white/10 bg-white/[.04] p-2 shadow-xl">
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#72d6bf] border-t-transparent mx-auto mb-2" />
              Chargement des cours...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 mb-2">
                <IconBookOpen className="h-6 w-6" />
              </div>
              <p className="text-base font-bold text-white">Aucun cours trouvé</p>
              <p className="text-xs text-slate-400 mt-1">Les cours créés par les professeurs apparaîtront ici.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-white/10 text-xs font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3.5">Cours</th>
                  <th className="px-4 py-3.5">Professeur</th>
                  <th className="px-4 py-3.5">Matière / Niveau</th>
                  <th className="px-4 py-3.5">Leçons</th>
                  <th className="px-4 py-3.5">Tarif (DT)</th>
                  <th className="px-4 py-3.5">Élèves</th>
                  <th className="px-4 py-3.5">Visibilité</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((c) => (
                  <tr key={c.id} className="transition hover:bg-white/[.03]">
                    <td className="px-4 py-4">
                      <p className="font-bold text-white max-w-xs truncate">{c.title}</p>
                      <p className="text-xs text-slate-400 line-clamp-1">{c.description}</p>
                    </td>
                    <td className="px-4 py-4 text-xs font-semibold text-[#72d6bf]">{c.teacherName}</td>
                    <td className="px-4 py-4 text-xs">
                      <span className="rounded-lg bg-white/10 px-2 py-0.5 text-[11px] font-semibold">
                        {c.subject} · {c.level}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs font-mono">{c.totalLessons} ({c.durationMinutes} min)</td>
                    <td className="px-4 py-4 font-bold text-[#72d6bf]">{c.priceTnd} DT</td>
                    <td className="px-4 py-4 text-xs">{c.studentCount} inscrits</td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          c.visibility === "PUBLIC"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : c.visibility === "LOCKED"
                            ? "bg-blue-500/20 text-blue-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {c.visibility}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/courses/${c.id}`}
                          target="_blank"
                          className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-slate-300 hover:bg-white/20"
                        >
                          Voir ↗
                        </Link>
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={actionLoading === c.id}
                          className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-1.5 text-rose-300 hover:bg-rose-500/20 transition"
                          title="Supprimer le cours"
                        >
                          <IconTrash className="h-3.5 w-3.5" />
                        </button>
                      </div>
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