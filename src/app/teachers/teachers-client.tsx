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

const PRIMARY = "#0d8d78";
const PRIMARY_LIGHT = "#72d6bf";
const PRIMARY_PALE = "#e5f7f2";
const PRIMARY_PALE_HOVER = "#d4f2e9";
const TEXT_DARK = "#11233f";
const RATING_AMBER = "#f59e0b";
const RATING_AMBER_BG = "#fffbeb";
const RATING_AMBER_BORDER = "#fcd34d";

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
    if (level && !t.levels.includes(level)) {
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
    <aside className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-5 ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <IconFilter className="h-4 w-4 text-[#0d8d78]" />
          <h2 className="font-bold text-base text-[#11233f]">Filtres</h2>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-[#0d8d78] px-2 py-0.5 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </div>
        <button
          onClick={onReset}
          className="text-xs font-bold text-[#0d8d78] hover:underline"
        >
          Réinitialiser
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">Matière</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
          >
            <option value="">Toutes les matières</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">Niveau scolaire</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
          >
            <option value="">Tous les niveaux</option>
            {educationLevels.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">Section BAC</label>
          <select
            value={bacSection}
            onChange={(e) => setBacSection(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
          >
            <option value="">Toutes sections</option>
            {academicSections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">Gouvernorat</label>
          <select
            value={governorate}
            onChange={(e) => setGovernorate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
          >
            <option value="">Toute la Tunisie</option>
            {governorates.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">Mode de cours</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
          >
            <option value="">Tous les formats</option>
            <option value="ONLINE">En ligne (WebRTC)</option>
            <option value="IN_PERSON">Présentiel</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">Tarif max / heure (DT)</label>
          <select
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
          >
            <option value="">Tous les tarifs</option>
            <option value="15">Moins de 15 DT / h</option>
            <option value="20">Moins de 20 DT / h</option>
            <option value="30">Moins de 30 DT / h</option>
            <option value="50">Moins de 50 DT / h</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">Note minimum</label>
          <select
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
          >
            <option value="">Toutes les notes</option>
            <option value="3">3+ étoiles</option>
            <option value="4">4+ étoiles</option>
            <option value="4.5">4.5+ étoiles</option>
          </select>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
          <input
            type="checkbox"
            id="verifiedOnly"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-[#0d8d78] focus:ring-[#0d8d78]"
          />
          <label htmlFor="verifiedOnly" className="flex items-center gap-1.5 text-sm font-medium text-[#11233f] cursor-pointer select-none">
            <IconShield className="h-4 w-4 text-[#0d8d78]" />
            Professeurs vérifiés uniquement
          </label>
        </div>
      </div>
    </aside>
  );
}

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <SiteNavbar dark={false} />
      </header>

      {/* Premium Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#11233f] via-[#1a2d4d] to-[#0d8d78]">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0idXJsKCNncmFkKSIgZmlsbC1vcGFjaXR5PSIwLjEiLz48L3N2Zz4=')] opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#72d6bf]/20 border border-[#72d6bf]/30 px-3 py-1 text-xs font-bold text-[#72d6bf]">
              <IconSparkles className="h-3.5 w-3.5" />
              Marketplace certifiée Tunisie
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Trouvez le professeur idéal
          </h1>
          <p className="mt-3 max-w-2xl text-base text-slate-300 sm:text-lg">
            Des enseignants vérifiés par l&apos;administration, prêts à vous accompagner dans votre réussite scolaire.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-slate-300">
            <div className="flex items-center gap-1.5">
              <IconUsers className="h-4 w-4 text-[#72d6bf]" />
              <span><strong className="text-white font-bold">{teachers.length}+</strong> professeurs</span>
            </div>
            <div className="h-1 w-1 rounded-full bg-slate-500" />
            <div className="flex items-center gap-1.5">
              <IconStar className="h-4 w-4 text-[#f59e0b]" />
              <span>Notes vérifiées</span>
            </div>
            <div className="h-1 w-1 rounded-full bg-slate-500" />
            <div className="flex items-center gap-1.5">
              <IconShield className="h-4 w-4 text-[#72d6bf]" />
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
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#11233f] shadow-sm transition hover:border-[#0d8d78] hover:text-[#0d8d78]"
          >
            <IconFilter className="h-4 w-4" />
            Filtres
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-[#0d8d78] px-2 py-0.5 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Trier par :</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white p-2 font-semibold text-slate-700 outline-none"
            >
              <option value="recommended">Recommandés</option>
              <option value="rating">Note</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
              <option value="experience">Expérience</option>
            </select>
          </div>
        </div>

        {/* Desktop Results Count + Sort */}
        <div className="hidden lg:flex items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold text-slate-600">
              <strong className="text-[#11233f]">{sorted.length}</strong> professeur{sorted.length > 1 ? "s" : ""} disponible{sorted.length > 1 ? "s" : ""}
            </p>
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="text-xs font-medium text-[#0d8d78] hover:underline"
              >
                Effacer les filtres
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Trier par :</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white p-2 font-semibold text-slate-700 outline-none"
            >
              <option value="recommended">Recommandés</option>
              <option value="rating">Note</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
              <option value="experience">Expérience</option>
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
              <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl">
                <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10">
                  <div className="flex items-center gap-2">
                    <IconFilter className="h-4 w-4 text-[#0d8d78]" />
                    <h3 className="font-bold text-base text-[#11233f]">Filtres</h3>
                    {activeFilterCount > 0 && (
                      <span className="rounded-full bg-[#0d8d78] px-2 py-0.5 text-[10px] font-bold text-white">
                        {activeFilterCount}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setFiltersOpen(false)}
                    className="p-2 rounded-xl hover:bg-slate-100 transition"
                  >
                    <IconX className="h-5 w-5 text-slate-500" />
                  </button>
                </div>
                <div className="p-5">
                  <FilterSidebar
                    className="!rounded-none !border-none !shadow-none !p-0"
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
                      className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
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
              <div className="lg:hidden pb-4 mb-4 border-b border-slate-200">
                <p className="text-sm font-semibold text-slate-600">
                  <strong className="text-[#11233f]">{sorted.length}</strong> professeur{sorted.length > 1 ? "s" : ""}
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
                <div className="grid gap-4 sm:grid-cols-2">
                  {sorted.map((t) => (
                  <div
                    key={t.id}
                    className="group flex min-w-0 flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#72d6bf] hover:shadow-xl"
                  >
                    <div>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#d9f1e9] text-lg font-bold text-[#0d8d78] overflow-hidden border border-[#0d8d78]/20">
                            {t.avatarUrl ? (
                              <img src={t.avatarUrl} alt={t.name} className="h-full w-full object-cover" />
                            ) : (
                              <span>{t.initials}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-bold text-base text-[#11233f] truncate">{t.name}</h3>
                              {t.verificationStatus === "APPROVED" && (
                                <VerifiedBadge />
                              )}
                            </div>
                            <p className="text-xs text-slate-500 truncate">{t.title}</p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <StarRating rating={t.rating} reviewsCount={t.reviewsCount} />
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {t.subjects.slice(0, 3).map((s) => (
                          <span key={s} className="rounded-lg bg-[#e5f7f2] px-2.5 py-0.5 text-xs font-semibold text-[#0d8d78]">
                            {s}
                          </span>
                        ))}
                        {t.levels.length > 0 && (
                          <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                            {levelName(t.levels[0])}
                            {t.levels.length > 1 ? ` +${t.levels.length - 1}` : ""}
                          </span>
                        )}
                      </div>

                      {t.bio && (
                        <p className="mt-3 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {t.bio}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <IconUsers className="h-3.5 w-3.5 text-slate-400" />
                          {t.city && t.governorate
                            ? `${t.city}, ${t.governorate}`
                            : t.governorate || t.city}
                        </span>
                        <span className="flex items-center gap-1">
                          <IconClock className="h-3.5 w-3.5 text-slate-400" />
                          {t.experience} ans d&apos;expérience
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-slate-100 pt-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-[11px] text-slate-400">À partir de</span>
                          <p className="text-lg font-bold text-[#0d8d78]">
                            {t.rate} DT <span className="text-xs font-normal text-slate-500">/ h</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={`/dashboard/messages?teacherId=${t.id}`}
                            className="rounded-xl border border-[#0d8d78] bg-[#e5f7f2] px-3.5 py-2 text-xs font-bold text-[#0d8d78] transition hover:bg-[#d4f2e9]"
                          >
                            Discuter
                          </a>
                          <a
                            href={`/teachers/${t.slug}`}
                            className="rounded-xl bg-[#11233f] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#0d8d78]"
                          >
                            Réserver
                          </a>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {t.online && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#e5f7f2] border border-[#0d8d78]/20 px-2 py-0.5 text-[10px] font-bold text-[#0d8d78]">
                              <IconVideo className="h-3 w-3" />
                              En ligne
                            </span>
                          )}
                          {t.inPerson && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              <IconUsers className="h-3 w-3" />
                              Présentiel
                            </span>
                          )}
                        </div>
                        <span className="hidden text-[10px] text-slate-400 sm:inline">Cliquez sur Discuter pour une offre spécifique</span>
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
