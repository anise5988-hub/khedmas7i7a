"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconStar } from "@/components/icons";

type ReviewItem = {
  id: string;
  name: string;
  role: string;
  rating: number;
  text: string;
  createdAt: string;
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    fetch("/api/reviews")
      .then((res) => (res.ok ? res.json() : { reviews: [] }))
      .then((data) => {
        setReviews(data.reviews || []);
      })
      .catch(() => setFetchError("Impossible de charger les avis."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[#101b2d] px-4 py-8 sm:px-6 sm:py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-1 font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-tight">
              <span>ProfySpace</span>
              <span className="rounded-md bg-[#72d6bf] px-1.5 py-0.5 text-xs font-extrabold text-[#101b2d]">.admin</span>
            </Link>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">
              Modération des Avis
            </span>
          </div>

          <Link
            href="/admin"
            className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
          >
            ← Retour au Dashboard
          </Link>
        </div>

        <div className="mt-8">
          <h1 className="text-3xl font-bold">Avis & Témoignages ({reviews.length})</h1>
          <p className="mt-1 text-sm text-slate-400">
            Consultez les avis publiés par les élèves et parents sur la plateforme.
          </p>
        </div>

        {fetchError && !loading && (
          <div className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-300">
            {fetchError}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-slate-400">Chargement des avis...</div>
        ) : reviews.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[.04] p-12 text-center text-slate-400">
            <IconStar className="h-8 w-8 mx-auto text-amber-400 mb-2" />
            Aucun avis pour le moment.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="rounded-3xl border border-white/10 bg-white/[.05] p-6 shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="font-bold text-white text-sm">{r.name}</span>
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(r.rating)].map((_, i) => (
                        <IconStar key={i} className="h-3.5 w-3.5 fill-amber-400" />
                      ))}
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-300 leading-relaxed italic">"{r.text}"</p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 text-right text-[11px] text-slate-400">
                  {new Date(r.createdAt).toLocaleDateString("fr-TN")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}