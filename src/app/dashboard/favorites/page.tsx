/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteNavbar } from "@/components/site-navbar";
import { IconHeart, IconStar, IconTrash, IconSearch } from "@/components/icons";

type FavoriteTeacher = {
  id: string;
  slug: string;
  avatarUrl?: string | null;
  name: string;
  title: string;
  bio: string;
  rate: number;
  rating: number;
  reviewsCount: number;
  subjects: string[];
  city: string;
  verificationStatus: string;
};

export default function StudentFavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  function loadFavorites() {
    setLoading(true);
    fetch("/api/favorites")
      .then((res) => (res.ok ? res.json() : { favorites: [] }))
      .then((data) => {
        setFavorites(data.favorites || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadFavorites();
  }, []);

  async function removeFavorite(teacherId: string) {
    setActionLoading(teacherId);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId }),
      });
      if (res.ok) {
        setFavorites((prev) => prev.filter((f) => f.id !== teacherId));
      }
    } catch {} finally {
      setActionLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f] dark:bg-[#0c1626] dark:text-white">
      <SiteNavbar dark={false} />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#e5f7f2] border border-[#0d8d78]/25 px-2.5 py-0.5 text-xs font-bold text-[#0d8d78] dark:bg-[#72d6bf]/15 dark:border-[#72d6bf]/30 dark:text-[#72d6bf]">
                Espace Élève
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">
              Mes Professeurs Favoris ({favorites.length})
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Retrouvez rapidement les professeurs enregistrés dans vos favoris.
            </p>
          </div>

          <Link
            href="/teachers"
            className="flex items-center gap-2 rounded-2xl bg-[#0d8d78] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b7866] shadow-sm"
          >
            <IconSearch className="h-4 w-4" />
            <span>Explorer d'autres professeurs →</span>
          </Link>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0d8d78] border-t-transparent mx-auto"></div>
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Chargement de vos favoris...</p>
          </div>
        ) : favorites.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-white/10 dark:bg-white/[.05] dark:shadow-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 mb-3 dark:bg-rose-500/10 dark:text-rose-400">
              <IconHeart className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-bold">Aucun professeur en favoris.</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Lorsque vous consultez la liste des professeurs, cliquez sur le bouton favori pour les enregistrer ici.
            </p>
            <Link
              href="/teachers"
              className="mt-5 inline-block rounded-2xl bg-[#0d8d78] px-6 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b7866]"
            >
              Découvrir les professeurs vérifiés →
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((teacher) => (
              <div
                key={teacher.id}
                className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-[#0d8d78]/40 hover:shadow-md dark:border-white/10 dark:bg-white/[.05] dark:shadow-xl dark:hover:border-[#72d6bf]/40"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d9f1e9] text-base font-bold text-[#0d8d78] dark:bg-[#72d6bf]/20 dark:text-[#72d6bf]">
                        {teacher.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-base text-[#11233f] dark:text-white">{teacher.name}</h3>
                          {teacher.verificationStatus === "APPROVED" && (
                            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300">
                              ✓
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{teacher.title}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFavorite(teacher.id)}
                      disabled={actionLoading === teacher.id}
                      className="rounded-xl p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition dark:text-slate-500 dark:hover:text-rose-400 dark:hover:bg-rose-500/10"
                      title="Retirer des favoris"
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {teacher.subjects.slice(0, 3).map((s) => (
                      <span key={s} className="rounded-lg bg-[#e5f7f2] px-2.5 py-0.5 text-xs font-semibold text-[#0d8d78] dark:bg-[#72d6bf]/15 dark:text-[#72d6bf]">
                        {s}
                      </span>
                    ))}
                  </div>

                  {teacher.bio && (
                    <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {teacher.bio}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                    <span> {teacher.city}</span>
                    <span className="flex items-center gap-1 font-bold text-amber-700 dark:text-amber-400">
                      <IconStar className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                      {teacher.rating.toFixed(1)} ({teacher.reviewsCount})
                    </span>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-100 dark:border-white/10 pt-4 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">Tarif :</span>
                    <p className="font-bold text-base text-[#0d8d78] dark:text-[#72d6bf]">{teacher.rate} DT / h</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/messages?teacherId=${teacher.id}`}
                      className="rounded-xl border border-[#0d8d78] bg-[#e5f7f2] px-3 py-1.5 text-xs font-bold text-[#0d8d78] hover:bg-[#d4f2e9] transition dark:border-[#72d6bf]/40 dark:bg-[#72d6bf]/15 dark:text-[#72d6bf] dark:hover:bg-[#72d6bf]/25"
                    >
                      Message
                    </Link>
                    <Link
                      href={`/teachers/${teacher.slug}`}
                      className="rounded-xl bg-[#0d8d78] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#0b7866] transition"
                    >
                      Réserver →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}