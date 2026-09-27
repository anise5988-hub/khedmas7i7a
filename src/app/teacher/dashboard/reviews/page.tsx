"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { SiteNavbar } from "@/components/site-navbar";
import { IconStar } from "@/components/icons";

type Review = {
  id: string;
  studentName: string;
  rating: number;
  comment: string | null;
  photoUrl?: string | null;
  teacherReply?: string | null;
  createdAt: string;
};

function ReplyComposer({ review, onReplied }: { review: Review; onReplied: (id: string, reply: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherReply: text.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        onReplied(review.id, data.teacherReply);
        setOpen(false);
      } else {
        setError(data.error || "Impossible d'envoyer votre réponse.");
      }
    } catch {
      setError("Erreur de connexion au serveur.");
    } finally {
      setSending(false);
    }
  }

  if (review.teacherReply) {
    return (
      <div className="rounded-xl bg-[#e5f7f2] p-3.5 dark:bg-[#72d6bf]/10">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#0d8d78] dark:text-[#72d6bf]">Votre réponse</p>
        <p className="mt-1 text-xs text-slate-700 leading-relaxed dark:text-slate-300">{review.teacherReply}</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-bold text-[#0d8d78] hover:underline dark:text-[#72d6bf]"
      >
        Répondre à cet avis →
      </button>
    );
  }

  return (
    <form onSubmit={submitReply} className="space-y-2">
      <textarea
        required
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Remerciez votre élève ou apportez une précision..."
        className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none transition focus:border-[#0d8d78] dark:border-white/15 dark:bg-white/[.05] dark:text-white dark:focus:border-[#72d6bf]"
      />
      {error && <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={sending}
          className="rounded-lg bg-[#0d8d78] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#0b7866] disabled:opacity-50"
        >
          {sending ? "Envoi..." : "Publier la réponse"}
        </button>
      </div>
    </form>
  );
}

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

  function handleReplied(reviewId: string, reply: string) {
    setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, teacherReply: reply } : r)));
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f] dark:bg-[#0c1626] dark:text-white">
      <SiteNavbar dark={false} />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#e5f7f2] border border-[#0d8d78]/25 px-2.5 py-0.5 text-xs font-bold text-[#0d8d78] dark:bg-[#72d6bf]/15 dark:border-[#72d6bf]/30 dark:text-[#72d6bf]">
                Avis & Notations
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight dark:text-white">
              Avis des Élèves ({reviews.length})
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Retrouvez l'ensemble des retours d'expérience et évaluations reçus après vos séances de cours.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2.5 dark:bg-amber-500/10 dark:border-amber-500/30">
            <IconStar className="h-5 w-5 fill-amber-500 text-amber-500" />
            <div>
              <p className="font-bold text-base text-amber-950 dark:text-amber-300"> {avgRating.toFixed(1)} / 5</p>
              <p className="text-[10px] text-amber-800 dark:text-amber-400">Note moyenne globale</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0d8d78] border-t-transparent mx-auto"></div>
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Chargement des avis...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-white/10 dark:bg-white/[.05] dark:shadow-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 mb-3 dark:bg-amber-500/10 dark:text-amber-400">
              <IconStar className="h-7 w-7 fill-amber-500" />
            </div>
            <h2 className="text-lg font-bold dark:text-white">Aucun avis reçu pour le moment.</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Vos élèves pourront vous évaluer après chaque séance de cours effectuée.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3 dark:border-white/10 dark:bg-white/[.05] dark:shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base dark:text-white">{r.studentName}</h3>
                    <span className="text-[11px] text-slate-400 font-mono dark:text-slate-500">
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
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed italic bg-slate-50 p-3.5 rounded-2xl border border-slate-100 dark:text-slate-300 dark:bg-white/[.03] dark:border-white/10">
                    "{r.comment}"
                  </p>
                )}

                {r.photoUrl && (
                  <div className="relative h-32 w-32 overflow-hidden rounded-2xl">
                    <Image src={r.photoUrl} alt="Photo de l'avis" fill sizes="128px" className="object-cover" />
                  </div>
                )}

                <ReplyComposer review={r} onReplied={handleReplied} />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
