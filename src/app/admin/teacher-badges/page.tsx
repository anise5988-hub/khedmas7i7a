"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Grant = {
  id: string;
  slug: string;
  reason: string | null;
  createdAt: string;
  teacherName: string;
  teacherEmail: string;
};

const BADGE_LABELS: Record<string, string> = {
  "premier-cours-donne": "Premier cours donné",
  "professeur-populaire": "Professeur populaire",
  "excellence-pedagogique": "Excellence pédagogique",
  "veteran-profyspace": "Vétéran ProfySpace",
};

export default function AdminTeacherBadgesPage() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [slug, setSlug] = useState("excellence-pedagogique");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    fetch("/api/admin/teacher-badges")
      .then((r) => r.json())
      .then((data) => setGrants(data.grants ?? []))
      .catch(() => setError("Impossible de charger les attributions."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function grant(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/teacher-badges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, slug, reason }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Attribution impossible.");
      return;
    }
    setEmail("");
    setReason("");
    load();
  }

  async function revoke(id: string) {
    await fetch(`/api/admin/teacher-badges?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-[#11233f]">Badges manuels des professeurs</h1>
        <Link href="/admin/settings" className="text-sm font-bold text-[#0d8d78] hover:underline">
          ← Paramètres
        </Link>
      </div>

      <form onSubmit={grant} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
          Email du professeur
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
          Badge
          <select
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal"
          >
            {Object.entries(BADGE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-slate-600 sm:col-span-2">
          Motif (visible uniquement dans l'admin)
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal"
          />
        </label>
        <div className="sm:col-span-2 flex items-center justify-between gap-3">
          {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : <span />}
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#0d8d78] px-4 py-2 text-sm font-bold text-white hover:bg-[#0b7866] disabled:opacity-50"
          >
            {saving ? "Attribution..." : "Attribuer le badge"}
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <p className="border-b border-slate-100 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
          Attributions actives
        </p>
        {loading ? (
          <p className="p-5 text-sm text-slate-400">Chargement...</p>
        ) : grants.length === 0 ? (
          <p className="p-5 text-sm text-slate-400">Aucune attribution manuelle.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {grants.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#11233f]">
                    {BADGE_LABELS[g.slug] ?? g.slug} · {g.teacherName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {g.teacherEmail}
                    {g.reason ? ` · ${g.reason}` : ""}
                  </p>
                </div>
                <button onClick={() => void revoke(g.id)} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100">
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
