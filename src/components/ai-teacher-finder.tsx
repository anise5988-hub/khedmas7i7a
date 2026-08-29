/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { IconSparkles, IconX, IconStar, IconSearch, IconMonitor, IconUser } from "@/components/icons";

type MatchedTeacher = {
  id: string;
  slug: string;
  avatarUrl?: string | null;
  initials: string;
  name: string;
  subject: string;
  subjects: string[];
  city: string;
  rate: number;
  rating: number;
  reviewsCount: number;
  online: boolean;
  inPerson: boolean;
  verificationStatus?: string;
  matchScore: number;
  matchReasons: string[];
};

const EXAMPLE_PROMPTS = [
  "Prof de maths pour le Bac Sciences, budget 30 DT/h, en ligne le soir",
  "Cours d'anglais niveau collège à Sfax, présentiel le week-end",
  "Physique-Chimie, 2ème année secondaire, en ligne, budget max 25 DT",
];

function scoreColor(score: number): string {
  if (score >= 75) return "text-[#0d8d78] dark:text-[#72d6bf] bg-[#e5f7f2] dark:bg-[#72d6bf]/15 border-[#0d8d78]/20 dark:border-[#72d6bf]/30";
  if (score >= 50) return "text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-400/15 border-amber-500/20 dark:border-amber-400/30";
  return "text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-white/10 border-slate-300/40 dark:border-white/15";
}

