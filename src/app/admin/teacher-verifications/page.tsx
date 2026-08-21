
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";


type TeacherApplicant = {
  id: string;
  userId: string;
  slug: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  bio: string;
  experienceYears: number;
  hourlyRateTnd: number;
  hourlyRateMillimes: number;
  governorate: string;
  city: string;
  online: boolean;
  inPerson: boolean;
  verificationStatus: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED";
  subjects: string[];
  createdAt: string;
};

export default function AdminTeacherVerificationsPage() {
  const [teachers, setTeachers] = useState<TeacherApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("PENDING");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");

  function loadTeachers() {
    setLoading(true);
    fetch("/api/admin/teachers")
      .then((res) => (res.ok ? res.json() : { teachers: [] }))
      .then((data) => {
        setTeachers(data.teachers || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadTeachers();
  }, []);

  async function updateStatus(teacherId: string, status: string) {
    setActionLoading(teacherId);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/teachers/${teacherId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Succès : ${data.message}`);
        setTeachers((prev) =>
          prev.map((t) => (t.id === teacherId ? { ...t, verificationStatus: status as never } : t))
        );
      } else {
        setMessage(`Erreur : ${data.error || "Impossible de mettre à jour le statut."}`);
      }
    } catch {
      setMessage("Erreur de connexion.");
    } finally {
      setActionLoading(null);
    }
  }

  const filteredTeachers =
    filter === "ALL" ? teachers : teachers.filter((t) => t.verificationStatus === filter);

  const pendingCount = teachers.filter((t) => t.verificationStatus === "PENDING").length;
  const underReviewCount = teachers.filter((t) => t.verificationStatus === "UNDER_REVIEW").length;
  const approvedCount = teachers.filter((t) => t.verificationStatus === "APPROVED").length;
  const rejectedCount = teachers.filter((t) => t.verificationStatus === "REJECTED").length;

  return (
    <main className="min-h-screen bg-[#101b2d] px-4 py-8 sm:px-6 sm:py-10 text-white">
      <div className="mx-auto max-w-7xl">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-4">
            <a href="/admin" className="flex items-center gap-1 font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-tight">
              <span>ProfySpace</span>
              <span className="rounded-md bg-[#72d6bf] px-1.5 py-0.5 text-xs font-extrabold text-[#101b2d]">.admin</span>
            </a>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">
              Vérification des candidatures
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/admin"
              className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
            >
              ← Retour au Dashboard
            </a>
            <a
              href="/admin/teachers"
              className="rounded-full bg-[#72d6bf] px-4 py-2 text-xs font-bold text-[#101b2d] transition hover:bg-[#5ec4ad]"
            >
              Tous les professeurs
            </a>
          </div>
        </div>

        {/* Page Title */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#72d6bf]">Administration · RBAC</p>
            <h1 className="mt-1 text-3xl font-bold">Candidatures professeurs</h1>
            <p className="mt-1 text-sm text-slate-400">
              Examinez, validez ou rejetez les dossiers des nouveaux professeurs inscrits sur la plateforme.
            </p>
          </div>

          <button
            onClick={loadTeachers}
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold transition hover:bg-white/20"
          >
            🔄 Actualiser
          </button>
        </div>

        {message && (
          <div className="mt-6 rounded-2xl border border-white/20 bg-white/10 p-4 text-sm font-semibold">
            {message}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mt-8 flex flex-wrap gap-2 border-b border-white/10 pb-4">
          <button
            onClick={() => setFilter("PENDING")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filter === "PENDING" ? "bg-amber-400 text-slate-900" : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            En attente ({pendingCount})
          </button>
          <button
            onClick={() => setFilter("UNDER_REVIEW")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filter === "UNDER_REVIEW" ? "bg-blue-400 text-slate-900" : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            En cours d'examen ({underReviewCount})
          </button>
          <button
            onClick={() => setFilter("APPROVED")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filter === "APPROVED" ? "bg-emerald-400 text-slate-900" : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            Approuvés ({approvedCount})
          </button>
          <button
            onClick={() => setFilter("REJECTED")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filter === "REJECTED" ? "bg-rose-400 text-slate-900" : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            Rejetés ({rejectedCount})
          </button>
          <button
            onClick={() => setFilter("ALL")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filter === "ALL" ? "bg-white text-slate-900" : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            Tous ({teachers.length})
          </button>
        </div>

        {/* List of Applications */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#72d6bf] border-t-transparent mx-auto"></div>
            <p className="mt-4 text-sm text-slate-400">Chargement des candidatures...</p>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-white/10 bg-white/[.03] py-16 text-center">
            <span className="text-4xl">📭</span>
            <p className="mt-3 text-lg font-bold">Aucune candidature dans cette catégorie.</p>
            <p className="mt-1 text-sm text-slate-400">Les nouvelles inscriptions de professeurs apparaîtront ici.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {filteredTeachers.map((t) => (
              <div
                key={t.id}
                className="rounded-3xl border border-white/10 bg-white/[.05] p-6 shadow-xl transition hover:border-white/20"
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-white/10 pb-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold">{t.name}</h2>
                      <span
                        className={`rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${
                          t.verificationStatus === "APPROVED"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : t.verificationStatus === "PENDING"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : t.verificationStatus === "UNDER_REVIEW"
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        }`}
                      >
                        {t.verificationStatus}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#72d6bf] font-semibold">{t.title}</p>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-300">
                      <span>📧 {t.email}</span>
                      <span>📞 {t.phone}</span>
                      <span>📍 {t.city ? `${t.city}, ${t.governorate}` : t.governorate}</span>
                      <span>🎓 Expérience : {t.experienceYears} ans</span>
                      <span>💰 Tarif : {t.hourlyRateTnd} DT / h</span>
                    </div>
                  </div>

                  {/* Actions Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {t.verificationStatus !== "APPROVED" && (
                      <button
                        onClick={() => updateStatus(t.id, "APPROVED")}
                        disabled={actionLoading === t.id}
                        className="rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
                      >
                        ✅ Approuver
                      </button>
                    )}

                    {t.verificationStatus !== "UNDER_REVIEW" && (
                      <button
                        onClick={() => updateStatus(t.id, "UNDER_REVIEW")}
                        disabled={actionLoading === t.id}
                        className="rounded-xl bg-blue-500/20 border border-blue-500/40 px-3.5 py-2.5 text-xs font-bold text-blue-300 transition hover:bg-blue-500/30 disabled:opacity-50"
                      >
                        🔍 En examen
                      </button>
                    )}

                    {t.verificationStatus !== "REJECTED" && (
                      <button
                        onClick={() => updateStatus(t.id, "REJECTED")}
                        disabled={actionLoading === t.id}
                        className="rounded-xl bg-rose-500/20 border border-rose-500/40 px-3.5 py-2.5 text-xs font-bold text-rose-300 transition hover:bg-rose-500/30 disabled:opacity-50"
                      >
                        ❌ Rejeter
                      </button>
                    )}

                    {t.slug && (
                      <a
                        href={`/teachers/${t.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-white/10 px-3.5 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-white/20"
                      >
                        Fiche ↗
                      </a>
                    )}
                  </div>
                </div>

                {/* Details Section */}
                <div className="mt-4 grid gap-4 lg:grid-cols-3 text-sm">
                  <div className="lg:col-span-2 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Présentation & Pédagogie</p>
                    <p className="rounded-2xl bg-black/20 p-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {t.bio || "Aucune description fournie pour le moment."}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Matières enseignées</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {t.subjects.length > 0 ? (
                          t.subjects.map((s) => (
                            <span key={s} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold">
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">Aucune matière</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Formats acceptés</p>
                      <div className="mt-1 flex gap-2 text-xs">
                        {t.online && <span className="rounded-lg bg-emerald-500/20 text-emerald-300 px-2.5 py-1">🌐 En ligne</span>}
                        {t.inPerson && <span className="rounded-lg bg-blue-500/20 text-blue-300 px-2.5 py-1">🏠 Présentiel</span>}
                      </div>
                    </div>
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
