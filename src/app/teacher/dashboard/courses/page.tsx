"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { SiteNavbar } from "@/components/site-navbar";
import { VideoPlayer } from "@/components/video-player";
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
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  type FormLesson = { title: string; durationMinutes: number; videoUrl: string; isFreePreview: boolean; resources?: { name: string; url: string }[] };
  type FormSection = { title: string; lessons: FormLesson[] };
  const [sections, setSections] = useState<FormSection[]>([
    {
      title: "Module 1 : Fondamentaux & Exercices",
      lessons: [{ title: "Leçon 1 : Introduction et rappels", durationMinutes: 30, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", isFreePreview: true }],
    },
  ]);
  // Legacy preview fields kept for the existing preview component.
  const [lessonTitle, setLessonTitle] = useState("Leçon 1 : Introduction et rappels");
  const [lessonDuration, setLessonDuration] = useState(30);
  const [lessonVideo, setLessonVideo] = useState("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadKind, setUploadKind] = useState<"video" | "pdf">("video");
  const [videoMode, setVideoMode] = useState<"URL" | "FILE">("URL");
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadTarget, setActiveUploadTarget] = useState<{ sectionIndex: number; lessonIndex: number } | null>(null);

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

  const updateLesson = (sectionIndex: number, lessonIndex: number, updates: Partial<FormLesson>) => {
    setSections((current) => current.map((section, sIndex) => sIndex !== sectionIndex ? section : {
      ...section,
      lessons: section.lessons.map((lesson, lIndex) => lIndex !== lessonIndex ? lesson : { ...lesson, ...updates }),
    }));
  };

  const addLesson = (sectionIndex: number) => {
    setSections((current) => current.map((section, index) => index !== sectionIndex ? section : {
      ...section,
      lessons: [...section.lessons, { title: `Leçon ${section.lessons.length + 1}`, durationMinutes: 30, videoUrl: "", isFreePreview: false }],
    }));
  };

  const addSection = () => {
    setSections((current) => [...current, { title: `Module ${current.length + 1}`, lessons: [{ title: "Leçon 1", durationMinutes: 30, videoUrl: "", isFreePreview: false }] }]);
  };

  const removeLesson = (sectionIndex: number, lessonIndex: number) => {
    setSections((current) => current.map((section, index) => index !== sectionIndex ? section : {
      ...section,
      lessons: section.lessons.filter((_, lIndex) => lIndex !== lessonIndex),
    }).filter((section) => section.lessons.length > 0));
  };

  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadTarget) return;
    if (!file.type.startsWith("video/")) {
      setError("Veuillez sélectionner un fichier vidéo valide (MP4, WebM, MOV).");
      return;
    }
    setUploadingFile(true);
    setUploadedFileName(file.name);
    setError("");
    const target = activeUploadTarget;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", uploadKind);
    fetch("/api/uploads/video", { method: "POST", headers: { "x-user-id": localStorage.getItem("profyspace_user_id") || "" }, body: formData })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Échec de l'upload.");
        if (uploadKind === "pdf") {
          const current = sections[target.sectionIndex]?.lessons[target.lessonIndex];
          updateLesson(target.sectionIndex, target.lessonIndex, { resources: [...(current?.resources || []), { name: data.name, url: data.url }] });
        } else {
          updateLesson(target.sectionIndex, target.lessonIndex, { videoUrl: data.url });
        }
      })
      .catch((uploadError: unknown) => setError(uploadError instanceof Error ? uploadError.message : "Erreur lors de l'envoi de la vidéo."))
      .finally(() => {
        setUploadingFile(false);
          setActiveUploadTarget(null);
      });
  };

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
          thumbnailUrl: thumbnailUrl || null,
          sections: sections.map((section) => ({
            ...section,
            lessons: section.lessons.map((lesson) => ({
              ...lesson,
              description: "Introduction pratique au module avec exemples corrigés.",
            })),
          })),
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
    setThumbnailUrl("");
    setSections([{
      title: "Module 1 : Fondamentaux & Exercices",
      lessons: [{ title: "Leçon 1 : Introduction et rappels", durationMinutes: 30, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", isFreePreview: true }],
    }]);
    setLessonTitle("Leçon 1 : Introduction et rappels");
    setLessonDuration(30);
    setLessonVideo("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    setUploadedFileName("");
    setVideoMode("URL");
    setActiveUploadTarget(null);
    setError("");
  };

  const closeModal = () => {
    if (saving) return;
    setShowCreateModal(false);
    setError("");
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <SiteNavbar dark={false} />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 space-y-6">
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
          className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-[#0d8d78] px-5 py-3 text-xs font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#0b7866] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0d8d78]/20 sm:w-auto"
        >
          <span aria-hidden="true" className="mr-2 text-base leading-none">+</span> Créer un nouveau cours
        </button>
      </div>

      {error && !showCreateModal && (
        <div role="alert" className="flex items-start justify-between gap-4 rounded-2xl border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Fermer le message d'erreur">✕</button>
        </div>
      )}

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
                    className="min-h-10 rounded-xl px-2 text-rose-600 transition hover:bg-rose-50 hover:underline focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-100"
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-xs sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="create-course-title" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
          <div className="max-h-[95vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0d8d78]">Étape {step} sur 3</span>
                <h3 id="create-course-title" className="text-base font-bold text-[#11233f]">Créer un cours e-learning</h3>
              </div>
              <button type="button" onClick={closeModal} disabled={saving} aria-label="Fermer la fenêtre" className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0d8d78]/20 disabled:opacity-50">✕</button>
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

                  <div className="rounded-2xl border-slate-200 bg-slate-50 p-4">
                    <label className="block font-bold text-slate-600 mb-1">Image du cours / pack (optionnel)</label>
                    <input type="url" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="Lien image JPG/PNG/WebP" className="w-full rounded-xl border-slate-200 bg-white p-3 outline-none focus:border-[#0d8d78]" />
                    <p className="mt-1 text-[10px] text-slate-400">L'image sera affichée dans le catalogue et sur la page d'aperçu.</p>
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
                  <div className="space-y-4 rounded-2xl border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3"><div><label className="block font-bold text-slate-700">Programme du cours *</label><p className="mt-1 text-[11px] text-slate-500">Ajoutez plusieurs modules et vidéos dans votre pack.</p></div><button type="button" onClick={addSection} className="shrink-0 rounded-xl bg-[#e5f7f2] px-3 py-2 text-[11px] font-bold text-[#0d8d78] hover:bg-[#d5f1e8]">+ Module</button></div>
                    {sections.map((section, sectionIndex) => <div key={sectionIndex} className="space-y-3 rounded-xl border-slate-200 bg-white p-3"><div className="flex items-center gap-2"><input value={section.title} onChange={(e) => setSections((current) => current.map((item, index) => index === sectionIndex ? { ...item, title: e.target.value } : item))} className="min-w-0 flex-1 rounded-lg border-slate-200 p-2.5 text-xs font-bold outline-none focus:border-[#0d8d78]" placeholder="Nom du module" />{sections.length > 1 && <button type="button" onClick={() => setSections((current) => current.filter((_, index) => index !== sectionIndex))} className="text-[10px] font-bold text-rose-600">Supprimer</button>}</div>{section.lessons.map((lesson, lessonIndex) => <div key={lessonIndex} className="space-y-2 rounded-xl border-slate-100 bg-slate-50 p-3"><div className="flex items-center justify-between"><span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Vidéo {lessonIndex + 1}</span>{section.lessons.length > 1 && <button type="button" onClick={() => removeLesson(sectionIndex, lessonIndex)} className="text-[10px] font-bold text-rose-600">Supprimer</button>}</div><input required value={lesson.title} onChange={(e) => updateLesson(sectionIndex, lessonIndex, { title: e.target.value })} className="w-full rounded-lg border-slate-200 bg-white p-2.5 text-xs outline-none focus:border-[#0d8d78]" placeholder="Titre de la vidéo" /><div className="grid gap-2 sm:grid-cols-[1fr_100px]"><input required type="url" value={lesson.videoUrl} onChange={(e) => updateLesson(sectionIndex, lessonIndex, { videoUrl: e.target.value })} className="w-full rounded-lg border-slate-200 bg-white p-2.5 text-xs outline-none focus:border-[#0d8d78]" placeholder="Lien YouTube, Vimeo ou MP4" /><input required type="number" min={1} value={lesson.durationMinutes} onChange={(e) => updateLesson(sectionIndex, lessonIndex, { durationMinutes: Number(e.target.value) })} className="w-full rounded-lg border-slate-200 bg-white p-2.5 text-xs outline-none focus:border-[#0d8d78]" aria-label="Durée en minutes" /></div><div className="flex flex-wrap items-center justify-between gap-2"><label className="flex items-center gap-2 text-[11px] font-semibold text-slate-500"><input type="checkbox" checked={lesson.isFreePreview} onChange={(e) => updateLesson(sectionIndex, lessonIndex, { isFreePreview: e.target.checked })} /> Aperçu gratuit</label><button type="button" onClick={() => { setActiveUploadTarget({ sectionIndex, lessonIndex }); fileInputRef.current?.click(); }} className="rounded-lg border-[#0d8d78] px-3 py-1.5 text-[10px] font-bold text-[#0d8d78] hover:bg-[#e5f7f2]">📁 Uploader une vidéo</button></div></div>)}<button type="button" onClick={() => addLesson(sectionIndex)} className="w-full rounded-lg border-dashed border-[#0d8d78] py-2 text-[11px] font-bold text-[#0d8d78] hover:bg-[#e5f7f2]">+ Ajouter une vidéo</button></div>)}
                    <input type="file" ref={fileInputRef} onChange={handleVideoFileUpload} accept={uploadKind === "pdf" ? "application/pdf" : "video/mp4,video/webm,video/ogg,video/quicktime"} className="hidden" />
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => { setUploadKind("video"); setActiveUploadTarget({ sectionIndex: 0, lessonIndex: 0 }); fileInputRef.current?.click(); }} className="rounded-lg border-[#0d8d78] px-3 py-1.5 text-[10px] font-bold text-[#0d8d78]">📹 Ajouter vidéo</button>
                      <button type="button" onClick={() => { setUploadKind("pdf"); setActiveUploadTarget({ sectionIndex: 0, lessonIndex: 0 }); fileInputRef.current?.click(); }} className="rounded-lg border-[#0d8d78] px-3 py-1.5 text-[10px] font-bold text-[#0d8d78]">📄 Ajouter PDF</button>
                    </div>
                    {uploadingFile && <p className="text-[11px] font-bold text-[#0d8d78]">Envoi du fichier vers Supabase...</p>}
                  </div>
                  <div className="hidden">
                     <label className="block font-bold text-slate-600 mb-1">Titre de la 1ère leçon *</label>
                    <input
                      type="text"
                      required
                      value={lessonTitle}
                      onChange={(e) => setLessonTitle(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#0d8d78]"
                    />
                  </div>

                  <div className="hidden">
                    <label className="block font-bold text-slate-600 mb-1.5">Source de la vidéo *</label>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setVideoMode("URL")}
                        className={`rounded-xl border py-2 text-xs font-bold transition ${
                          videoMode === "URL"
                            ? "border-[#0d8d78] bg-[#e5f7f2] text-[#0d8d78]"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        🔗 Lien YouTube / Vimeo / MP4
                      </button>
                      <button
                        type="button"
                        onClick={() => setVideoMode("FILE")}
                        className={`rounded-xl border py-2 text-xs font-bold transition ${
                          videoMode === "FILE"
                            ? "border-[#0d8d78] bg-[#e5f7f2] text-[#0d8d78]"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        📁 Uploader un fichier vidéo
                      </button>
                    </div>

                    {videoMode === "URL" ? (
                      <div>
                        <input
                          type="text"
                          required
                          value={lessonVideo}
                          onChange={(e) => setLessonVideo(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/..."
                          className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#0d8d78]"
                        />
                        <p className="mt-1 text-[11px] text-slate-400">
                          Supporte les liens YouTube standards, Shorts, partages YouTu.be, Vimeo et fichiers MP4 directs.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 text-center space-y-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleVideoFileUpload}
                          accept="video/mp4,video/webm,video/ogg,video/quicktime"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setActiveUploadTarget({ sectionIndex: 0, lessonIndex: 0 });
                            fileInputRef.current?.click();
                          }}
                          className="rounded-xl bg-white border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-xs"
                        >
                          {uploadingFile ? "Lecture du fichier..." : "Choisir une vidéo sur mon appareil"}
                        </button>
                        {uploadedFileName && (
                          <p className="text-[11px] font-bold text-[#0d8d78]">
                            ✓ Fichier sélectionné : {uploadedFileName}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400">
                          Formats supportés : MP4, WebM, MOV.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Live Video Preview in Modal */}
                  {sections[0]?.lessons[0]?.videoUrl && (
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Aperçu du lecteur vidéo :
                      </label>
                      <div className="rounded-2xl overflow-hidden border border-slate-200 max-h-48">
                        <VideoPlayer src={sections[0].lessons[0].videoUrl} title={sections[0].lessons[0].title} className="max-h-48" />
                      </div>
                    </div>
                  )}

                  <div className="hidden">
                    <label className="block font-bold text-slate-600 mb-1">Durée (minutes) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={lessonDuration}
                      onChange={(e) => setLessonDuration(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#0d8d78]"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="rounded-2xl border border-slate-200 px-4 py-3.5 font-bold text-slate-600 hover:bg-slate-50"
                    >
                      ← Retour
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (sections.length === 0 || sections.some((section) => !section.title.trim() || section.lessons.length === 0 || section.lessons.some((lesson) => !lesson.title.trim() || !lesson.videoUrl.trim() || lesson.durationMinutes < 1))) {
                          setError("Veuillez renseigner chaque module, titre de vidéo, lien et durée.");
                          return;
                        }
                        setError("");
                        setStep(3);
                      }}
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
    </main>
  );
}
