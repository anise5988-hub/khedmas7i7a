/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-img-element, react-hooks/static-components */
"use client";

import { useEffect, useState } from "react";
import { PageDataState } from "@/components/page-data-state";
import { SiteNavbar } from "@/components/site-navbar";
import {
  governorates,
  subjects,
  educationLevels,
  academicSections,
} from "@/lib/domain/catalog";
import {
  IconStar,
  IconShield,
  IconUsers,
  IconClock,
  IconFilter,
  IconX,
  IconSparkles,
  IconVideo,
} from "@/components/icons";

function levelName(slug: string): string {
  return educationLevels.find((l) => l.slug === slug)?.name ?? slug;
}

/**
 * The homepage's cycle cards link here with a whole-cycle keyword
 * ("primaire", "college", "secondaire") instead of one exact level slug —
 * expand those into every matching slug so the filter actually finds
 * teachers, the same way the AI matcher already reasons by cycle instead
 * of by raw slug equality.
 */
function levelSlugsForFilter(levelFilter: string): string[] {
  if (levelFilter === "primaire") return educationLevels.filter((l) => l.cycle === "PRIMARY").map((l) => l.slug);
  if (levelFilter === "college") return educationLevels.filter((l) => l.cycle === "BASIC").map((l) => l.slug);
  if (levelFilter === "secondaire") return educationLevels.filter((l) => l.slug.startsWith("secondaire-")).map((l) => l.slug);
  return [levelFilter];
}

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
  levels: string[];
  city: string;
  governorate: string;
  rate: number;
  hourlyRateMillimes: number;
  rating: number;
  reviewsCount: number;
  experience: number;
  online: boolean;
  inPerson: boolean;
  verificationStatus?: string;
};



function StarRating({ rating, reviewsCount }: { rating: number; reviewsCount: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <IconStar
            key={star}
            className={`h-4 w-4 ${
              star <= Math.round(rating) ? "text-[#f59e0b]" : "text-slate-300"
            }`}
          />
        ))}
      </div>
      <span className="text-xs font-bold text-[#f59e0b]">{rating.toFixed(1)}</span>
      {reviewsCount > 0 && (
        <span className="text-[11px] text-slate-400">({reviewsCount})</span>
      )}
    </div>
  );
}

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
      <IconShield className="h-3 w-3" />
      Vérifié
    </span>
  );
}

