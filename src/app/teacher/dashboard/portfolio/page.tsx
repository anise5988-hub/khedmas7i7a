"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { SiteNavbar } from "@/components/site-navbar";
import { educationLevels } from "@/lib/domain/catalog";
import { useSubjectCatalog } from "@/lib/hooks/use-subject-catalog";
import {
  IconPlus,
  IconTrash,
  IconAlertCircle,
  IconCheckCircle,
  IconImage,
  IconFileText,
  IconVideo,
  IconBookOpen,
} from "@/components/icons";
import { PORTFOLIO_TYPES, PORTFOLIO_TYPE_LABELS, type PortfolioItemType } from "@/lib/server/portfolio";

type PortfolioItem = {
  id: string;
  title: string;
  description: string | null;
  type: PortfolioItemType;
  subject: string | null;
  level: string | null;
  mediaUrl: string;
  thumbnailUrl: string | null;
  externalUrl: string | null;
  isPublic: boolean;
  sortOrder: number;
  createdAt: string;
};

const TYPE_ICONS: Record<PortfolioItemType, (props: { className?: string }) => React.ReactElement> = {
  IMAGE: IconImage,
  DOCUMENT: IconFileText,
  VIDEO: IconVideo,
  LINK: IconBookOpen,
};

const TYPE_ACCEPTS: Record<PortfolioItemType, string | null> = {
  IMAGE: "image/*",
  DOCUMENT: "application/pdf",
  VIDEO: "video/*",
  LINK: null,
};

function getAuthHeaders(): Record<string, string> {
  const userId = typeof window !== "undefined" ? localStorage.getItem("profyspace_user_id") || "" : "";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (userId) headers["x-user-id"] = userId;
  return headers;
}

