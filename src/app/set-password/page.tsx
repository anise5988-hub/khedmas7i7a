"use client";

import Link from "next/link";
import { useState } from "react";
import { IconCheck, IconShield } from "@/components/icons";

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [role] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("profyspace_user");
        if (stored) {
          const u = JSON.parse(stored);
          if (u?.role) return u.role;
        }
      } catch {}
    }
    return "STUDENT";
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setPending(true);

    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      setPending(false);

      if (!res.ok || !data.success) {
        setError(data.error || "Impossible de définir le mot de passe.");
        return;
      }

      const targetUrl = role === "TEACHER" ? "/teacher/dashboard" : "/dashboard";
      window.location.replace(targetUrl);
    } catch {
      setPending(false);
      setError("Erreur de connexion au serveur.");
    }
  }

  function handleSkip() {
    const targetUrl = role === "TEACHER" ? "/teacher/dashboard" : "/dashboard";
    window.location.replace(targetUrl);
  }

  return (
    <main className="min-h-screen bg-[#11233f] px-4 py-8 sm:px-6 sm:py-16 flex items-center justify-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-10 shadow-2xl space-y-6">
        <div>
          <Link href="/" className="flex items-center gap-1 font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-tight text-[#11233f]">
            <span>ProfySpace</span>
            <span className="rounded-md bg-[#0d8d78] px-1.5 py-0.5 text-xs font-extrabold text-white">.tn</span>
          </Link>

          <div className="mt-6 flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-semibold text-emerald-800">
            <IconCheck className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>Compte Google vérifié avec succès !</span>
          </div>

          <h1 className="mt-6 text-2xl font-bold tracking-tight text-[#11233f]">
            Choisissez votre mot de passe
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
            Définissez un mot de passe pour pouvoir vous connecter directement avec votre email la prochaine fois.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Créer un mot de passe *
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Confirmer le mot de passe *
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-[#0d8d78] py-4 text-center font-bold text-white shadow-lg shadow-[#0d8d78]/20 transition hover:bg-[#0b7866] disabled:opacity-60"
          >
            {pending ? "Enregistrement..." : "Enregistrer et continuer vers mon espace →"}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <IconShield className="h-3.5 w-3.5 text-[#0d8d78]" />
            <span>Sécurisé</span>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="font-bold text-slate-500 hover:text-[#0d8d78] transition hover:underline"
          >
            Passer cette étape →
          </button>
        </div>
      </div>
    </main>
  );
}