export function TeachersPageClient() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [bacSection, setBacSection] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [mode, setMode] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
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
      .catch(() => setFetchError("Impossible de charger les professeurs."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let count = 0;
    if (subject) count++;
    if (level) count++;
    if (bacSection) count++;
    if (governorate) count++;
    if (mode) count++;
    if (maxPrice) count++;
    if (minRating) count++;
    if (verifiedOnly) count++;
    setActiveFilterCount(count);
  }, [subject, level, bacSection, governorate, mode, maxPrice, minRating, verifiedOnly]);

  const filtered = teachers.filter((t) => {
    if (subject && !t.subjects.some((s) => s.toLowerCase() === subject.toLowerCase()) && t.subject !== subject) {
      return false;
    }
    if (level && !levelSlugsForFilter(level).some((slug) => t.levels.includes(slug))) {
      return false;
    }
    if (governorate && t.governorate !== governorate && t.city !== governorate) {
      return false;
    }
    if (mode === "ONLINE" && !t.online) return false;
    if (mode === "IN_PERSON" && !t.inPerson) return false;
    if (maxPrice && t.rate > Number(maxPrice)) return false;
    if (minRating && t.rating < Number(minRating)) return false;
    if (verifiedOnly && t.verificationStatus !== "APPROVED") return false;
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
    setBacSection("");
    setGovernorate("");
    setMode("");
    setMaxPrice("");
    setMinRating("");
    setVerifiedOnly(false);
  }

type FilterSidebarProps = {
  className?: string;
  subject: string;
  setSubject: (v: string) => void;
  level: string;
  setLevel: (v: string) => void;
  bacSection: string;
  setBacSection: (v: string) => void;
  governorate: string;
  setGovernorate: (v: string) => void;
  mode: string;
  setMode: (v: string) => void;
  maxPrice: string;
  setMaxPrice: (v: string) => void;
  minRating: string;
  setMinRating: (v: string) => void;
  verifiedOnly: boolean;
  setVerifiedOnly: (v: boolean) => void;
  activeFilterCount: number;
  onReset: () => void;
};

function FilterSidebar({
  className = "",
  subject,
  setSubject,
  level,
  setLevel,
  bacSection,
  setBacSection,
  governorate,
  setGovernorate,
  mode,
  setMode,
  maxPrice,
  setMaxPrice,
  minRating,
  setMinRating,
  verifiedOnly,
  setVerifiedOnly,
  activeFilterCount,
  onReset,
}: FilterSidebarProps) {
  return (
    <aside className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-5 text-[#11233f] dark:border-white/15 dark:bg-[#101b2d] dark:text-white dark:shadow-xl ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <IconFilter className="h-4 w-4 text-[#0d8d78] dark:text-[#72d6bf]" />
          <h2 className="font-bold text-base text-[#11233f] dark:text-white">Filtres</h2>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-[#0d8d78] px-2 py-0.5 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </div>
        <button
          onClick={onReset}
          className="text-xs font-bold text-[#0d8d78] dark:text-[#72d6bf] hover:underline"
        >
          Réinitialiser
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-300 mb-1.5">Matière</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-[#11233f] outline-none transition focus:border-[#0d8d78] dark:border-white/20 dark:bg-[#162844] dark:text-white dark:focus:border-[#72d6bf]"
          >
            <option value="" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">Toutes les matières</option>
            {subjects.map((s) => (
              <option key={s} value={s} className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-300 mb-1.5">Niveau scolaire</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-[#11233f] outline-none transition focus:border-[#0d8d78] dark:border-white/20 dark:bg-[#162844] dark:text-white dark:focus:border-[#72d6bf]"
          >
            <option value="" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">Tous les niveaux</option>
            <option value="primaire" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">Tout le cycle primaire</option>
            <option value="college" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">Tout le collège (7-9ème)</option>
            <option value="secondaire" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">Tout le secondaire (1-3ème)</option>
            {educationLevels.map((l) => (
              <option key={l.slug} value={l.slug} className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-300 mb-1.5">Section BAC</label>
          <select
            value={bacSection}
            onChange={(e) => setBacSection(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-[#11233f] outline-none transition focus:border-[#0d8d78] dark:border-white/20 dark:bg-[#162844] dark:text-white dark:focus:border-[#72d6bf]"
          >
            <option value="" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">Toutes sections</option>
            {academicSections.map((s) => (
              <option key={s} value={s} className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-300 mb-1.5">Gouvernorat</label>
          <select
            value={governorate}
            onChange={(e) => setGovernorate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-[#11233f] outline-none transition focus:border-[#0d8d78] dark:border-white/20 dark:bg-[#162844] dark:text-white dark:focus:border-[#72d6bf]"
          >
            <option value="" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">Toute la Tunisie</option>
            {governorates.map((g) => (
              <option key={g} value={g} className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">
                {g}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-300 mb-1.5">Mode de cours</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-[#11233f] outline-none transition focus:border-[#0d8d78] dark:border-white/20 dark:bg-[#162844] dark:text-white dark:focus:border-[#72d6bf]"
          >
            <option value="" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">Tous les formats</option>
            <option value="ONLINE" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">En ligne (WebRTC)</option>
            <option value="IN_PERSON" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">Présentiel</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-300 mb-1.5">Tarif max / heure (DT)</label>
          <select
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-[#11233f] outline-none transition focus:border-[#0d8d78] dark:border-white/20 dark:bg-[#162844] dark:text-white dark:focus:border-[#72d6bf]"
          >
            <option value="" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">Tous les tarifs</option>
            <option value="15" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">Moins de 15 DT / h</option>
            <option value="20" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">Moins de 20 DT / h</option>
            <option value="30" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">Moins de 30 DT / h</option>
            <option value="50" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">Moins de 50 DT / h</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-300 mb-1.5">Note minimum</label>
          <select
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-[#11233f] outline-none transition focus:border-[#0d8d78] dark:border-white/20 dark:bg-[#162844] dark:text-white dark:focus:border-[#72d6bf]"
          >
            <option value="" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">Toutes les notes</option>
            <option value="3" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">3+ étoiles</option>
            <option value="4" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">4+ étoiles</option>
            <option value="4.5" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">4.5+ étoiles</option>
          </select>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-white/20 dark:bg-[#162844]">
          <input
            type="checkbox"
            id="verifiedOnly"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-[#0d8d78] focus:ring-[#0d8d78] dark:border-white/30 dark:focus:ring-[#72d6bf]"
          />
          <label htmlFor="verifiedOnly" className="flex items-center gap-1.5 text-sm font-medium text-[#11233f] dark:text-white cursor-pointer select-none">
            <IconShield className="h-4 w-4 text-[#0d8d78] dark:text-[#72d6bf]" />
            Professeurs vérifiés uniquement
          </label>
        </div>
      </div>
    </aside>
  );
}

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f] dark:bg-[#0c1626] dark:text-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#11233f]">
        <SiteNavbar />
      </header>

      {/* Premium Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#11233f] via-[#1a2d4d] to-[#0d8d78]">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0idXJsKCNncmFkKSIgZmlsbC1vcGFjaXR5PSIwLjEiLz48L3N2Zz4=')] opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-20 lg:px-10">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#72d6bf]/20 border border-[#72d6bf]/30 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-bold text-[#72d6bf]">
              <IconSparkles className="h-3.5 w-3.5" />
              Marketplace certifiée Tunisie
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
            Trouvez le professeur idéal
          </h1>
          <p className="mt-2 sm:mt-3 max-w-2xl text-xs sm:text-base text-slate-300 sm:text-lg">
            Des enseignants vérifiés par l&apos;administration, prêts à vous accompagner dans votre réussite scolaire.
          </p>
          <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-slate-300">
            <div className="flex items-center gap-1.5">
              <IconUsers className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#72d6bf]" />
              <span><strong className="text-white font-bold">{teachers.length}+</strong> professeurs</span>
            </div>
            <div className="h-1 w-1 rounded-full bg-slate-500" />
            <div className="flex items-center gap-1.5">
              <IconStar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#f59e0b]" />
              <span>Notes vérifiées</span>
            </div>
            <div className="h-1 w-1 rounded-full bg-slate-500" />
            <div className="flex items-center gap-1.5">
              <IconShield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#72d6bf]" />
              <span>Professeurs certifiés</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        {/* Mobile Filter Toggle + Sort */}
        <div className="flex items-center justify-between gap-4 mb-6 lg:hidden">
          <button
            onClick={() => setFiltersOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#11233f] shadow-sm transition hover:border-[#0d8d78] hover:text-[#0d8d78] dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:border-[#72d6bf] dark:hover:text-[#72d6bf] active:scale-95"
          >
            <IconFilter className="h-4 w-4 text-[#0d8d78] dark:text-[#72d6bf]" />
            Filtres
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-[#0d8d78] px-2 py-0.5 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Trier par :</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white p-2 font-semibold text-slate-700 outline-none dark:border-white/20 dark:bg-[#162844] dark:text-white dark:focus:border-[#72d6bf]"
            >
              <option value="recommended" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">Recommandés</option>
              <option value="rating" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">Note</option>
              <option value="price_asc" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">Prix croissant</option>
              <option value="price_desc" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">Prix décroissant</option>
              <option value="experience" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">Expérience</option>
            </select>
          </div>
        </div>

        {/* Desktop Results Count + Sort */}
        <div className="hidden lg:flex items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              <strong className="text-[#11233f] dark:text-white">{sorted.length}</strong> professeur{sorted.length > 1 ? "s" : ""} disponible{sorted.length > 1 ? "s" : ""}
            </p>
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="text-xs font-medium text-[#0d8d78] dark:text-[#72d6bf] hover:underline"
              >
                Effacer les filtres
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Trier par :</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white p-2 font-semibold text-slate-700 outline-none dark:border-white/20 dark:bg-[#162844] dark:text-white dark:focus:border-[#72d6bf]"
            >
              <option value="recommended" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">Recommandés</option>
              <option value="rating" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">Note</option>
              <option value="price_asc" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">Prix croissant</option>
              <option value="price_desc" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">Prix décroissant</option>
              <option value="experience" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">Expérience</option>
            </select>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* Desktop Filters Sidebar */}
          <div className="hidden lg:block">
            <FilterSidebar
              subject={subject}
              setSubject={setSubject}
              level={level}
              setLevel={setLevel}
              bacSection={bacSection}
              setBacSection={setBacSection}
              governorate={governorate}
              setGovernorate={setGovernorate}
              mode={mode}
              setMode={setMode}
              maxPrice={maxPrice}
              setMaxPrice={setMaxPrice}
              minRating={minRating}
              setMinRating={setMinRating}
              verifiedOnly={verifiedOnly}
              setVerifiedOnly={setVerifiedOnly}
              activeFilterCount={activeFilterCount}
              onReset={resetFilters}
            />
          </div>

          {/* Mobile Filter Drawer / Bottom Sheet */}
          {filtersOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setFiltersOpen(false)}
              />
              <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white dark:bg-[#101b2d] border-t border-slate-200 dark:border-white/20 shadow-2xl text-[#11233f] dark:text-white">
                <div className="sticky top-0 bg-white dark:bg-[#101b2d] border-b border-slate-100 dark:border-white/10 px-5 py-4 flex items-center justify-between z-10">
                  <div className="flex items-center gap-2">
                    <IconFilter className="h-4 w-4 text-[#0d8d78] dark:text-[#72d6bf]" />
                    <h3 className="font-bold text-base text-[#11233f] dark:text-white">Filtres</h3>
                    {activeFilterCount > 0 && (
                      <span className="rounded-full bg-[#0d8d78] px-2 py-0.5 text-[10px] font-bold text-white">
                        {activeFilterCount}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setFiltersOpen(false)}
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition"
                  >
                    <IconX className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                  </button>
                </div>
                <div className="p-5">
                  <FilterSidebar
                    className="!rounded-none !border-none !shadow-none !p-0 !bg-transparent"
                    subject={subject}
                    setSubject={setSubject}
                    level={level}
                    setLevel={setLevel}
                    bacSection={bacSection}
                    setBacSection={setBacSection}
                    governorate={governorate}
                    setGovernorate={setGovernorate}
                    mode={mode}
                    setMode={setMode}
                    maxPrice={maxPrice}
                    setMaxPrice={setMaxPrice}
                    minRating={minRating}
                    setMinRating={setMinRating}
                    verifiedOnly={verifiedOnly}
                    setVerifiedOnly={setVerifiedOnly}
                    activeFilterCount={activeFilterCount}
                    onReset={resetFilters}
                  />
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={resetFilters}
                      className="flex-1 rounded-xl border border-slate-200 bg-white dark:border-white/20 dark:bg-white/5 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-white/10"
                    >
                      Réinitialiser
                    </button>
                    <button
                      onClick={() => setFiltersOpen(false)}
                      className="flex-1 rounded-xl bg-[#0d8d78] py-3 text-sm font-bold text-white transition hover:bg-[#0b7866]"
                    >
                      Voir les résultats
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

            {/* Results List */}
            <section>
              {/* Mobile result count */}
              <div className="lg:hidden pb-4 mb-4 border-b border-slate-200 dark:border-white/10">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <strong className="text-[#11233f] dark:text-white">{sorted.length}</strong> professeur{sorted.length > 1 ? "s" : ""}
                </p>
              </div>

              <PageDataState
                loading={loading}
                error={fetchError || undefined}
                empty={!loading && !fetchError && sorted.length === 0}
                emptyTitle="Aucun professeur ne correspond à ces critères"
                emptyDescription="Essayez d'élargir vos filtres de recherche ou modifiez vos critères de sélection."
                onRetry={() => window.location.reload()}
                loadingText="Chargement des professeurs..."
              >
                <div className="grid gap-3.5 sm:gap-4 sm:grid-cols-2">
                  {sorted.map((t) => (
                  <div
                    key={t.id}
                    className="group flex min-w-0 flex-col justify-between rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm hover:shadow-xl hover:border-[#72d6bf] text-[#11233f] dark:border-white/15 dark:bg-[#101b2d] dark:text-white dark:shadow-xl transition duration-300 hover:-translate-y-1 dark:hover:border-[#72d6bf] dark:hover:shadow-2xl"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                          <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-[#d9f1e9] text-[#0d8d78] border border-[#0d8d78]/20 dark:bg-gradient-to-br dark:from-[#72d6bf] dark:to-[#0d8d78] text-base sm:text-lg font-bold dark:text-[#11233f] overflow-hidden shadow-xs">
                            {t.avatarUrl ? (
                              <img src={t.avatarUrl} alt={t.name} className="h-full w-full object-cover" />
                            ) : (
                              <span>{t.initials}</span>
                            )}
                            {t.online && (
                              <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#101b2d]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <a href={`/teachers/${t.slug}`} className="font-bold text-sm sm:text-base text-[#11233f] hover:text-[#0d8d78] dark:text-white dark:hover:text-[#72d6bf] transition truncate">
                                {t.name}
                              </a>
                              {t.verificationStatus === "APPROVED" && (
                                <VerifiedBadge />
                              )}
                            </div>
                            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{t.title}</p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <StarRating rating={t.rating} reviewsCount={t.reviewsCount} />
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {t.subjects.slice(0, 3).map((s) => (
                          <span key={s} className="rounded-lg bg-[#e5f7f2] text-[#0d8d78] dark:bg-[#72d6bf]/15 dark:border dark:border-[#72d6bf]/25 px-2 py-0.5 text-[11px] font-bold dark:text-[#72d6bf]">
                            {s}
                          </span>
                        ))}
                        {t.levels.length > 0 && (
                          <span className="rounded-lg bg-slate-100 text-slate-600 dark:bg-white/10 dark:border dark:border-white/10 px-2 py-0.5 text-[11px] font-semibold dark:text-slate-300">
                            {levelName(t.levels[0])}
                            {t.levels.length > 1 ? ` +${t.levels.length - 1}` : ""}
                          </span>
                        )}
                      </div>

                      {/* Bio */}
                      {t.bio && (
                        <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                          {t.bio}
                        </p>
                      )}

                      {/* Meta */}
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <IconUsers className="h-3.5 w-3.5 text-slate-400" />
                          {t.city && t.governorate
                            ? `${t.city}, ${t.governorate}`
                            : t.governorate || t.city || "Tunisie"}
                        </span>
                        <span className="flex items-center gap-1">
                          <IconClock className="h-3.5 w-3.5 text-slate-400" />
                          {t.experience} ans d&apos;exp.
                        </span>
                      </div>
                    </div>

                    {/* Bottom Pricing & CTAs */}
                    <div className="mt-4 sm:mt-5 border-t border-slate-100 dark:border-white/10 pt-3 sm:pt-4 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">À partir de</span>
                          <p className="text-base sm:text-lg font-bold text-[#0d8d78] dark:text-[#72d6bf] leading-tight">
                            {t.rate} DT <span className="text-xs font-normal text-slate-500 dark:text-slate-400">/ h</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <a
                            href={`/dashboard/messages?teacherId=${t.id}`}
                            className="rounded-xl border border-[#0d8d78] bg-[#e5f7f2] text-[#0d8d78] hover:bg-[#d4f2e9] dark:border-[#72d6bf]/40 dark:bg-[#72d6bf]/15 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold dark:text-[#72d6bf] transition dark:hover:bg-[#72d6bf]/25 active:scale-95"
                          >
                            Discuter
                          </a>
                          <a
                            href={`/teachers/${t.slug}`}
                            className="rounded-xl bg-[#11233f] text-white hover:bg-[#0d8d78] dark:bg-[#0d8d78] px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-bold transition dark:hover:bg-[#0b7866] active:scale-95 shadow-md shadow-[#0d8d78]/25"
                          >
                            Réserver
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <div className="flex items-center gap-1.5">
                          {t.online && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-[#e5f7f2] border border-[#0d8d78]/20 text-[#0d8d78] dark:bg-[#72d6bf]/15 dark:border-[#72d6bf]/20 px-1.5 py-0.5 text-[10px] font-bold dark:text-[#72d6bf]">
                              <IconVideo className="h-3 w-3" />
                              En ligne
                            </span>
                          )}
                          {t.inPerson && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 text-slate-600 dark:bg-white/10 dark:border-white/15 px-1.5 py-0.5 text-[10px] font-bold dark:text-slate-300">
                              <IconUsers className="h-3 w-3" />
                              Présentiel
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">Certifié ProfySpace</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </PageDataState>
          </section>
        </div>
      </div>
    </main>
  );
}
