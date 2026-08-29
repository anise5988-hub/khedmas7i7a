/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";


type Teacher = {
  id: string;
  userId: string;
  slug: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  experienceYears: number;
  hourlyRateTnd: number;
  hourlyRateMillimes: number;
  governorate: string;
  city: string;
  online: boolean;
  inPerson: boolean;
  verificationStatus: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED";
  subjects: string[];
  bookingsCount: number;
  createdAt: string;
};

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  function exportToCsv() {
    if (teachers.length === 0) return;
    const headers = ["Nom", "Email", "Telephone", "Titre", "Experience (ans)", "Tarif TND", "Gouvernorat", "Statut", "Matieres", "Seances Reservees"];
    const rows = teachers.map((t) => [
      `"${t.name.replace(/"/g, '""')}"`,
      `"${t.email}"`,
      `"${t.phone || ""}"`,
      `"${(t.title || "").replace(/"/g, '""')}"`,
      t.experienceYears,
      t.hourlyRateTnd,
      `"${t.governorate}"`,
      t.verificationStatus,
      `"${t.subjects.join(", ")}"`,
      t.bookingsCount,
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `professeurs-profyspace-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function loadTeachers() {
    setLoading(true);
    fetch("/api/admin/teachers")
      .then((res) => (res.ok ? res.json() : { teachers: [] }))
      .then((data) => setTeachers(data.teachers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadTeachers();
  }, []);

  async function updateStatus(teacherId: string, status: string) {
    setActionLoading(teacherId);
    try {
      const res = await fetch(`/api/admin/teachers/${teacherId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setTeachers((prev) =>
          prev.map((t) => (t.id === teacherId ? { ...t, verificationStatus: status as never } : t))
        );
      }
    } catch {}
    setActionLoading(null);
  }

  const filtered = teachers.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      t.subjects.some((s) => s.toLowerCase().includes(search.toLowerCase())) ||
      t.governorate.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || t.verificationStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
              Annuaire Professeurs
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/admin/teacher-verifications"
              className="rounded-full bg-[#72d6bf] px-4 py-2 text-xs font-bold text-[#101b2d] transition hover:bg-[#5ec4ad]"
            >
              Candidatures à valider
            </a>
            <a
              href="/admin"
              className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
            >
              Dashboard
            </a>
          </div>
        </div>

        {/* Title & Filters */}
        <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Tous les professeurs ({teachers.length})</h1>
            <p className="mt-1 text-sm text-slate-400">Gérez le catalogue des enseignants inscrits sur Profy.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={exportToCsv}
              className="rounded-xl border border-white/20 bg-emerald-600/20 px-3.5 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-600/30 transition"
            >
              📊 Exporter CSV
            </button>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher nom, matière, ville..."
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-[#72d6bf]"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-white/20 bg-[#17253b] px-3 py-2 text-xs text-white outline-none"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="APPROVED">Approuvés</option>
              <option value="PENDING">En attente</option>
              <option value="UNDER_REVIEW">En cours d'examen</option>
              <option value="REJECTED">Rejetés</option>
              <option value="SUSPENDED">Suspendus</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="mt-6 overflow-x-auto rounded-3xl border border-white/10 bg-white/[.04] p-2">
          {loading ? (
            <div className="py-20 text-center text-slate-400">Chargement des données...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">Aucun professeur trouvé.</div>
          ) : (
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-white/10 text-xs font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Professeur</th>
                  <th className="px-4 py-3">Matières</th>
                  <th className="px-4 py-3">Localisation</th>
                  <th className="px-4 py-3">Tarif / h</th>
                  <th className="px-4 py-3">Séances</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((t) => (
                  <tr key={t.id} className="transition hover:bg-white/[.03]">
                    <td className="px-4 py-4">
                      <div className="font-bold text-white">{t.name}</div>
                      <div className="text-xs text-slate-400">{t.email} · {t.phone}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {t.subjects.slice(0, 2).map((s) => (
                          <span key={s} className="rounded bg-white/10 px-2 py-0.5 text-xs text-slate-200">
                            {s}
                          </span>
                        ))}
                        {t.subjects.length > 2 && (
                          <span className="text-xs text-slate-400">+{t.subjects.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs">{t.governorate}</td>
                    <td className="px-4 py-4 font-bold text-white">{t.hourlyRateTnd} DT</td>
                    <td className="px-4 py-4 text-xs">{t.bookingsCount} cours</td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          t.verificationStatus === "APPROVED"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : t.verificationStatus === "PENDING"
                            ? "bg-amber-500/20 text-amber-300"
                            : t.verificationStatus === "UNDER_REVIEW"
                            ? "bg-blue-500/20 text-blue-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {t.verificationStatus}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <select
                        value={t.verificationStatus}
                        onChange={(e) => updateStatus(t.id, e.target.value)}
                        disabled={actionLoading === t.id}
                        className="rounded-lg border border-white/20 bg-[#1b2b42] px-2 py-1 text-xs text-white outline-none"
                      >
                        <option value="APPROVED">Approuver</option>
                        <option value="PENDING">En attente</option>
                        <option value="UNDER_REVIEW">En examen</option>
                        <option value="REJECTED">Rejeter</option>
                        <option value="SUSPENDED">Suspendre</option>
                      </select>
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
