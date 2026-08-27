/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconPlus, IconTrash, IconEdit } from "@/components/icons";

type Faq = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  active: boolean;
};

const DEFAULT_HERO = {
  heroTitlePrefix: "Trouvez votre prof particulier",
  heroTitleHighlight: "idéal.",
  heroDescription:
    "Cours particuliers en ligne par classe virtuelle HD ou en présentiel partout en Tunisie. Des professeurs vérifiés par notre équipe, du primaire au Baccalauréat, pour réussir vos examens et booster vos moyennes.",
  bannerMessage: "",
  bannerLinkUrl: "",
  bannerLinkLabel: "",
  bannerActive: false,
};

export default function AdminContentPage() {
  const [hero, setHero] = useState(DEFAULT_HERO);
  const [heroLoading, setHeroLoading] = useState(true);
  const [heroSaving, setHeroSaving] = useState(false);
  const [heroMessage, setHeroMessage] = useState("");

  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [faqsLoading, setFaqsLoading] = useState(true);
  const [faqError, setFaqError] = useState("");
  const [faqFormOpen, setFaqFormOpen] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqForm, setFaqForm] = useState({ question: "", answer: "" });

  function loadHero() {
    setHeroLoading(true);
    fetch("/api/admin/content/hero")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.content) {
          setHero({
            heroTitlePrefix: data.content.heroTitlePrefix,
            heroTitleHighlight: data.content.heroTitleHighlight,
            heroDescription: data.content.heroDescription,
            bannerMessage: data.content.bannerMessage || "",
            bannerLinkUrl: data.content.bannerLinkUrl || "",
            bannerLinkLabel: data.content.bannerLinkLabel || "",
            bannerActive: data.content.bannerActive,
          });
        }
      })
      .finally(() => setHeroLoading(false));
  }

  function loadFaqs() {
    setFaqsLoading(true);
    fetch("/api/admin/content/faqs")
      .then((res) => (res.ok ? res.json() : { faqs: [] }))
      .then((data) => setFaqs(data.faqs || []))
      .catch(() => setFaqError("Impossible de charger les questions."))
      .finally(() => setFaqsLoading(false));
  }

  useEffect(() => {
    loadHero();
    loadFaqs();
  }, []);

  async function saveHero(e: React.FormEvent) {
    e.preventDefault();
    setHeroSaving(true);
    setHeroMessage("");
    try {
      const res = await fetch("/api/admin/content/hero", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hero),
      });
      const data = await res.json();
      setHeroMessage(res.ok ? "Enregistré." : data.error || "Erreur lors de l'enregistrement.");
    } catch {
      setHeroMessage("Erreur de connexion.");
    } finally {
      setHeroSaving(false);
    }
  }

  async function submitFaq(e: React.FormEvent) {
    e.preventDefault();
    const method = editingFaqId ? "PATCH" : "POST";
    const url = editingFaqId ? `/api/admin/content/faqs/${editingFaqId}` : "/api/admin/content/faqs";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(faqForm),
    });
    if (res.ok) {
      setFaqFormOpen(false);
      setEditingFaqId(null);
      setFaqForm({ question: "", answer: "" });
      loadFaqs();
    } else {
      const data = await res.json().catch(() => null);
      setFaqError(data?.error || "Erreur lors de l'enregistrement.");
    }
  }

  async function toggleFaqActive(faq: Faq) {
    await fetch(`/api/admin/content/faqs/${faq.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !faq.active }),
    });
    loadFaqs();
  }

  async function deleteFaq(id: string) {
    if (!confirm("Supprimer cette question ?")) return;
    await fetch(`/api/admin/content/faqs/${id}`, { method: "DELETE" });
    loadFaqs();
  }

  return (
    <main className="min-h-screen bg-[#101b2d] px-4 py-8 sm:px-6 sm:py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h1 className="text-3xl font-bold">Contenu de la page d&apos;accueil</h1>
            <p className="mt-1 text-sm text-slate-400">
              Modifiez le texte principal, la bannière promotionnelle et la FAQ affichés publiquement.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
          >
            ← Retour Dashboard
          </Link>
        </div>

        {/* Hero + banner */}
        <div className="mt-8 rounded-3xl border border-white/10 bg-white/[.04] p-6 sm:p-8">
          <h2 className="text-xl font-bold">Section d&apos;accueil (Hero)</h2>
          {heroLoading ? (
            <p className="mt-4 text-sm text-slate-400">Chargement...</p>
          ) : (
            <form onSubmit={saveHero} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Titre (début)</label>
                  <input
                    type="text"
                    value={hero.heroTitlePrefix}
                    onChange={(e) => setHero({ ...hero, heroTitlePrefix: e.target.value })}
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:border-[#72d6bf]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Titre (mis en valeur)</label>
                  <input
                    type="text"
                    value={hero.heroTitleHighlight}
                    onChange={(e) => setHero({ ...hero, heroTitleHighlight: e.target.value })}
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:border-[#72d6bf]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Description</label>
                <textarea
                  rows={3}
                  value={hero.heroDescription}
                  onChange={(e) => setHero({ ...hero, heroDescription: e.target.value })}
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:border-[#72d6bf]"
                />
              </div>

              <div className="border-t border-white/10 pt-4">
                <label className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 mb-3">
                  <input
                    type="checkbox"
                    checked={hero.bannerActive}
                    onChange={(e) => setHero({ ...hero, bannerActive: e.target.checked })}
                    className="h-4 w-4"
                  />
                  Bannière promotionnelle active
                </label>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Message</label>
                    <input
                      type="text"
                      value={hero.bannerMessage}
                      onChange={(e) => setHero({ ...hero, bannerMessage: e.target.value })}
                      placeholder="Ex : Rentrée scolaire — 10% sur votre première recharge"
                      className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:border-[#72d6bf]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Lien</label>
                    <input
                      type="text"
                      value={hero.bannerLinkUrl}
                      onChange={(e) => setHero({ ...hero, bannerLinkUrl: e.target.value })}
                      placeholder="/courses"
                      className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:border-[#72d6bf]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Texte du bouton</label>
                    <input
                      type="text"
                      value={hero.bannerLinkLabel}
                      onChange={(e) => setHero({ ...hero, bannerLinkLabel: e.target.value })}
                      placeholder="Voir les cours"
                      className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:border-[#72d6bf]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={heroSaving}
                  className="rounded-2xl bg-[#72d6bf] px-6 py-2.5 text-sm font-bold text-[#101b2d] transition hover:bg-[#5ec4ad] disabled:opacity-50"
                >
                  {heroSaving ? "Enregistrement..." : "Enregistrer"}
                </button>
                {heroMessage && <span className="text-xs text-slate-300">{heroMessage}</span>}
              </div>
            </form>
          )}
        </div>

        {/* FAQ management */}
        <div className="mt-8 rounded-3xl border border-white/10 bg-white/[.04] p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Foire aux questions</h2>
            <button
              onClick={() => {
                setFaqFormOpen(true);
                setEditingFaqId(null);
                setFaqForm({ question: "", answer: "" });
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#72d6bf] px-4 py-2 text-xs font-bold text-[#101b2d] transition hover:bg-[#5ec4ad]"
            >
              <IconPlus className="h-4 w-4" />
              Ajouter
            </button>
          </div>

          {faqError && (
            <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-300">
              {faqError}
            </div>
          )}

          {faqFormOpen && (
            <form onSubmit={submitFaq} className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/[.03] p-4">
              <input
                type="text"
                required
                placeholder="Question"
                value={faqForm.question}
                onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:border-[#72d6bf]"
              />
              <textarea
                required
                rows={3}
                placeholder="Réponse"
                value={faqForm.answer}
                onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:border-[#72d6bf]"
              />
              <div className="flex items-center gap-2">
                <button type="submit" className="rounded-xl bg-[#72d6bf] px-4 py-2 text-xs font-bold text-[#101b2d]">
                  {editingFaqId ? "Modifier" : "Ajouter"}
                </button>
                <button
                  type="button"
                  onClick={() => setFaqFormOpen(false)}
                  className="rounded-xl border border-white/20 px-4 py-2 text-xs font-bold text-white"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}

          <div className="mt-4 space-y-2.5">
            {faqsLoading ? (
              <p className="text-sm text-slate-400">Chargement...</p>
            ) : faqs.length === 0 ? (
              <p className="text-sm text-slate-400">
                Aucune question personnalisée — la page publique affiche la FAQ par défaut.
              </p>
            ) : (
              faqs.map((faq) => (
                <div key={faq.id} className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4">
                  <div className={faq.active ? "" : "opacity-50"}>
                    <p className="text-sm font-bold text-white">{faq.question}</p>
                    <p className="mt-1 text-xs text-slate-400 line-clamp-2">{faq.answer}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => toggleFaqActive(faq)}
                      className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:bg-white/10"
                    >
                      {faq.active ? "Masquer" : "Activer"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingFaqId(faq.id);
                        setFaqForm({ question: faq.question, answer: faq.answer });
                        setFaqFormOpen(true);
                      }}
                      className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10"
                      title="Modifier"
                    >
                      <IconEdit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteFaq(faq.id)}
                      className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-500/10"
                      title="Supprimer"
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
