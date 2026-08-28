/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteNavbar } from "@/components/site-navbar";
import { VideoPlayer } from "@/components/video-player";
import { Course, Lesson } from "@/lib/server/courses-store";

type QuizAttemptSummary = { id: string; score: number; totalQuestions: number; submittedAt: string };
type QuizQuestionForStudent = { id: string; text: string; options: string[] };
type QuizForStudent = { id: string; title: string; questions: QuizQuestionForStudent[]; attempts: QuizAttemptSummary[] };
type QuizResult = { questionId: string; selected: number; correctIndex: number; isCorrect: boolean };

function getAuthHeadersLocal(): Record<string, string> {
  const userId = typeof window !== "undefined" ? localStorage.getItem("profyspace_user_id") || "" : "";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (userId) headers["x-user-id"] = userId;
  return headers;
}

function QuizCard({ quiz }: { quiz: QuizForStudent }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<QuizResult[] | null>(null);
  const [lastScore, setLastScore] = useState<{ score: number; total: number } | null>(null);
  const [error, setError] = useState("");

  const bestAttempt = quiz.attempts.length > 0 ? quiz.attempts[0] : null;

  async function handleSubmit() {
    if (Object.keys(answers).length !== quiz.questions.length) {
      setError("Répondez à toutes les questions avant de valider.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const orderedAnswers = quiz.questions.map((q) => answers[q.id]);
      const res = await fetch(`/api/quizzes/${quiz.id}/attempt`, {
        method: "POST",
        headers: getAuthHeadersLocal(),
        body: JSON.stringify({ answers: orderedAnswers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Impossible d'envoyer vos réponses.");
        return;
      }
      setResults(data.results);
      setLastScore({ score: data.attempt.score, total: data.attempt.totalQuestions });
    } catch {
      setError("Erreur de connexion.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-bold text-sm text-[#11233f]">{quiz.title}</h4>
        {bestAttempt && !lastScore && (
          <span className="rounded-full bg-[#e5f7f2] px-3 py-1 text-[11px] font-bold text-[#0d8d78]">
            Dernier score : {bestAttempt.score}/{bestAttempt.totalQuestions}
          </span>
        )}
      </div>

      {lastScore ? (
        <div className="rounded-xl bg-white border border-slate-200 p-4 space-y-3">
          <p className="text-sm font-bold text-[#11233f]">
            Résultat : {lastScore.score}/{lastScore.total} ({Math.round((lastScore.score / lastScore.total) * 100)}%)
          </p>
          {quiz.questions.map((q, i) => {
            const result = results?.find((r) => r.questionId === q.id);
            return (
              <div key={q.id} className="text-xs">
                <p className={`font-semibold ${result?.isCorrect ? "text-emerald-700" : "text-rose-700"}`}>
                  {result?.isCorrect ? "✓" : "✕"} {i + 1}. {q.text}
                </p>
                <p className="mt-0.5 text-slate-500">Réponse correcte : {q.options[result?.correctIndex ?? 0]}</p>
              </div>
            );
          })}
          <button
            onClick={() => { setLastScore(null); setResults(null); setAnswers({}); }}
            className="text-xs font-bold text-[#0d8d78] hover:underline"
          >
            Repasser le quiz
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {quiz.questions.map((q, i) => (
            <div key={q.id}>
              <p className="text-xs font-bold text-slate-700">{i + 1}. {q.text}</p>
              <div className="mt-2 space-y-1.5">
                {q.options.map((opt, oIndex) => (
                  <label key={oIndex} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name={`quiz-${quiz.id}-q-${q.id}`}
                      checked={answers[q.id] === oIndex}
                      onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: oIndex }))}
                      className="h-3.5 w-3.5 text-[#0d8d78]"
                    />
                    <span className="text-slate-600">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          {error && <p className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-semibold text-rose-700">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-xl bg-[#0d8d78] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b7866] disabled:opacity-50"
          >
            {submitting ? "Envoi..." : "Valider mes réponses →"}
          </button>
        </div>
      )}
    </div>
  );
}

export function CourseDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [unlockPending, setUnlockPending] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [unlockSuccess, setUnlockSuccess] = useState("");
  const [quizzes, setQuizzes] = useState<QuizForStudent[]>([]);

  function getAuthHeaders(): Record<string, string> {
    const userId = typeof window !== "undefined" ? localStorage.getItem("profyspace_user_id") || "" : "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (userId) headers["x-user-id"] = userId;
    return headers;
  }

  const fetchCourse = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${id}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCourse(data.course);
        setHasAccess(data.hasAccess);

        // Auto select first lesson
        if (data.course?.sections?.length > 0 && data.course.sections[0].lessons?.length > 0) {
          setActiveLesson(data.course.sections[0].lessons[0]);
        }

        if (data.hasAccess) {
          fetch(`/api/courses/${id}/quizzes`, { headers: getAuthHeaders() })
            .then((r) => (r.ok ? r.json() : { quizzes: [] }))
            .then((qd) => setQuizzes(qd.quizzes || []))
            .catch(() => {});
        }
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => fetchCourse());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUnlockCourse = async () => {
    setUnlockError("");
    setUnlockSuccess("");
    setUnlockPending(true);

    try {
      const res = await fetch(`/api/courses/${id}/unlock`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      setUnlockPending(false);

      if (!res.ok) {
        setUnlockError(data.error || "Erreur lors du déblocage.");
        if (data.insufficientBalance) {
          setTimeout(() => {
            router.push("/dashboard/wallet");
          }, 2000);
        }
        return;
      }

      setUnlockSuccess(" Félicitations ! Le cours est débloqué.");
      setHasAccess(true);
      fetchCourse();
    } catch {
      setUnlockPending(false);
      setUnlockError("Erreur de connexion.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800">
        <SiteNavbar />
        <div className="mx-auto max-w-7xl p-8 space-y-6">
          <div className="h-64 rounded-3xl bg-slate-200 animate-pulse" />
          <div className="h-40 rounded-3xl bg-slate-200 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800">
        <SiteNavbar />
        <div className="mx-auto max-w-md py-20 text-center space-y-4">
          <h1 className="text-2xl font-bold text-[#11233f]">Cours introuvable</h1>
          <p className="text-xs text-slate-500">Le cours demandé n'existe pas ou a été retiré.</p>
          <Link href="/courses" className="inline-block rounded-2xl bg-[#0d8d78] px-6 py-3 text-xs font-bold text-white">
            Retour au catalogue →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <SiteNavbar />

      {/* Header Info */}
      <section className="bg-[#11233f] text-white py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="rounded-full bg-[#0d8d78] px-3 py-1 text-white">{course.subject}</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-slate-300">{course.level}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              {course.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
              {course.description}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-slate-300">
              <span> Par <strong className="text-white">{course.teacherName}</strong></span>
              <span> {course.totalLessons} leçons ({course.durationMinutes} min)</span>
              <span> {course.rating} ({course.reviewCount} avis)</span>
              <span> {course.studentCount} élèves inscrits</span>
            </div>
          </div>

          {/* Sticky Unlock Panel Card */}
          <div className="lg:col-span-4 rounded-3xl bg-white p-6 border border-slate-200 text-slate-800 shadow-2xl space-y-4">
            <div className="relative h-44 rounded-2xl overflow-hidden bg-slate-100">
              <img src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover" />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Tarif d'accès</span>
                <span className="text-2xl font-black text-[#0d8d78]">
                  {course.priceTnd > 0 ? `${course.priceTnd} DT` : "Gratuit"}
                </span>
              </div>

              {hasAccess ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-700">
                  ✓ Accès Débloqué
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-800">
                   Contenu Protégé
                </span>
              )}
            </div>

            {unlockError && (
              <p className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-700">
                {unlockError}
              </p>
            )}

            {unlockSuccess && (
              <p className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-700">
                {unlockSuccess}
              </p>
            )}

            {!hasAccess ? (
              <button
                onClick={handleUnlockCourse}
                disabled={unlockPending}
                className="w-full rounded-2xl bg-[#0d8d78] py-4 text-center text-xs font-extrabold text-white shadow-lg transition hover:bg-[#0b7866] disabled:opacity-50"
              >
                {unlockPending ? "Déblocage en cours..." : `Débloquer ce cours (${course.priceTnd} DT) →`}
              </button>
            ) : (
              <a
                href="#player"
                className="block w-full rounded-2xl bg-[#11233f] py-4 text-center text-xs font-extrabold text-white shadow-lg hover:bg-[#1a355e] transition"
              >
                Commencer l'apprentissage ↓
              </a>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <Link href={`/dashboard/messages?teacherId=${course.teacherId}`} className="font-bold text-[#0d8d78] hover:underline">
                 Contacter le prof
              </Link>
              <span>Accès à vie</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Learning / Curriculum Section */}
      <main id="player" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Curriculum Sidebar */}
          <div className="lg:col-span-4 rounded-3xl bg-white p-5 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Programme du cours
            </h2>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {course.sections.map((sec, idx) => (
                <div key={sec.id || idx} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3 space-y-2">
                  <p className="text-xs font-bold text-[#11233f]">{sec.title}</p>
                  <div className="space-y-1">
                    {sec.lessons.map((les) => {
                      const isActive = activeLesson?.id === les.id;
                      const isLocked = !hasAccess && !les.isFreePreview;

                      return (
                        <div
                          key={les.id}
                          onClick={() => setActiveLesson(les)}
                          className={`flex items-center justify-between rounded-xl p-2.5 text-xs cursor-pointer transition ${
                            isActive
                              ? "bg-[#0d8d78] text-white font-bold shadow-sm"
                              : "hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate min-w-0">
                            <span>{isLocked ? "" : "▶"}</span>
                            <span className="truncate">{les.title}</span>
                          </div>
                          <span className={`text-[10px] shrink-0 ml-2 ${isActive ? "text-slate-100" : "text-slate-400"}`}>
                            {les.durationMinutes}m
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Player Main Area */}
          <div className="lg:col-span-8 space-y-6">
            <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm space-y-6">
              {activeLesson ? (
                <>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0d8d78]">
                        Leçon en cours
                      </span>
                      <h3 className="text-lg font-bold text-[#11233f] mt-0.5">{activeLesson.title}</h3>
                    </div>

                    {activeLesson.isFreePreview && !hasAccess && (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-extrabold text-emerald-800">
                        Aperçu Gratuit
                      </span>
                    )}
                  </div>

                  {/* Video Screen or Locked Overlay */}
                  {hasAccess || activeLesson.isFreePreview ? (
                    <VideoPlayer src={activeLesson.videoUrl} title={activeLesson.title} />
                  ) : (
                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center space-y-3">
                      <h4 className="text-base font-bold">Cette leçon est verrouillée</h4>
                      <p className="text-xs text-slate-300 max-w-md">
                        Pour visionner la leçon complète et télécharger les ressources d'exercices, débloquez ce cours.
                      </p>
                      <button
                        onClick={handleUnlockCourse}
                        className="rounded-2xl bg-[#0d8d78] px-6 py-3 text-xs font-bold text-white shadow-md transition hover:bg-[#0b7866]"
                      >
                        Débloquer le cours ({course.priceTnd} DT) →
                      </button>
                    </div>
                  )}

                  {/* Description & Resources */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">À propos de la leçon</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {activeLesson.description || "Aucune description fournie."}
                    </p>

                    {activeLesson.resources && activeLesson.resources.length > 0 && (
                      <div className="pt-2 space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Fichiers & Exercices</h4>
                        <div className="flex flex-wrap gap-2">
                          {activeLesson.resources.map((res, i) => (
                            <a
                              key={i}
                              href={res.url}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-[#0d8d78] hover:bg-slate-100 flex items-center gap-1.5"
                            >
                               {res.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-20 text-center text-slate-400 text-xs">
                  Sélectionnez une leçon dans le programme à gauche pour commencer.
                </div>
              )}
            </div>

            {hasAccess && quizzes.length > 0 && (
              <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-[#11233f]">Quiz du cours</h3>
                {quizzes.map((q) => (
                  <QuizCard key={q.id} quiz={q} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
