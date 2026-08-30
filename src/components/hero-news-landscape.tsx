/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  IconNewspaper,
  IconChevronLeft,
  IconChevronRight,
  IconSparkles,
  IconX,
  IconClock,
  IconBookOpen,
} from "@/components/icons";

export type PublicNews = {
  id: string;
  title: string;
  shortDescription: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
};

export function HeroNewsLandscape() {
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
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  // Auto rotate news in landscape every 5 seconds if not hovered/paused
  useEffect(() => {
    if (news.length <= 1 || isPaused || selectedNews) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % news.length);
    }, 5000);

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

  if (loading) {
    return (
      <div className="w-full rounded-3xl border border-white/15 bg-white/10 backdrop-blur-xl p-6 sm:p-8 shadow-2xl animate-pulse">
        <div className="h-48 rounded-2xl bg-white/10 w-full mb-4" />
        <div className="h-6 w-3/4 bg-white/15 rounded-lg mb-2" />
        <div className="h-4 w-full bg-white/10 rounded-lg" />
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="w-full rounded-3xl border border-white/15 bg-white/[.08] backdrop-blur-2xl p-6 sm:p-8 shadow-2xl text-white flex flex-col justify-between relative overflow-hidden">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#72d6bf]">
          <IconSparkles className="h-4 w-4" />
          <span>Actualités & Événements ProfySpace</span>
        </div>
        <div className="py-10 text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-[#72d6bf] mb-3">
            <IconNewspaper className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-bold">Restez informés sur l'éducation en Tunisie</h3>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            Consultez les dates d'examens officiels, les révisions du Baccalauréat et les annonces de la plateforme.
          </p>
          <div className="pt-4">
            <Link
              href="/teachers"
              className="inline-block rounded-2xl bg-[#72d6bf] px-6 py-3 text-xs font-bold text-[#11233f] shadow-md hover:bg-[#5ec4ad] transition"
            >
              Explorer les professeurs disponibles →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentItem = news[currentIndex];

  return (
    <>
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="group relative w-full rounded-3xl border border-white/20 bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl p-5 sm:p-7 text-white shadow-2xl shadow-black/40 overflow-hidden transition-all duration-500 hover:border-[#72d6bf]/50 hover:shadow-[#72d6bf]/10"
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-[#72d6bf]/20 blur-2xl pointer-events-none" />

        {/* Top Header Badge & Navigation Indicator */}
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#72d6bf] animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#72d6bf]">
              À la Une · Actualité
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-bold text-slate-300 mr-2">
              {currentIndex + 1} / {news.length}
            </span>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Précédent"
              className="rounded-xl bg-white/10 p-1.5 text-white hover:bg-[#72d6bf] hover:text-[#11233f] transition active:scale-95"
            >
              <IconChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Suivant"
              className="rounded-xl bg-white/10 p-1.5 text-white hover:bg-[#72d6bf] hover:text-[#11233f] transition active:scale-95"
            >
              <IconChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Landscape Animated Content Area */}
        <div
          key={currentItem.id}
          className="space-y-4 profy-reveal transition-all duration-300"
        >
          {/* Landscape Media Banner */}
          <div
            onClick={() => setSelectedNews(currentItem)}
            className="relative h-44 sm:h-52 w-full overflow-hidden rounded-2xl bg-slate-900 border border-white/10 cursor-pointer group/img"
          >
            {currentItem.imageUrl ? (
              <img
                src={currentItem.imageUrl}
                alt={currentItem.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover/img:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0d8d78]/40 via-[#11233f] to-[#101b2d] p-6 text-center">
                <div className="space-y-2">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#72d6bf]/20 text-[#72d6bf]">
                    <IconNewspaper className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#72d6bf]">
                    ProfySpace Info
                  </p>
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-slate-200">
              <span className="flex items-center gap-1.5 font-semibold bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg">
                <IconClock className="h-3.5 w-3.5 text-[#72d6bf]" />
                {new Date(currentItem.createdAt).toLocaleDateString("fr-TN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <span className="font-bold text-[#72d6bf] bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg flex items-center gap-1">
                <IconBookOpen className="h-3.5 w-3.5" />
                Lire l'article →
              </span>
            </div>
          </div>

          {/* Text Summary */}
          <div className="space-y-2">
            <h3
              onClick={() => setSelectedNews(currentItem)}
              className="text-lg sm:text-xl font-bold leading-snug tracking-tight text-white hover:text-[#72d6bf] transition cursor-pointer line-clamp-2"
            >
              {currentItem.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-3">
              {currentItem.shortDescription}
            </p>
          </div>

          {/* Dots & Actions */}
          <div className="pt-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {news.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${idx === currentIndex
                      ? "w-7 bg-[#72d6bf]"
                      : "w-2 bg-white/20 hover:bg-white/40"
                    }`}
                  aria-label={`Aller à l'actualité ${idx + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSelectedNews(currentItem)}
              className="rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 text-xs font-bold text-white transition active:scale-95"
            >
              Détails complets →
            </button>
          </div>
        </div>
      </div>

      {/* Full Modal Reader */}
      {selectedNews && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 profy-reveal"
          onClick={() => setSelectedNews(null)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl bg-[#11233f] border border-white/20 p-6 sm:p-8 shadow-2xl space-y-4 text-white max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#72d6bf]">
                <IconNewspaper className="h-4 w-4" />
                <span>Actualité Officielle ProfySpace.tn</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNews(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>

            {selectedNews.imageUrl && (
              <div className="h-56 sm:h-72 w-full overflow-hidden rounded-2xl border border-white/10">
                <img
                  src={selectedNews.imageUrl}
                  alt={selectedNews.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {selectedNews.title}
              </h2>
              <p className="mt-1 text-xs text-slate-400 flex items-center gap-1.5">
                <IconClock className="h-3.5 w-3.5 text-[#72d6bf]" />
                Publié le{" "}
                {new Date(selectedNews.createdAt).toLocaleDateString("fr-TN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 p-4 text-xs sm:text-sm font-semibold text-slate-200 border border-white/10 leading-relaxed">
              {selectedNews.shortDescription}
            </div>

            <div className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line py-2">
              {selectedNews.content}
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                ProfySpace.tn · Éducation & Marketplace
              </span>
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
