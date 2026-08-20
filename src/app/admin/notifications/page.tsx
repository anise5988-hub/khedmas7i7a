"use client";

import { useState } from "react";

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState("ALL");
  const [type, setType] = useState<"INFO" | "SUCCESS" | "WARNING" | "SYSTEM">("SYSTEM");
  const [link, setLink] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ type: "error" | "success"; message: string } | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    if (!title.trim() || !message.trim()) {
      setStatus({ type: "error", message: "Le titre et le message sont obligatoires." });
      return;
    }

    setPending(true);

    try {
      const res = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          message,
          targetRole: targetRole === "ALL" ? null : targetRole,
          type,
          link: link.trim() || null,
        }),
      });

      const data = await res.json();
      setPending(false);

      if (!res.ok || !data.success) {
        setStatus({ type: "error", message: data.error || "Erreur lors de l'envoi." });
        return;
      }

      setStatus({ type: "success", message: "Notification diffusée avec succès à tous les utilisateurs ciblés !" });
      setTitle("");
      setMessage("");
      setLink("");
    } catch {
      setPending(false);
      setStatus({ type: "error", message: "Erreur de connexion au serveur." });
    }
  }

  return (
    <main className="min-h-screen bg-[#101b2d] px-4 py-8 sm:px-6 sm:py-10 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-4">
            <a href="/admin" className="flex items-center gap-1 font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-tight">
              <span>ProfySpace</span>
              <span className="rounded-md bg-[#72d6bf] px-1.5 py-0.5 text-xs font-extrabold text-[#101b2d]">.admin</span>
            </a>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">
              Diffusion de Notifications
            </span>
          </div>
          <a
            href="/admin"
            className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
          >
            ← Retour Dashboard
          </a>
        </div>

        {/* Form Container */}
        <div className="rounded-3xl border border-white/10 bg-white/[.04] p-6 sm:p-10 shadow-2xl">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Diffuser une notification professionnelle</h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Envoyez un message clair, élégant et instantané dans le centre de notifications des utilisateurs.
            </p>
          </div>

          <form onSubmit={handleSend} className="mt-8 space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Titre de la notification *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Mise à jour de la plateforme, Nouveau service..."
                className="w-full rounded-2xl border border-white/20 bg-white/10 p-3.5 text-sm text-white placeholder-slate-500 outline-none focus:border-[#72d6bf]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Message / Contenu *
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Rédigez votre message professionnel ici..."
                className="w-full rounded-2xl border border-white/20 bg-white/10 p-3.5 text-sm text-white placeholder-slate-500 outline-none focus:border-[#72d6bf]"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Destinataires cibles
                </label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full rounded-2xl border border-white/20 bg-[#17253b] p-3.5 text-sm text-white outline-none focus:border-[#72d6bf]"
                >
                  <option value="ALL">Tous les utilisateurs (Élèves & Profs)</option>
                  <option value="STUDENT">Élèves / Parents uniquement</option>
                  <option value="TEACHER">Professeurs uniquement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Type / Style d'icône
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as "INFO" | "SUCCESS" | "WARNING" | "SYSTEM")}
                  className="w-full rounded-2xl border border-white/20 bg-[#17253b] p-3.5 text-sm text-white outline-none focus:border-[#72d6bf]"
                >
                  <option value="SYSTEM">🟣 Annonce Système / Violet</option>
                  <option value="INFO">🔵 Information / Bleu</option>
                  <option value="SUCCESS">🟢 Succès & Transaction / Vert</option>
                  <option value="WARNING">🟠 Rappel & Avertissement / Orange</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Lien de redirection (Optionnel)
              </label>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="Ex: /teachers, /dashboard/wallet, /support"
                className="w-full rounded-2xl border border-white/20 bg-white/10 p-3.5 text-sm text-white placeholder-slate-500 outline-none focus:border-[#72d6bf]"
              />
            </div>

            {status && (
              <div
                className={`rounded-2xl p-4 text-xs font-semibold ${
                  status.type === "error"
                    ? "bg-rose-500/20 text-rose-200 border border-rose-500/30"
                    : "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
                }`}
              >
                {status.message}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-2xl bg-[#72d6bf] py-4 text-center font-bold text-[#101b2d] shadow-lg shadow-[#72d6bf]/20 transition hover:bg-[#5ec4ad] disabled:opacity-50"
            >
              {pending ? "Diffusion en cours..." : "Diffuser la notification →"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
