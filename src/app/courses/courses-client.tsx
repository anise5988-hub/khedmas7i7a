/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteNavbar } from "@/components/site-navbar";
import { Course } from "@/lib/server/courses-store";
import { subjects as allCatalogSubjects } from "@/lib/domain/catalog";

export function CoursesCatalogPageClient() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (subjectFilter) params.set("subject", subjectFilter);
      if (levelFilter) params.set("level", levelFilter);

      const res = await fetch(`/api/courses?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses || []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCourses();
    }, 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, subjectFilter, levelFilter]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <SiteNavbar />

      {/* Hero Header */}
      <section className="bg-[#11233f] text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-4">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#72d6bf] bg-white/10 px-3 py-1 rounded-full border border-white/10">
            Catalogue de Cours & Packs de Révision ProfySpace
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Apprenez à votre rythme avec les meilleurs enseignants
          </h1>
          <p className="max-w-2xl text-xs sm:text-sm text-slate-300 leading-relaxed">
            Découvrez des cours complets, des vidéos haute définition, des séries d'exercices corrigés et des packs de révision pour le Baccalauréat et le Supérieur.
          </p>

          {/* Search Bar */}
          <div className="pt-4 flex flex-col sm:flex-row gap-3 max-w-3xl">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un cours, un chapitre, un prof ou une matière..."
              className="flex-1 rounded-2xl bg-white/10 border border-white/20 p-4 text-xs sm:text-sm text-white placeholder-slate-400 outline-none focus:bg-white focus:text-slate-800 transition"
            />
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="rounded-2xl bg-white/10 border border-white/20 p-4 text-xs font-bold text-white outline-none focus:bg-white focus:text-slate-800 transition"
            >
              <option value="" className="text-slate-800">Toutes les matières</option>
              {allCatalogSubjects.map((s) => (
                <option key={s} value={s} className="text-slate-800">
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-8">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <p className="text-xs font-bold text-slate-500">
            {loading ? "Chargement..." : `${courses.length} cours disponible${courses.length > 1 ? "s" : ""}`}
          </p>
          {(search || subjectFilter || levelFilter) && (
            <button
              onClick={() => {
                setSearch("");
                setSubjectFilter("");
                setLevelFilter("");
              }}
              className="text-xs font-bold text-[#0d8d78] hover:underline"
            >
              Réinitialiser les filtres ✕
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-80 rounded-3xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="py-20 text-center rounded-3xl bg-white border border-slate-200 p-8 space-y-3 shadow-sm">
            <p className="text-base font-bold text-[#11233f]">Aucun cours disponible pour le moment.</p>
            <p className="text-xs text-slate-500">Les cours et packs publiés par les enseignants apparaîtront ici.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {courses.map((course) => (
              <div
                key={course.id}
                className="group rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail */}
                  <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                      <span className="rounded-xl bg-[#11233f]/90 backdrop-blur-md px-3 py-1 text-[10px] font-bold text-white shadow-sm">
                        {course.subject}
                      </span>
                      {course.visibility === "LOCKED" && (
                        <span className="rounded-xl bg-amber-500/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-extrabold text-white shadow-sm flex items-center gap-1">
                          🔒 Cours Protégé
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-3 right-3 rounded-xl bg-white/95 backdrop-blur-md px-3 py-1 text-xs font-black text-[#0d8d78] shadow-md">
                      {course.priceTnd > 0 ? `${course.priceTnd} DT` : "GRATUIT"}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-6 space-y-3">
                    <span className="text-[11px] font-semibold text-slate-400 block">
                      {course.level}
                    </span>

                    <h2 className="text-base font-bold text-[#11233f] group-hover:text-[#0d8d78] transition duration-200 line-clamp-2">
                      {course.title}
                    </h2>

                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {course.description}
                    </p>

                    {/* Teacher Info */}
                    <div className="pt-2 flex items-center gap-3 border-t border-slate-100">
                      <div className="h-8 w-8 rounded-full bg-[#0d8d78] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {course.teacherName.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-700 truncate">{course.teacherName}</p>
                        <p className="text-[10px] text-slate-400">{course.totalLessons} leçons • {course.durationMinutes} min</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="p-6 pt-0">
                  <Link
                    href={`/courses/${course.id}`}
                    className="block w-full text-center rounded-2xl bg-[#0d8d78] py-3 text-xs font-bold text-white shadow-md transition duration-200 hover:bg-[#0b7866]"
                  >
                    {course.visibility === "LOCKED" && course.priceTnd > 0 ? "Débloquer le cours →" : "Voir le cours →"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
