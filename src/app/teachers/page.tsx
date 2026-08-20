/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { SiteNavbar } from "@/components/site-navbar";
import { governorates, subjects, educationLevels } from "@/lib/domain/catalog";

type Teacher = {
  id: string;
  slug: string;
  avatarUrl?: string | null;
  initials: string;
  name: string;
  title: string;
  bio: string;
  subject: string;
  subjects: string[];
  level: string;
  city: string;
  governorate: string;
  rate: number;
  hourlyRateMillimes: number;
  rating: number;
  reviewsCount: number;
  experience: number;
  online: boolean;
  inPerson: boolean;
};

const selectClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]";

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [mode, setMode] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState("");
  const [sort, setSort] = useState("recommended");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const initialSubject = params.get("subject") ?? "";
      const initialLevel = params.get("level") ?? "";
      const initialMode = params.get("mode") ?? "";
      if (initialSubject) setSubject(initialSubject);
      if (initialLevel) setLevel(initialLevel);
      if (initialMode) setMode(initialMode);
    }

    fetch("/api/teachers")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Teacher[]) => {
        setTeachers(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = teachers.filter((t) => {
    if (subject && !t.subjects.some((s) => s.toLowerCase() === subject.toLowerCase()) && t.subject !== subject) {
      return false;
    }
    if (governorate && t.governorate !== governorate && t.city !== governorate) {
      return false;
    }
    if (mode === "ONLINE" && !t.online) return false;
    if (mode === "IN_PERSON" && !t.inPerson) return false;
    if (maxPrice && t.rate > Number(maxPrice)) return false;
    if (minRating && t.rating < Number(minRating)) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "price_asc") return a.rate - b.rate;
    if (sort === "price_desc") return b.rate - a.rate;
    if (sort === "rating") return b.rating - a.rating;
    if (sort === "experience") return b.experience - a.experience;
    return 0;
  });

  function resetFilters() {
    setSubject("");
    setLevel("");
    setGovernorate("");
    setMode("");
    setMaxPrice("");
    setMinRating("");
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <SiteNavbar dark={false} />
      </header>

      {/* Hero Banner */}
      <div className="bg-[#11233f] py-12 px-4 sm:px-6 text-white text-center">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#72d6bf]">Marketplace certifiée Tunisie</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl lg:text-5xl tracking-tight">
            Trouvez le professeur idéal pour progresser.
          </h1>
          <p className="mt-3 text-sm text-slate-300">
            Comparez les matières, tarifs et disponibilités de nos professeurs vérifiés par l&apos;administration.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* Filters Sidebar */}
          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-bold text-base">Filtres de recherche</h2>
              <button onClick={resetFilters} className="text-xs font-bold text-[#0d8d78] hover:underline">
                Réinitialiser
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500">Matière</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)} className={selectClass}>
                <option value="">Toutes les matières</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500">Niveau scolaire</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)} className={selectClass}>
                <option value="">Tous les niveaux</option>
                {educationLevels.map((l) => (
                  <option key={l.slug} value={l.name}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500">Gouvernorat</label>
              <select value={governorate} onChange={(e) => setGovernorate(e.target.value)} className={selectClass}>
                <option value="">Toute la Tunisie</option>
                {governorates.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500">Mode de cours</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)} className={selectClass}>
                <option value="">Tous les formats</option>
                <option value="ONLINE">🌐 En ligne (WebRTC)</option>
                <option value="IN_PERSON">🏠 Présentiel</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500">Tarif max / heure (DT)</label>
              <select value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className={selectClass}>
                <option value="">Tous les tarifs</option>
                <option value="20">Moins de 20 DT / h</option>
                <option value="30">Moins de 30 DT / h</option>
                <option value="50">Moins de 50 DT / h</option>
              </select>
            </div>
          </aside>

          {/* Results List */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <p className="text-sm font-semibold text-slate-600">
                <strong>{sorted.length}</strong> professeur{sorted.length > 1 ? "s" : ""} disponible{sorted.length > 1 ? "s" : ""}
              </p>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Trier par :</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white p-2 font-semibold text-slate-700 outline-none"
                >
                  <option value="recommended">Recommandés</option>
                  <option value="price_asc">Prix croissant</option>
                  <option value="price_desc">Prix décroissant</option>
                  <option value="experience">Années d'expérience</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0d8d78] border-t-transparent mx-auto"></div>
                <p className="mt-4 text-sm text-slate-500">Recherche des professeurs vérifiés...</p>
              </div>
            ) : sorted.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <span className="text-4xl">🔍</span>
                <h3 className="mt-3 text-lg font-bold">Aucun professeur ne correspond à ces critères.</h3>
                <p className="mt-1 text-xs text-slate-500">Essayez d&apos;élargir vos filtres de recherche.</p>
                <button
                  onClick={resetFilters}
                  className="mt-4 rounded-xl bg-[#0d8d78] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0b7866]"
                >
                  Afficher tous les professeurs
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {sorted.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#72d6bf] hover:shadow-lg"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#d9f1e9] text-lg font-bold text-[#0d8d78] overflow-hidden border border-[#0d8d78]/20">
                            {t.avatarUrl ? (
                              <img src={t.avatarUrl} alt={t.name} className="h-full w-full object-cover" />
                            ) : (
                              <span>{t.initials}</span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-bold text-base text-[#11233f]">{t.name}</h3>
                              <span className="text-[#0d8d78] text-xs" title="Professeur vérifié par l'administration">
                                ✓
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-1">{t.title}</p>
                          </div>
                        </div>

                        <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-800">
                          ★ {t.rating.toFixed(1)}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {t.subjects.slice(0, 3).map((s) => (
                          <span key={s} className="rounded-lg bg-[#e5f7f2] px-2.5 py-0.5 text-xs font-semibold text-[#0d8d78]">
                            {s}
                          </span>
                        ))}
                      </div>

                      {t.bio && (
                        <p className="mt-3 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {t.bio}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
                        <span>📍 {t.city ? `${t.city}, ${t.governorate}` : t.governorate}</span>
                        <span>🎓 {t.experience} ans d'expérience</span>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                      <div>
                        <span className="text-xs text-slate-400">À partir de</span>
                        <p className="text-lg font-bold text-[#0d8d78]">{t.rate} DT <span className="text-xs font-normal text-slate-500">/ heure</span></p>
                      </div>

                      <a
                        href={`/teachers/${t.slug}`}
                        className="rounded-xl bg-[#11233f] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0d8d78]"
                      >
                        Voir profil & Réserver →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