export default function TeacherPortfolioPage() {
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacherSlug, setTeacherSlug] = useState<string | null>(null);
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formulaire
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<PortfolioItemType>("IMAGE");
  const [subject, setSubject] = useState<string>("");
  const subjectOptions = useSubjectCatalog();
  // Masque le sélecteur tant que la première option n'est pas connue : garde `subject`
  // aligné sur le catalogue admin sans setState dans un effet.
  const effectiveSubject = subjectOptions.some((s) => s.name === subject)
    ? subject
    : subjectOptions[0]?.name ?? "";
  const [level, setLevel] = useState<string>("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [fileName, setFileName] = useState("");

  async function loadItems(id: string) {
    const res = await fetch(`/api/teacher/portfolio?teacherId=${id}&scope=manage`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setItems(data.items || []);
  }

  useEffect(() => {
    fetch("/api/teacher/profile", { headers: getAuthHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then(async (data) => {
        const id = data?.teacher?.id;
        setTeacherSlug(data?.teacher?.slug ?? null);
        if (id) {
          setTeacherId(id);
          await loadItems(id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function resetForm() {
    setTitle("");
    setDescription("");
    setType("IMAGE");
    setSubject(subjectOptions[0]?.name ?? "Mathématiques");
    setLevel("");
    setMediaUrl("");
    setExternalUrl("");
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      // Le bucket dépend du type : les images, PDF et vidéos de portfolio
      // doivent être publics pour s'afficher sur la fiche. "video" et "pdf"
      // routent vers le bucket privé des cours payants — son URL "publique"
      // renvoie une erreur 403 pour n'importe quel visiteur, y compris le
      // professeur lui-même en cliquant dessus. "portfolio-video" et
      // "attachment" pointent tous les deux vers le bucket public.
      formData.append("kind", type === "VIDEO" ? "portfolio-video" : type === "DOCUMENT" ? "attachment" : "image");
      if (type === "VIDEO" || type === "DOCUMENT") {
        if (!file.type.startsWith("video/") && file.type !== "application/pdf") {
          setMessage({ type: "error", text: "Fichier non compatible avec ce type de réalisation." });
          return;
        }
      }

      const userId = typeof window !== "undefined" ? localStorage.getItem("profyspace_user_id") || "" : "";
      const res = await fetch("/api/uploads/video", {
        method: "POST",
        headers: userId ? { "x-user-id": userId } : undefined,
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Téléversement impossible." });
        return;
      }

      setMediaUrl(data.url);
      setFileName(file.name);
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, "").slice(0, 120));
      setMessage({ type: "success", text: "Fichier téléversé. Complétez la fiche puis enregistrez." });
    } catch {
      setMessage({ type: "error", text: "Erreur de connexion pendant le téléversement." });
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);

    if (title.trim().length < 3) {
      setMessage({ type: "error", text: "Le titre doit contenir au moins 3 caractères." });
      return;
    }
    if (type === "LINK" && !externalUrl.trim()) {
      setMessage({ type: "error", text: "Renseignez l'adresse du lien." });
      return;
    }
    if (type !== "LINK" && !mediaUrl) {
      setMessage({ type: "error", text: "Téléversez d'abord un fichier." });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/teacher/portfolio", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          type,
          subject: effectiveSubject,
          level,
          mediaUrl,
          externalUrl: externalUrl.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Impossible d'enregistrer cette réalisation." });
        return;
      }

      setMessage({ type: "success", text: data.message || "Réalisation ajoutée à votre portfolio." });
      resetForm();
      setShowForm(false);
      if (teacherId) await loadItems(teacherId);
    } catch {
      setMessage({ type: "error", text: "Erreur de connexion au serveur." });
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisibility(item: PortfolioItem) {
    const res = await fetch(`/api/teacher/portfolio/${item.id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ isPublic: !item.isPublic }),
    });
    if (res.ok) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isPublic: !i.isPublic } : i)));
    }
  }

  async function removeItem(item: PortfolioItem) {
    if (typeof window !== "undefined" && !window.confirm(`Supprimer « ${item.title} » de votre portfolio ?`)) return;
    const res = await fetch(`/api/teacher/portfolio/${item.id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setMessage({ type: "success", text: "Réalisation supprimée." });
    }
  }

  const isExternal = type === "LINK";

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f] dark:bg-[#0c1626] dark:text-white">
      <SiteNavbar dark={false} />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5 dark:border-white/10">
          <div>
            <span className="rounded-full border border-[#0d8d78]/25 bg-[#e5f7f2] px-2.5 py-0.5 text-xs font-bold text-[#0d8d78] dark:border-[#72d6bf]/30 dark:bg-[#72d6bf]/15 dark:text-[#72d6bf]">
              Vitrine pédagogique
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Mon Portfolio de Réalisations</h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
              Publiez des exemples de vos travaux — exercices corrigés, sujets de Bac, fiches méthodes, extraits video —
              pour convaincre les élèves avant leur première séance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {teacherSlug && (
              <Link
                href={`/teachers/${teacherSlug}`}
                target="_blank"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-[#0d8d78] hover:text-[#0d8d78] dark:border-white/15 dark:bg-white/[.05] dark:text-slate-300"
              >
                Voir ma fiche publique ↗
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                setShowForm((open) => !open);
                setMessage(null);
              }}
              className="flex items-center gap-1.5 rounded-2xl bg-[#0d8d78] px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-[#0b7866]"
            >
              <IconPlus className="h-3.5 w-3.5" />
              {showForm ? "Fermer le formulaire" : "Ajouter une réalisation"}
            </button>
          </div>
        </div>

        {message && (
          <div
            className={`mt-6 flex items-center gap-2 rounded-2xl p-4 text-xs font-semibold ${
              message.type === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "border border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
            }`}
          >
            {message.type === "success" ? (
              <IconCheckCircle className="h-4 w-4 shrink-0" />
            ) : (
              <IconAlertCircle className="h-4 w-4 shrink-0" />
            )}
            <p>{message.text}</p>
          </div>
        )}

        {/* Formulaire d'ajout */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[.05] dark:shadow-xl"
          >
            <h2 className="text-lg font-bold">Nouvelle réalisation</h2>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Type de réalisation
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PORTFOLIO_TYPES.map((t) => {
                  const Icon = TYPE_ICONS[t];
                  return (
                    <button
                      type="button"
                      key={t}
                      onClick={() => {
                        setType(t);
                        setMediaUrl("");
                        setFileName("");
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                        type === t
                          ? "border-[#0d8d78] bg-[#e5f7f2] text-[#0d8d78] dark:border-[#72d6bf] dark:bg-[#72d6bf]/20 dark:text-[#72d6bf]"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-white/15 dark:bg-white/[.05] dark:text-slate-300"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {PORTFOLIO_TYPE_LABELS[t]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Titre de la réalisation *
              </label>
              <input
                type="text"
                required
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex : Sujet de Bac 2024 — Mathématiques, corrigé détaillé"
                className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9] dark:border-white/15 dark:bg-white/[.05] dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Description (méthode, objectif pédagogique…)
              </label>
              <textarea
                rows={3}
                maxLength={1200}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Expliquez ce que l'élève va trouver dans ce document et comment il l'aide à progresser."
                className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9] dark:border-white/15 dark:bg-white/[.05] dark:text-white"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Matière
                </label>
                <select
                  value={effectiveSubject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none focus:border-[#0d8d78] dark:border-white/15 dark:bg-[#162844] dark:text-white"
                >
                  {subjectOptions.map((s) => (
                    <option key={s.id ?? s.name} value={s.name} className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Niveau concerné
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none focus:border-[#0d8d78] dark:border-white/15 dark:bg-[#162844] dark:text-white"
                >
                  <option value="" className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">
                    Tous niveaux
                  </option>
                  {educationLevels.map((l) => (
                    <option
                      key={l.slug}
                      value={l.name}
                      className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white"
                    >
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isExternal ? (
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Adresse du lien *
                </label>
                <input
                  type="url"
                  required
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none focus:border-[#0d8d78] dark:border-white/15 dark:bg-white/[.05] dark:text-white"
                />
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Fichier *
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="cursor-pointer rounded-xl border border-[#0d8d78] px-4 py-2.5 text-xs font-bold text-[#0d8d78] transition hover:bg-[#e5f7f2] dark:border-[#72d6bf]/40 dark:text-[#72d6bf] dark:hover:bg-[#72d6bf]/15">
                    {uploading ? "Téléversement…" : mediaUrl ? "Remplacer le fichier" : "Choisir un fichier"}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={TYPE_ACCEPTS[type] ?? undefined}
                      onChange={handleUpload}
                      className="hidden"
                    />
                  </label>
                  {fileName && (
                    <span className="truncate text-xs font-semibold text-slate-600 dark:text-slate-300">{fileName}</span>
                  )}
                  {mediaUrl && !fileName && (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Fichier prêt ✓</span>
                  )}
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                  Images : 10 Mo max · PDF : 25 Mo max · Vidéo : 500 Mo max.
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-white/15 dark:bg-white/[.05] dark:text-slate-300"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving || uploading}
                className="rounded-2xl bg-[#0d8d78] px-6 py-3 text-xs font-bold text-white shadow-md transition hover:bg-[#0b7866] disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : "Publier dans mon portfolio →"}
              </button>
            </div>
          </form>
        )}

        {/* Liste des réalisations */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#0d8d78] border-t-transparent" />
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Chargement de votre portfolio…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-white/10 dark:bg-white/[.05] dark:shadow-xl">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/10">
              <IconImage className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-bold">Votre portfolio est vide</h2>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
              Ajoutez au moins trois exemples de travaux : les élèves réservent beaucoup plus facilement quand ils voient
              votre pédagogie en action.
            </p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-2xl bg-[#0d8d78] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b7866]"
            >
              <IconPlus className="h-3.5 w-3.5" />
              Ajouter ma première réalisation
            </button>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {items.map((item) => {
              const Icon = TYPE_ICONS[item.type];
              return (
                <div
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[.05] dark:shadow-xl"
                >
                  {item.type === "IMAGE" && item.mediaUrl ? (
                    <div className="relative h-40 w-full bg-slate-100 dark:bg-white/5">
                      <Image src={item.mediaUrl} alt={item.title} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-24 w-full items-center justify-center bg-gradient-to-br from-[#11233f] to-[#0d8d78] text-white">
                      <Icon className="h-8 w-8" />
                    </div>
                  )}

                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold">{item.title}</h3>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                          item.isPublic
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                        }`}
                      >
                        {item.isPublic ? "Publié" : "Masqué"}
                      </span>
                    </div>

                    <p className="mt-1 text-[11px] font-bold text-[#0d8d78] dark:text-[#72d6bf]">
                      {PORTFOLIO_TYPE_LABELS[item.type]}
                      {item.subject ? ` · ${item.subject}` : ""}
                      {item.level ? ` · ${item.level}` : ""}
                    </p>

                    {item.description && (
                      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {item.description}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-white/10">
                      <a
                        href={item.type === "LINK" ? item.externalUrl || item.mediaUrl : item.mediaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-[#11233f] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#1a3a5c] dark:bg-[#72d6bf] dark:text-[#11233f]"
                      >
                        Aperçu ↗
                      </a>
                      <button
                        type="button"
                        onClick={() => toggleVisibility(item)}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50 dark:border-white/15 dark:text-slate-300"
                      >
                        {item.isPublic ? "Masquer" : "Publier"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item)}
                        className="ml-auto rounded-xl p-1.5 text-rose-500 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                        title="Supprimer"
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}