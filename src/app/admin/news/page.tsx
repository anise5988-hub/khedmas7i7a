/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconCheckCircle,
  IconAlertCircle,
  IconNewspaper,
  IconX,
  IconImage,
} from "@/components/icons";

type NewsItem = {
  id: string;
  title: string;
  shortDescription: string;
  content: string;
  imageUrl?: string | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};
export default function AdminNewsPage() {
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "PUBLISHED" | "DRAFT">("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NewsItem | null>(null);
  const [previewItem, setPreviewItem] = useState<NewsItem | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotification({ type: "error", text: "Veuillez choisir un fichier image." });
      return;
    }
    setImageUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", "image");
    try {
      const res = await fetch("/api/uploads/video", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Envoi de l'image impossible.");
      setImageUrl(data.url);
    } catch (error) {
      setNotification({ type: "error", text: error instanceof Error ? error.message : "Envoi de l'image impossible." });
    } finally {
      setImageUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  function loadNews() {
    setLoading(true);
    fetch("/api/admin/news")
      .then((res) => (res.ok ? res.json() : { news: [] }))
      .then((data) => {
        setNewsList(data.news || []);
      })
      .catch(() => {
        setNotification({ type: "error", text: "Impossible de charger les actualités." });
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadNews();
  }, []);

  function openCreateModal() {
    setEditingItem(null);
    setTitle("");
    setShortDescription("");
    setContent("");
    setImageUrl("");
    setPublished(false);
    setModalOpen(true);
  }

  function openEditModal(item: NewsItem) {
    setEditingItem(item);
    setTitle(item.title);
    setShortDescription(item.shortDescription);
    setContent(item.content);
    setImageUrl(item.imageUrl || "");
    setPublished(item.published);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNotification(null);

    const payload = {
      title: title.trim(),
      shortDescription: shortDescription.trim(),
      content: content.trim(),
      imageUrl: imageUrl.trim() || null,
      published,
    };

    try {
      const url = editingItem ? `/api/admin/news/${editingItem.id}` : "/api/admin/news";
      const method = editingItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setNotification({
          type: "success",
          text: editingItem ? "Actualité mise à jour avec succès." : "Actualité créée avec succès.",
        });
        setModalOpen(false);
        loadNews();
      } else {
        setNotification({ type: "error", text: data.error || "Erreur lors de l'enregistrement." });
      }
    } catch {
      setNotification({ type: "error", text: "Erreur de connexion au serveur." });
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(item: NewsItem) {
    setActionLoading(item.id);
    try {
      const res = await fetch(`/api/admin/news/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !item.published }),
      });
      if (res.ok) {
        setNewsList((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, published: !item.published } : n))
        );
        setNotification({
          type: "success",
          text: !item.published ? "Actualité publiée sur la page d'accueil !" : "Actualité retirée de la page d'accueil (Brouillon).",
        });
      }
    } catch {
      setNotification({ type: "error", text: "Impossible de modifier la publication." });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer définitivement cette actualité ?")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/news/${id}`, { method: "DELETE" });
      if (res.ok) {
        setNewsList((prev) => prev.filter((n) => n.id !== id));
        setNotification({ type: "success", text: "Actualité supprimée." });
      }
    } catch {
      setNotification({ type: "error", text: "Erreur lors de la suppression." });
    } finally {
      setActionLoading(null);
    }
  }

  const filteredNews =
    filter === "ALL"
      ? newsList
      : filter === "PUBLISHED"
      ? newsList.filter((n) => n.published)
      : newsList.filter((n) => !n.published);

  const publishedCount = newsList.filter((n) => n.published).length;
  const draftCount = newsList.filter((n) => !n.published).length;
  return (
    <main className="min-h-screen bg-[#101b2d] px-4 py-8 sm:px-6 sm:py-10 text-white">
      <div className="mx-auto max-w-7xl">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-1 font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-tight">
              <span>ProfySpace</span>
              <span className="rounded-md bg-[#72d6bf] px-1.5 py-0.5 text-xs font-extrabold text-[#101b2d]">.admin</span>
            </Link>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">
              Système d'Actualités Homepage
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
            >
              ← Retour au Dashboard
            </Link>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 rounded-full bg-[#72d6bf] px-4 py-2 text-xs font-bold text-[#101b2d] transition hover:bg-[#5ec4ad] shadow-md"
            >
              <IconPlus className="h-4 w-4" />
              <span>Créer une Actualité</span>
            </button>
          </div>
        </div>

        {/* Page Title & Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#72d6bf]">Contrôle Éditorial</p>
            <h1 className="mt-1 text-3xl font-bold">Gestion des Actualités & Nouveautés</h1>
            <p className="mt-1 text-sm text-slate-400">
              Seules les actualités avec le statut <strong>Publié</strong> sont affichées dans la bannière animée sur la page d'accueil.
            </p>
          </div>

          <button
            onClick={loadNews}
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold transition hover:bg-white/20"
          >
             Actualiser
          </button>
        </div>

        {notification && (
          <div
            className={`mt-6 rounded-2xl border p-4 text-xs font-semibold flex items-center justify-between ${
              notification.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-rose-500/30 bg-rose-500/10 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === "success" ? <IconCheckCircle className="h-4 w-4" /> : <IconAlertCircle className="h-4 w-4" />}
              <span>{notification.text}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-white/60 hover:text-white">✕</button>
          </div>
        )}

        {/* Filters */}
        <div className="mt-8 flex flex-wrap gap-2 border-b border-white/10 pb-4">
          <button
            onClick={() => setFilter("ALL")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filter === "ALL" ? "bg-white text-slate-900" : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            Toutes ({newsList.length})
          </button>
          <button
            onClick={() => setFilter("PUBLISHED")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filter === "PUBLISHED" ? "bg-emerald-400 text-slate-900" : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            Publiées sur l'accueil ({publishedCount})
          </button>
          <button
            onClick={() => setFilter("DRAFT")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filter === "DRAFT" ? "bg-amber-400 text-slate-900" : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            Brouillons ({draftCount})
          </button>
        </div>

        {/* List of News */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#72d6bf] border-t-transparent mx-auto"></div>
            <p className="mt-4 text-sm text-slate-400">Chargement des actualités...</p>
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-white/10 bg-white/[.03] py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white mx-auto">
              <IconNewspaper className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold">Aucune actualité trouvée.</h3>
            <p className="mt-1 text-xs text-slate-400">Cliquez sur « Créer une Actualité » pour publier une annonce officielle.</p>
            <button
              onClick={openCreateModal}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#72d6bf] px-5 py-2.5 text-xs font-bold text-[#101b2d] transition hover:bg-[#5ec4ad]"
            >
              <IconPlus className="h-4 w-4" />
              <span>Créer la première actualité</span>
            </button>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredNews.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-white/10 bg-white/[.05] p-6 shadow-xl flex flex-col justify-between transition hover:border-white/20"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <span
                      className={`rounded-full px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                        item.published
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {item.published ? "✓ Publié en direct" : "⏳ Brouillon"}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(item.createdAt).toLocaleDateString("fr-TN")}
                    </span>
                  </div>

                  <h2 className="mt-4 font-bold text-lg text-white line-clamp-2">{item.title}</h2>
                  <p className="mt-2 text-xs text-slate-300 line-clamp-3 leading-relaxed">{item.shortDescription}</p>
                </div>

                <div className="mt-6 border-t border-white/10 pt-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPreviewItem(item)}
                      className="rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-white/10"
                    >
                      Aperçu
                    </button>
                    <button
                      onClick={() => openEditModal(item)}
                      className="rounded-xl border border-white/20 bg-white/5 p-1.5 text-slate-300 transition hover:bg-white/10"
                      title="Modifier"
                    >
                      <IconEdit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={actionLoading === item.id}
                      className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-1.5 text-rose-300 transition hover:bg-rose-500/20"
                      title="Supprimer"
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => togglePublish(item)}
                    disabled={actionLoading === item.id}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                      item.published
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                        : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                    }`}
                  >
                    {item.published ? "Dépublier" : "Publier →"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="w-full max-w-2xl rounded-3xl bg-[#15233c] border border-white/20 p-6 sm:p-8 shadow-2xl space-y-5 my-8 text-white">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <IconNewspaper className="h-5 w-5 text-[#72d6bf]" />
                  <h3 className="text-xl font-bold">
                    {editingItem ? "Modifier l'actualité" : "Créer une nouvelle actualité"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <IconX className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Titre de l'actualité *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Ouverture des inscriptions pour la session de révision Bac 2026"
                    className="w-full rounded-2xl border border-white/20 bg-white/5 p-3.5 text-sm text-white outline-none focus:border-[#72d6bf] focus:ring-1 focus:ring-[#72d6bf]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Résumé court (affiché dans le bandeau d'accueil) *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="Brève description concise qui attire l'attention des élèves et professeurs..."
                    className="w-full rounded-2xl border border-white/20 bg-white/5 p-3.5 text-sm text-white outline-none focus:border-[#72d6bf] focus:ring-1 focus:ring-[#72d6bf]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Contenu complet de l'article *
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Détails complets de l'actualité, informations importantes, dates clés..."
                    className="w-full rounded-2xl border border-white/20 bg-white/5 p-3.5 text-sm text-white outline-none focus:border-[#72d6bf] focus:ring-1 focus:ring-[#72d6bf]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Image de l'actualité (Optionnel)
                  </label>
                  <input
                    type="file"
                    ref={imageInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {imageUrl ? (
                    <div className="group relative overflow-hidden rounded-2xl border border-white/20">
                      <img src={imageUrl} alt="Aperçu de l'actualité" className="h-40 w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          disabled={imageUploading}
                          className="rounded-xl bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-900 transition hover:bg-white disabled:opacity-50"
                        >
                          {imageUploading ? "Envoi..." : "Changer l'image"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageUrl("")}
                          className="rounded-xl bg-rose-500/90 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-rose-500"
                        >
                          Retirer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={imageUploading}
                      className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/20 bg-white/5 p-8 text-center transition hover:border-[#72d6bf]/50 hover:bg-white/10 disabled:opacity-50"
                    >
                      {imageUploading ? (
                        <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#72d6bf] border-t-transparent" />
                      ) : (
                        <IconImage className="h-6 w-6 text-slate-400" />
                      )}
                      <span className="text-xs font-bold text-slate-300">
                        {imageUploading ? "Envoi en cours..." : "Cliquez pour choisir une image"}
                      </span>
                      <span className="text-[10px] text-slate-500">JPG, PNG jusqu'à 10 MB</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <input
                    type="checkbox"
                    id="publishedCheckbox"
                    checked={published}
                    onChange={(e) => setPublished(e.target.checked)}
                    className="h-5 w-5 rounded border-white/20 text-[#0d8d78] focus:ring-[#72d6bf]"
                  />
                  <label htmlFor="publishedCheckbox" className="text-xs font-semibold cursor-pointer select-none">
                    Publier immédiatement sur la page d'accueil
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-2xl border border-white/20 px-5 py-3 text-xs font-bold text-slate-300 hover:bg-white/10"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-2xl bg-[#72d6bf] px-6 py-3 text-xs font-bold text-[#101b2d] transition hover:bg-[#5ec4ad] disabled:opacity-50"
                  >
                    {saving ? "Enregistrement..." : editingItem ? "Mettre à jour →" : "Créer l'actualité →"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {previewItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-xl rounded-3xl bg-[#15233c] border border-white/20 p-6 sm:p-8 shadow-2xl space-y-4 text-white">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#72d6bf]">
                  Aperçu Actualité Homepage
                </span>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="rounded-xl p-1 text-slate-400 hover:text-white"
                >
                  <IconX className="h-5 w-5" />
                </button>
              </div>

              <div>
                <h2 className="text-2xl font-bold">{previewItem.title}</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Publié le {new Date(previewItem.createdAt).toLocaleDateString("fr-TN", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 p-4 text-xs font-medium text-slate-300 border border-white/10">
                {previewItem.shortDescription}
              </div>

              <div className="text-sm text-slate-200 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-line pr-2">
                {previewItem.content}
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end">
                <button
                  onClick={() => setPreviewItem(null)}
                  className="rounded-2xl bg-white/10 px-5 py-2.5 text-xs font-bold text-white hover:bg-white/20"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
