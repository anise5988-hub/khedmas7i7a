"use client";

import { useEffect, useState, useRef } from "react";
import {
  IconNewspaper,
  IconChevronLeft,
  IconChevronRight,
  IconSparkles,
  IconX,
} from "@/components/icons";

export type PublicNews = {
  id: string;
  title: string;
  shortDescription: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
};
export function HomepageNews() {
  const [news, setNews] = useState<PublicNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedNews, setSelectedNews] = useState<PublicNews | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch("/api/news")
      .then((res) => (res.ok ? res.json() : { news: [] }))
      .then((data) => {
        if (Array.isArray(data.news) && data.news.length > 0) {
          setNews(data.news);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Auto rotate every 6 seconds if not paused
  useEffect(() => {
    if (news.length <= 1 || isPaused || selectedNews) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % news.length);
    }, 6000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [news.length, isPaused, selectedNews]);

  function handlePrev() {
    setCurrentIndex((prev) => (prev - 1 + news.length) % news.length);
  }

  function handleNext() {
    setCurrentIndex((prev) => (prev + 1) % news.length);
  }

  if (loading || news.length === 0) {
    return null; // Don't show anything if no published news exists
  }

  const currentItem = news[currentIndex];

  return (
    <>
      <section
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="relative z-20 border-b border-white/10 bg-[#0d1b30] text-white overflow-hidden transition"
        aria-label="Actualités officielles ProfySpace"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex flex-1 items-center gap-3 min-w-0">
            <div className="flex items-center gap-1.5 rounded-full bg-[#72d6bf]/20 border border-[#72d6bf]/30 px-2.5 py-1 text-[11px] font-bold text-[#72d6bf] shrink-0">
              <IconSparkles className="h-3.5 w-3.5 animate-pulse text-[#72d6bf]" />
              <span className="hidden sm:inline">ACTUALITÉ</span>
              <span className="sm:hidden">INFO</span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedNews(currentItem)}
              className="group flex flex-1 items-center gap-2 text-left min-w-0 transition hover:opacity-90 cursor-pointer"
            >
              <p className="truncate text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-white">
                <strong className="text-white font-bold mr-1.5">{currentItem.title} :</strong>
                <span className="text-slate-300 font-normal">{currentItem.shortDescription}</span>
              </p>
              <span className="hidden md:inline-flex items-center text-[11px] font-bold text-[#72d6bf] shrink-0 underline decoration-[#72d6bf]/50 group-hover:decoration-[#72d6bf]">
                Lire la suite →
              </span>
            </button>
          </div>

          {/* Navigation Controls */}
          {news.length > 1 && (
            <div className="flex items-center gap-1 ml-3 shrink-0">
              <span className="text-[10px] font-mono text-slate-400 mr-1.5 hidden sm:inline">
                {currentIndex + 1} / {news.length}
              </span>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Actualité précédente"
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                <IconChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Actualité suivante"
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                <IconChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Full News Article Modal */}
      {selectedNews && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setSelectedNews(null)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl bg-[#11233f] border border-white/20 p-6 sm:p-8 shadow-2xl space-y-4 text-white max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#72d6bf]">
                <IconNewspaper className="h-4 w-4" />
                <span>Actualité Officielle ProfySpace</span>
              </div>
              <button
                onClick={() => setSelectedNews(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{selectedNews.title}</h2>
              <p className="mt-1 text-xs text-slate-400">
                Publié le {new Date(selectedNews.createdAt).toLocaleDateString("fr-TN", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 p-4 text-xs sm:text-sm font-semibold text-slate-200 border border-white/10 leading-relaxed">
              {selectedNews.shortDescription}
            </div>

            <div className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line py-2">
              {selectedNews.content}
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">ProfySpace.tn · Plateforme Tunisienne</span>
              <button
                type="button"
                onClick={() => setSelectedNews(null)}
                className="rounded-2xl bg-[#72d6bf] px-6 py-2.5 text-xs font-bold text-[#11233f] hover:bg-[#5ec4ad] transition shadow-md"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
