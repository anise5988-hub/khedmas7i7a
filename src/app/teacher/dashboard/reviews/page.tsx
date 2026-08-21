"use client";

import { useEffect, useState } from "react";
import { SiteNavbar } from "@/components/site-navbar";
import { IconStar } from "@/components/icons";

type Review = {
  id: string;
  studentName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

export default function TeacherReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [avgRating, setAvgRating] = useState<number>(5.0);

  useEffect(() => {
    fetch("/api/teacher/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.teacher?.slug) {
          fetch(`/api/teachers/${data.teacher.slug}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((tData) => {
              if (tData?.reviews) setReviews(tData.reviews);
              if (tData?.rating) setAvgRating(tData.rating);
            });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <SiteNavbar dark={false} />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#e5f7f2] border border-[#0d8d78]/25 px-2.5 py-0.5 text-xs font-bold text-[#0d8d78]">
                Avis & Notations
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">
              Avis des Élèves ({reviews.length})
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Retrouvez l'ensemble des retours d'expérience et évaluations reçus après vos séances de cours.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2.5">
            <IconStar className="h-5 w-5 fill-amber-500 text-amber-500" />
            <div>
              <p className="font-bold text-base text-amber-950">★ {avgRating.toFixed(1)} / 5</p>
              <p className="text-[10px] text-amber-800">Note moyenne globale</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0d8d78] border-t-transparent mx-auto"></div>
            <p className="mt-4 text-xs text-slate-500">Chargement des avis...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 mb-3">
              <IconStar className="h-7 w-7 fill-amber-500" />
            </div>
            <h2 className="text-lg font-bold">Aucun avis reçu pour le moment.</h2>
            <p className="mt-1 text-xs text-slate-500">
              Vos élèves pourront vous évaluer après chaque séance de cours effectuée.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base">{r.studentName}</h3>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(r.createdAt).toLocaleDateString("fr-TN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(r.rating)].map((_, i) => (
                      <IconStar key={i} className="h-4 w-4 fill-amber-500 text-amber-500" />
                    ))}
                  </div>
                </div>

                {r.comment && (
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed italic bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    "{r.comment}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}