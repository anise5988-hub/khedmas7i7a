"use client";

import { useEffect, useState } from "react";
import { IconStar, IconTrash } from "@/components/icons";

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    fetch("/api/reviews")
      .then((res) => (res.ok ? res.json() : { reviews: [] }))
      .then((data) => {
        setReviews(data.reviews || []);
      })
      .catch(() => setFetchError("Impossible de charger les avis."))
      .finally(() => setLoading(false));
  }, []);

  async function deleteReview(id: string) {
    setDeletingId(id);
    setActionError("");
    try {
      const res = await fetch(`/api/reviews/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error || "Suppression impossible.");
        return;
      }
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setActionError("Erreur de connexion au serveur.");
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#101b2d] px-4 py-8 sm:px-6 sm:py-10 text-white">
      <div className="mx-auto max-w-7xl">
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
        {actionError && (
          <div className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-300">
            {actionError}
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

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                  {confirmId === r.id ? (
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-rose-300 font-bold">Supprimer définitivement ?</span>
                      <button
                        onClick={() => deleteReview(r.id)}
                        disabled={deletingId === r.id}
                        className="rounded-lg bg-rose-500/20 px-2 py-1 font-bold text-rose-300 hover:bg-rose-500/30 disabled:opacity-50"
                      >
                        {deletingId === r.id ? "..." : "Oui"}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="rounded-lg bg-white/10 px-2 py-1 font-bold text-slate-300 hover:bg-white/20"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(r.id)}
                      title="Supprimer cet avis"
                      aria-label="Supprimer cet avis"
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-rose-500/10 hover:text-rose-300 transition"
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                      Supprimer
                    </button>
                  )}
                  <span className="text-[11px] text-slate-400">
                    {new Date(r.createdAt).toLocaleDateString("fr-TN")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}