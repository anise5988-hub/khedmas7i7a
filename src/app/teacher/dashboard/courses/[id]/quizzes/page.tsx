"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { SiteNavbar } from "@/components/site-navbar";

type QuestionForm = { text: string; options: string[]; correctIndex: number };

type Quiz = {
  id: string;
  title: string;
  createdAt: string;
  questionCount: number;
  questions: { id: string; text: string; options: string[]; correctIndex: number }[];
  attemptCount: number;
  averageScore: number | null;
};

function getAuthHeaders(): Record<string, string> {
  const userId = typeof window !== "undefined" ? localStorage.getItem("profyspace_user_id") || "" : "";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (userId) headers["x-user-id"] = userId;
  return headers;
}

function emptyQuestion(): QuestionForm {
  return { text: "", options: ["", ""], correctIndex: 0 };
}

export default function TeacherCourseQuizzesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = use(params);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<QuestionForm[]>([emptyQuestion()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function loadQuizzes() {
    fetch(`/api/teacher/courses/${courseId}/quizzes`, { headers: getAuthHeaders() })
      .then((res) => (res.ok ? res.json() : { quizzes: [] }))
      .then((data) => setQuizzes(data.quizzes || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadQuizzes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  function updateQuestion(index: number, patch: Partial<QuestionForm>) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function updateOption(qIndex: number, oIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIndex ? { ...q, options: q.options.map((o, j) => (j === oIndex ? value : o)) } : q)),
    );
  }

  function addOption(qIndex: number) {
    setQuestions((prev) => prev.map((q, i) => (i === qIndex ? { ...q, options: [...q.options, ""] } : q)));
  }

  function removeOption(qIndex: number, oIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex && q.options.length > 2
          ? {
              ...q,
              options: q.options.filter((_, j) => j !== oIndex),
              correctIndex: q.correctIndex >= oIndex && q.correctIndex > 0 ? q.correctIndex - 1 : q.correctIndex,
            }
          : q,
      ),
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Le titre du quiz est requis.");
      return;
    }
    if (questions.some((q) => !q.text.trim() || q.options.some((o) => !o.trim()))) {
      setError("Chaque question doit avoir un énoncé et toutes ses options remplies.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/quizzes`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ title: title.trim(), questions }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Impossible de créer le quiz.");
        return;
      }
      setShowForm(false);
      setTitle("");
      setQuestions([emptyQuestion()]);
      loadQuizzes();
    } catch {
      setError("Erreur de connexion au serveur.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <SiteNavbar dark={false} />

      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/teacher/dashboard/courses" className="text-xs font-bold text-slate-500 hover:underline">
          ← Retour à mes cours
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Quiz du cours</h1>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-2xl bg-[#0d8d78] px-5 py-3 text-xs font-bold text-white shadow-md transition hover:bg-[#0b7866]"
          >
            {showForm ? "Annuler" : "+ Créer un quiz"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="mt-6 space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Titre du quiz *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Quiz - Chapitre 3"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#0d8d78]"
              />
            </div>

            {questions.map((q, qIndex) => (
              <div key={qIndex} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Question {qIndex + 1}</span>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qIndex))}
                      className="text-xs font-bold text-rose-600 hover:underline"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={q.text}
                  onChange={(e) => updateQuestion(qIndex, { text: e.target.value })}
                  placeholder="Énoncé de la question"
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#0d8d78]"
                />
                <div className="space-y-2">
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${qIndex}`}
                        checked={q.correctIndex === oIndex}
                        onChange={() => updateQuestion(qIndex, { correctIndex: oIndex })}
                        className="h-4 w-4 text-[#0d8d78]"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        placeholder={`Option ${oIndex + 1}`}
                        className="flex-1 rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-[#0d8d78]"
                      />
                      {q.options.length > 2 && (
                        <button type="button" onClick={() => removeOption(qIndex, oIndex)} className="text-xs text-slate-400 hover:text-rose-600">
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => addOption(qIndex)} className="text-xs font-bold text-[#0d8d78] hover:underline">
                    + Ajouter une option
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">Cochez la bonne réponse à gauche de l&apos;option.</p>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
              className="w-full rounded-xl border border-dashed border-slate-300 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50"
            >
              + Ajouter une question
            </button>

            {error && <p className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-[#0d8d78] py-3.5 text-center font-bold text-white shadow-md transition hover:bg-[#0b7866] disabled:opacity-50"
            >
              {submitting ? "Création..." : "Créer le quiz →"}
            </button>
          </form>
        )}

        {loading ? (
          <div className="py-20 text-center text-slate-400">Chargement des quiz...</div>
        ) : quizzes.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <h2 className="text-lg font-bold">Aucun quiz pour ce cours.</h2>
            <p className="mt-1 text-xs text-slate-500">Créez un quiz pour évaluer vos élèves sur ce cours.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {quizzes.map((q) => (
              <div key={q.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-bold text-base">{q.title}</h3>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {q.questionCount} question{q.questionCount > 1 ? "s" : ""}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {q.attemptCount} tentative{q.attemptCount !== 1 ? "s" : ""}
                  {q.averageScore !== null && ` · Score moyen : ${q.averageScore}%`}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
