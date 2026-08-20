"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Course, CourseVisibility } from "@/lib/server/courses-store";

export default function TeacherCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [step, setStep] = useState(1);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("Mathématiques");
  const [level, setLevel] = useState("4ème Année Secondaire (Bac)");
  const [language] = useState("Français / Arabe");
  const [priceTnd, setPriceTnd] = useState(30);
  const [visibility, setVisibility] = useState<CourseVisibility>("LOCKED");
  const [lessonTitle, setLessonTitle] = useState("Leçon 1 : Introduction et rappels");
  const [lessonDuration, setLessonDuration] = useState(30);
  const [lessonVideo, setLessonVideo] = useState("https://www.w3schools.com/html/mov_bbb.mp4");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function getAuthHeaders(): Record<string, string> {
    const userId = typeof window !== "undefined" ? localStorage.getItem("profyspace_user_id") || "" : "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (userId) headers["x-user-id"] = userId;
    return headers;
  }

  const fetchTeacherCourses = async () => {
    setLoading(true);
    try {
      const userId = typeof window !== "undefined" ? localStorage.getItem("profyspace_user_id") || "" : "";
      const res = await fetch(`/api/courses?teacherId=${userId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses || []);
      } else {
        setError("Impossible de charger vos cours. Veuillez réessayer.");
      }
    } catch {
      setError("Impossible de charger vos cours. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => fetchTeacherCourses());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title,
          description,
          subject,
          level,
          language,
          priceTnd,
          visibility: priceTnd === 0 && visibility === "LOCKED" ? "PUBLIC" : visibility,
          thumbnailUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80",
          sections: [
            {
              title: "Module 1 : Fondamentaux & Exercices",
              lessons: [
                {
                  title: lessonTitle,
                  durationMinutes: lessonDuration,
                  videoUrl: lessonVideo,
                  description: "Introduction pratique au module avec exemples corrigés.",
                  isFreePreview: true,
                },
              ],
            },
          ],
        }),
      });

      const data = await res.json();
      setSaving(false);

      if (!res.ok) {
        setError(data.error || "Impossible de créer le cours.");
        return;
      }

      setShowCreateModal(false);
      resetForm();
      await fetchTeacherCourses();
    } catch {
      setSaving(false);
      setError("Erreur de connexion.");
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce cours ?")) return;
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        await fetchTeacherCourses();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Impossible de supprimer ce cours.");
      }
    } catch {
      setError("Impossible de supprimer ce cours. Vérifiez votre connexion.");
    }
  };

  const resetForm = () => {
    setStep(1);
    setTitle("");
    setDescription("");
    setSubject("Mathématiques");
    setLevel("4ème Année Secondaire (Bac)");
    setPriceTnd(30);
    setVisibility("LOCKED");
    setLessonTitle("Leçon 1 : Introduction et rappels");
    setLessonDuration(30);
    setLessonVideo("https://www.w3schools.com/html/mov_bbb.mp4");
    setError("");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#0d8d78]">
            Gestion des Cours & Packs E-Learning
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-[#11233f]">
            Mes Cours & Packs de Révision
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Créez des cours vidéo, définissez leurs tarifs en DT et leur visibilité (Public / Protégé 🔒 / Privé).
          </p>
        </div>

        <button
          onClick={() => {
            setError("");
            setShowCreateModal(true);
          }}
          className="rounded-2xl bg-[#0d8d78] px-5 py-3 text-xs font-bold text-white shadow-md transition hover:bg-[#0b7866]"
        >
          + Créer un nouveau cours →
        </button>
      </div>

      {/* Course List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
            Chargement de vos cours...
          </div>
        ) : courses.length === 0 ? (
          <div className="p-12 text-center space-y-3 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-sm font-bold text-[#11233f]">Vous n'avez pas encore publié de cours.</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Proposez des packs de révision ou des cours e-learning à vos élèves et générez des revenus récurrents.
            </p>
            <button
              onClick={() => {
                setError("");
                setShowCreateModal(true);
              }}
              className="inline-block rounded-xl bg-[#0d8d78] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b7866]"
            >
              Créer mon premier cours →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map((c) => (
              <div
                key={c.id}
                className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-[#e5f7f2] px-3 py-1 text-[10px] font-extrabold text-[#0d8d78]">
                      {c.subject}
                    </span>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                        c.visibility === "PUBLIC"
                          ? "bg-emerald-100 text-emerald-800"
                          : c.visibility === "LOCKED"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {c.visibility === "PUBLIC"
                        ? "Public"
                        : c.visibility === "LOCKED"
                        ? "🔒 Protégé (Payant)"
                        : "Brouillon"}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-[#11233f]">{c.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{c.description}</p>

                  <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400 border-t border-slate-100">
                    <span>{c.totalLessons} leçons</span>
                    <span>{c.studentCount} élèves inscrits</span>
                    <span className="font-bold text-[#0d8d78]">{c.priceTnd > 0 ? `${c.priceTnd} DT` : "Gratuit"}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs font-bold">
                  <Link href={`/courses/${c.id}`} className="text-[#0d8d78] hover:underline">
                    Aperçu élève ↗
                  </Link>

                  <button
                    onClick={() => handleDeleteCourse(c.id)}
                    className="text-rose-600 hover:underline"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Multi-Step Course Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-5 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0d8d78]">Étape {step} sur 3</span>
                <h3 className="text-base font-bold text-[#11233f]">Créer un cours e-learning</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4 text-xs">
              {step === 1 && (
                <>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Titre du cours *</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Pack Révision Bac Math - Analyse & Algèbre"
                      className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#0d8d78]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Description détaillée *</label>
                    <textarea
                      required
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Expliquez ce que l'élève va apprendre..."
                      className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#0d8d78]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">Matière *</label>
                      <select
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#0d8d78]"
                      >
                        <option value="Mathématiques">Mathématiques</option>
                        <option value="Physique-Chimie">Physique-Chimie</option>
                        <option value="SVT">SVT</option>
                        <option value="Français">Français</option>
                        <option value="Anglais">Anglais</option>
                        <option value="Informatique">Informatique / Algo</option>
                        <option value="Économie / Gestion">Économie / Gestion</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-600 mb-1">Niveau d'étude *</label>
                      <input
                        type="text"
                        required
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#0d8d78]"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!title.trim() || !description.trim()) {
                        setError("Veuillez remplir le titre et la description.");
                        return;
                      }
                      setError("");
                      setStep(2);
                    }}
                    className="w-full rounded-2xl bg-[#0d8d78] py-3.5 font-bold text-white shadow-md transition hover:bg-[#0b7866]"
                  >
                    Suivant : Programme & Vidéo →
                  </button>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Titre de la 1ère leçon *</label>
                    <input
                      type="text"
                      required
                      value={lessonTitle}
                      onChange={(e) => setLessonTitle(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#0d8d78]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Lien de la vidéo (MP4 / Stream URL) *</label>
                    <input
                      type="url"
                      required
                      value={lessonVideo}
                      onChange={(e) => setLessonVideo(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#0d8d78]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Durée (minutes) *</label>
                    <input
                      type="number"
                      required
                      min={5}
                      value={lessonDuration}
                      onChange={(e) => setLessonDuration(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#0d8d78]"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="rounded-2xl border border-slate-200 px-4 py-3.5 font-bold text-slate-600 hover:bg-slate-50"
                    >
                      ← Retour
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="flex-1 rounded-2xl bg-[#0d8d78] py-3.5 font-bold text-white shadow-md transition hover:bg-[#0b7866]"
                    >
                      Suivant : Tarif & Visibilité →
                    </button>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Tarif de déblocage (DT) *</label>
                    <input
                      type="number"
                      min={0}
                      step={5}
                      required
                      value={priceTnd}
                      onChange={(e) => setPriceTnd(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm font-bold text-[#0d8d78] outline-none focus:border-[#0d8d78]"
                    />
                    <p className="mt-1 text-[10px] text-slate-400">0 DT = Cours 100% gratuit.</p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Visibilité du cours *</label>
                    <select
                      value={visibility}
                      onChange={(e) => setVisibility(e.target.value as CourseVisibility)}
                      className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#0d8d78]"
                    >
                      <option value="LOCKED">🔒 Protégé / Payant (Visible au catalogue mais vidéos verrouillées)</option>
                      <option value="PUBLIC">🌐 Public (Gratuit pour tous)</option>
                      <option value="DRAFT">📝 Brouillon (Non visible)</option>
                    </select>
                  </div>

                  {error && <p className="rounded-xl bg-rose-50 p-2.5 text-rose-700 font-bold">{error}</p>}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="rounded-2xl border border-slate-200 px-4 py-3.5 font-bold text-slate-600 hover:bg-slate-50"
                    >
                      ← Retour
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 rounded-2xl bg-[#0d8d78] py-3.5 font-bold text-white shadow-md transition hover:bg-[#0b7866] disabled:opacity-50"
                    >
                      {saving ? "Publication..." : "Publier le cours →"}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
