/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useRef } from "react";
import { SiteNavbar } from "@/components/site-navbar";

type StudentOption = { id: string; name: string };

type Submission = {
  fileUrl: string | null;
  fileName: string | null;
  comment: string | null;
  submittedAt: string;
  feedback: string | null;
  gradedAt: string | null;
};

type HomeworkItem = {
  id: string;
  title: string;
  description: string;
  fileUrl: string | null;
  fileName: string | null;
  deadline: string | null;
  createdAt: string;
  studentId: string;
  studentName: string;
  submission: Submission | null;
};

function getAuthHeaders(): Record<string, string> {
  const userId = typeof window !== "undefined" ? localStorage.getItem("profyspace_user_id") || "" : "";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (userId) headers["x-user-id"] = userId;
  return headers;
}

export default function TeacherHomeworkPage() {
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [feedbackPendingId, setFeedbackPendingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function loadHomework() {
    fetch("/api/teacher/homework", { headers: getAuthHeaders() })
      .then((res) => (res.ok ? res.json() : { homework: [] }))
      .then((data) => setHomework(data.homework || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadHomework();
    fetch("/api/teacher/profile", { headers: getAuthHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.teacher?.bookings) {
          const map = new Map<string, StudentOption>();
          data.teacher.bookings.forEach((b: any) => {
            if (!map.has(b.student.id)) {
              map.set(b.student.id, { id: b.student.id, name: `${b.student.firstName} ${b.student.lastName}` });
            }
          });
          setStudents(Array.from(map.values()));
        }
      })
      .catch(() => {});
  }, []);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", "pdf");
      const userId = typeof window !== "undefined" ? localStorage.getItem("profyspace_user_id") || "" : "";
      const res = await fetch("/api/uploads/video", {
        method: "POST",
        headers: userId ? { "x-user-id": userId } : undefined,
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setFileUrl(data.url);
        setFileName(data.name || file.name);
      } else {
        setError(data.error || "Impossible d'envoyer le fichier.");
      }
    } catch {
      setError("Erreur de connexion au serveur.");
    } finally {
      setUploading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!studentId || !title.trim() || !description.trim()) {
      setError("Sélectionnez un élève et renseignez le titre et la description.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/teacher/homework", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          studentId,
          title: title.trim(),
          description: description.trim(),
          deadline: deadline || null,
          fileUrl: fileUrl || null,
          fileName: fileName || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Impossible de créer le devoir.");
        return;
      }
      setShowForm(false);
      setStudentId("");
      setTitle("");
      setDescription("");
      setDeadline("");
      setFileUrl("");
      setFileName("");
      loadHomework();
    } catch {
      setError("Erreur de connexion au serveur.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendFeedback(homeworkId: string) {
    const feedback = (feedbackDrafts[homeworkId] || "").trim();
    if (!feedback) return;
    setFeedbackPendingId(homeworkId);
    try {
      const res = await fetch(`/api/homework/${homeworkId}/feedback`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ feedback }),
      });
      if (res.ok) {
        setFeedbackDrafts((prev) => ({ ...prev, [homeworkId]: "" }));
        loadHomework();
      }
    } catch {} finally {
      setFeedbackPendingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <SiteNavbar dark={false} />

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Devoirs assignés</h1>
            <p className="mt-1 text-sm text-slate-500">Assignez des devoirs à vos élèves et corrigez leurs soumissions.</p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-2xl bg-[#0d8d78] px-5 py-3 text-xs font-bold text-white shadow-md transition hover:bg-[#0b7866]"
          >
            {showForm ? "Annuler" : "+ Assigner un devoir"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="mt-6 space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Élève *</label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-[#0d8d78]"
              >
                <option value="">Sélectionnez un élève</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Titre *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Exercices chapitre 3 - Fonctions"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#0d8d78]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Description / Consignes *</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez le travail à faire..."
                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#0d8d78]"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Date limite (optionnel)</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#0d8d78]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Fichier joint (optionnel)</label>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="application/pdf,image/*" className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {uploading ? "Envoi en cours..." : fileName ? ` ${fileName}` : "Choisir un fichier"}
                </button>
              </div>
            </div>
            {error && <p className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-[#0d8d78] py-3.5 text-center font-bold text-white shadow-md transition hover:bg-[#0b7866] disabled:opacity-50"
            >
              {submitting ? "Envoi..." : "Assigner le devoir →"}
            </button>
          </form>
        )}

        {loading ? (
          <div className="py-20 text-center text-slate-400">Chargement des devoirs...</div>
        ) : homework.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <h2 className="text-lg font-bold">Aucun devoir assigné pour le moment.</h2>
            <p className="mt-1 text-xs text-slate-500">Assignez votre premier devoir à l&apos;un de vos élèves.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {homework.map((h) => (
              <div key={h.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-base">{h.title}</h3>
                    <p className="text-xs text-slate-500">Pour {h.studentName} · {new Date(h.createdAt).toLocaleDateString("fr-TN")}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                    h.submission ? (h.submission.feedback ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700") : "bg-amber-100 text-amber-800"
                  }`}>
                    {h.submission ? (h.submission.feedback ? "Corrigé" : "Soumis") : "En attente"}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{h.description}</p>
                {h.fileUrl && (
                  <a href={h.fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-[#0d8d78] hover:underline">
                     {h.fileName || "Fichier joint"}
                  </a>
                )}

                {h.submission && (
                  <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Soumission de l&apos;élève</p>
                    {h.submission.comment && <p className="text-sm text-slate-700">{h.submission.comment}</p>}
                    {h.submission.fileUrl && (
                      <a href={h.submission.fileUrl} target="_blank" rel="noreferrer" className="inline-block text-xs font-semibold text-[#0d8d78] hover:underline">
                         {h.submission.fileName || "Fichier soumis"}
                      </a>
                    )}
                    {h.submission.feedback ? (
                      <div className="mt-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                        <p className="text-xs font-bold text-emerald-700">Votre correction :</p>
                        <p className="text-sm text-emerald-800">{h.submission.feedback}</p>
                      </div>
                    ) : (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={feedbackDrafts[h.id] || ""}
                          onChange={(e) => setFeedbackDrafts((prev) => ({ ...prev, [h.id]: e.target.value }))}
                          placeholder="Écrire une correction..."
                          className="flex-1 rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-[#0d8d78]"
                        />
                        <button
                          onClick={() => handleSendFeedback(h.id)}
                          disabled={feedbackPendingId === h.id || !(feedbackDrafts[h.id] || "").trim()}
                          className="rounded-xl bg-[#0d8d78] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b7866] disabled:opacity-50"
                        >
                          Corriger
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