export function AiTeacherFinder() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<MatchedTeacher[] | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  // Keep this student-facing discovery tool out of the video classroom,
  // the admin console, and the teacher's own dashboard — none of those
  // contexts are someone searching for a teacher to book.
  if (pathname?.startsWith("/classroom") || pathname?.startsWith("/admin") || pathname?.startsWith("/teacher")) {
    return null;
  }

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (query.trim().length < 5) {
      setError("Décrivez votre besoin en quelques mots (matière, niveau, budget...).");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/teacher-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setResults(data.results || []);
      } else {
        setError(data.error || "Impossible d'analyser votre demande.");
        setResults(null);
      }
    } catch {
      setError("Erreur de connexion au serveur.");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setQuery("");
    setResults(null);
    setError("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-5 z-[59] flex items-center gap-2 rounded-full bg-gradient-to-r from-[#0d8d78] to-[#11233f] pl-4 pr-5 py-3.5 text-white shadow-2xl shadow-[#0d8d78]/30 ring-1 ring-white/10 transition hover:scale-105 hover:shadow-[#0d8d78]/50 active:scale-95 animate-float"
        aria-label="Trouver mon professeur avec l'IA"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15">
          <IconSparkles className="h-4 w-4 text-[#72d6bf]" />
        </span>
        <span className="hidden text-sm font-bold sm:inline">Trouver mon Prof avec IA</span>
        <span className="text-sm font-bold sm:hidden">IA Prof</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="profy-reveal flex h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-[#0f1d32] sm:h-[85vh] sm:rounded-3xl"
          >
            {/* Header */}
            <div className="relative shrink-0 overflow-hidden bg-[#11233f] px-6 py-5 text-white">
              <div className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-[#0d8d78]/40 blur-3xl" />
              <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-[#72d6bf]/20 blur-3xl" />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#72d6bf]">
                    <IconSparkles className="h-3 w-3" />
                    Recherche intelligente
                  </div>
                  <h2 className="mt-2 font-[family-name:var(--font-dm-sans)] text-xl font-bold sm:text-2xl">
                    Trouver mon Prof avec IA
                  </h2>
                  <p className="mt-1 text-xs text-slate-300 sm:text-sm">
                    Décrivez votre besoin en une phrase, on s&apos;occupe du reste.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="shrink-0 rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                  aria-label="Fermer"
                >
                  <IconX className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <form onSubmit={runSearch} className="space-y-3">
                <div className="relative">
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    rows={3}
                    placeholder="Ex : Prof de maths pour le Bac, budget 30 DT/h, disponible le soir en ligne..."
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 pr-4 text-sm text-[#11233f] outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#0d8d78]/15 dark:border-white/15 dark:bg-white/[.05] dark:text-white dark:placeholder:text-slate-400"
                  />
                </div>

                {!results && (
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLE_PROMPTS.map((p) => (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setQuery(p)}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:border-[#0d8d78]/40 hover:text-[#0d8d78] dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-[#72d6bf]"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}

                {error && (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                    {error}
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0d8d78] py-3.5 text-sm font-bold text-white shadow-md shadow-[#0d8d78]/25 transition hover:bg-[#0b7866] active:scale-[.98] disabled:opacity-60 sm:flex-none sm:px-8"
                  >
                    {loading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Analyse en cours...
                      </>
                    ) : (
                      <>
                        <IconSearch className="h-4 w-4" />
                        Trouver mes professeurs
                      </>
                    )}
                  </button>
                  {results && (
                    <button
                      type="button"
                      onClick={reset}
                      className="rounded-2xl border border-slate-200 px-4 py-3.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10"
                    >
                      Nouvelle recherche
                    </button>
                  )}
                </div>
              </form>

              {/* Results */}
              {results && (
                <div className="mt-6 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {results.length > 0
                      ? `${results.length} professeur${results.length > 1 ? "s" : ""} recommandé${results.length > 1 ? "s" : ""} pour vous`
                      : "Aucun résultat"}
                  </p>

                  {results.length === 0 && (
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center dark:border-white/10 dark:bg-white/[.04]">
                      <p className="text-sm font-bold text-[#11233f] dark:text-white">
                        Aucun professeur ne correspond exactement à votre demande.
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Essayez d&apos;élargir votre recherche (budget, matière ou disponibilité).
                      </p>
                    </div>
                  )}

                  {results.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#0d8d78]/30 hover:shadow-md dark:border-white/10 dark:bg-white/[.05] sm:p-5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#72d6bf] to-[#0d8d78] text-base font-bold text-[#11233f]">
                          {teacher.avatarUrl ? (
                            <img src={teacher.avatarUrl} alt={teacher.name} className="h-full w-full object-cover" />
                          ) : (
                            <span>{teacher.initials}</span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="truncate text-sm font-bold text-[#11233f] dark:text-white">{teacher.name}</h3>
                            {teacher.verificationStatus === "APPROVED" && (
                              <span className="rounded-full bg-[#e5f7f2] px-1.5 py-0.5 text-[9px] font-bold text-[#0d8d78] dark:bg-[#72d6bf]/15 dark:text-[#72d6bf]">
                                ✓ Vérifié
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{teacher.subject}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1">
                              <IconStar className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {teacher.rating.toFixed(1)} ({teacher.reviewsCount})
                            </span>
                            <span>📍 {teacher.city}</span>
                            {teacher.online && (
                              <span className="inline-flex items-center gap-1">
                                <IconMonitor className="h-3 w-3" /> En ligne
                              </span>
                            )}
                            {teacher.inPerson && (
                              <span className="inline-flex items-center gap-1">
                                <IconUser className="h-3 w-3" /> Présentiel
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${scoreColor(teacher.matchScore)}`}>
                            {teacher.matchScore}% compatible
                          </span>
                          <span className="text-sm font-bold text-[#0d8d78] dark:text-[#72d6bf]">
                            {teacher.rate} DT<span className="text-[10px] font-normal text-slate-400">/h</span>
                          </span>
                        </div>
                      </div>

                      {teacher.matchReasons.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {teacher.matchReasons.map((reason) => (
                            <span
                              key={reason}
                              className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-3.5 flex items-center gap-2 border-t border-slate-100 pt-3.5 dark:border-white/10">
                        <Link
                          href={`/teachers/${teacher.slug}`}
                          onClick={() => setOpen(false)}
                          className="flex-1 rounded-xl border border-slate-200 py-2.5 text-center text-xs font-bold text-[#11233f] transition hover:bg-slate-50 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
                        >
                          Voir le profil
                        </Link>
                        <Link
                          href={`/teachers/${teacher.slug}#booking-section`}
                          onClick={() => setOpen(false)}
                          className="flex-1 rounded-xl bg-[#0d8d78] py-2.5 text-center text-xs font-bold text-white transition hover:bg-[#0b7866]"
                        >
                          Réserver →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
