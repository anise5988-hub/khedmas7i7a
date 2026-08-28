"use client";

import { useEffect, useState, useRef } from "react";
import { SiteNavbar } from "@/components/site-navbar";

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
  teacherName: string;
  submission: Submission | null;
};

function getAuthHeaders(): Record<string, string> {
  const userId = typeof window !== "undefined" ? localStorage.getItem("profyspace_user_id") || "" : "";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (userId) headers["x-user-id"] = userId;
  return headers;
}

export default function StudentHomeworkPage() {
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, { url: string; name: string }>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function loadHomework() {
    fetch("/api/student/homework", { headers: getAuthHeaders() })
      .then((res) => (res.ok ? res.json() : { homework: [] }))
      .then((data) => setHomework(data.homework || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadHomework();
  }, []);

  async function handleFileSelect(homeworkId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId(homeworkId);
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
        setUploadedFiles((prev) => ({ ...prev, [homeworkId]: { url: data.url, name: data.name || file.name } }));
      }
    } catch {} finally {
      setUploadingId(null);
    }
  }

  async function handleSubmit(homeworkId: string) {
    const comment = (comments[homeworkId] || "").trim();
    const file = uploadedFiles[homeworkId];
    if (!comment && !file) return;
    setSubmittingId(homeworkId);
    try {
      const res = await fetch(`/api/homework/${homeworkId}/submit`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ comment: comment || null, fileUrl: file?.url || null, fileName: file?.name || null }),
      });
      if (res.ok) {
        loadHomework();
      }
    } catch {} finally {
      setSubmittingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <SiteNavbar dark={false} />

      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="text-3xl font-bold">Mes devoirs</h1>
        <p className="mt-1 text-sm text-slate-500">Devoirs assignés par vos professeurs.</p>

        {loading ? (
          <div className="py-20 text-center text-slate-400">Chargement des devoirs...</div>
        ) : homework.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <h2 className="text-lg font-bold">Aucun devoir pour le moment.</h2>
            <p className="mt-1 text-xs text-slate-500">Vos devoirs apparaîtront ici dès qu&apos;un professeur vous en assigne un.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {homework.map((h) => {
              const isOverdue = h.deadline && !h.submission && new Date(h.deadline) < new Date();
              return (
                <div key={h.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-base">{h.title}</h3>
                      <p className="text-xs text-slate-500">
                        Par {h.teacherName}
                        {h.deadline && ` · À rendre avant le ${new Date(h.deadline).toLocaleDateString("fr-TN")}`}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                      h.submission
                        ? h.submission.feedback ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                        : isOverdue ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"
                    }`}>
                      {h.submission ? (h.submission.feedback ? "Corrigé" : "Soumis") : isOverdue ? "En retard" : "À faire"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{h.description}</p>
                  {h.fileUrl && (
                    <a href={h.fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-[#0d8d78] hover:underline">
                       {h.fileName || "Fichier joint par le professeur"}
                    </a>
                  )}

                  {h.submission ? (
                    <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Votre soumission</p>
                      {h.submission.comment && <p className="text-sm text-slate-700">{h.submission.comment}</p>}
                      {h.submission.fileUrl && (
                        <a href={h.submission.fileUrl} target="_blank" rel="noreferrer" className="inline-block text-xs font-semibold text-[#0d8d78] hover:underline">
                           {h.submission.fileName || "Votre fichier"}
                        </a>
                      )}
                      {h.submission.feedback && (
                        <div className="mt-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                          <p className="text-xs font-bold text-emerald-700">Correction du professeur :</p>
                          <p className="text-sm text-emerald-800">{h.submission.feedback}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                      <textarea
                        rows={2}
                        value={comments[h.id] || ""}
                        onChange={(e) => setComments((prev) => ({ ...prev, [h.id]: e.target.value }))}
                        placeholder="Votre réponse ou commentaire..."
                        className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-[#0d8d78]"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="file"
                          ref={(el) => { fileInputRefs.current[h.id] = el; }}
                          onChange={(e) => handleFileSelect(h.id, e)}
                          accept="application/pdf,image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRefs.current[h.id]?.click()}
                          disabled={uploadingId === h.id}
                          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          {uploadingId === h.id ? "Envoi..." : uploadedFiles[h.id] ? ` ${uploadedFiles[h.id].name}` : "Joindre un fichier"}
                        </button>
                        <button
                          onClick={() => handleSubmit(h.id)}
                          disabled={submittingId === h.id || (!(comments[h.id] || "").trim() && !uploadedFiles[h.id])}
                          className="rounded-xl bg-[#0d8d78] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0b7866] disabled:opacity-50"
                        >
                          {submittingId === h.id ? "Envoi..." : "Soumettre →"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
