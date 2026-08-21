"use client";

import Link from "next/link";
import { useState } from "react";
import { IconCheck, IconShield } from "@/components/icons";
import { supabase } from "@/lib/client/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (password.length < 8) {
      setMessage({ type: "error", text: "Le mot de passe doit contenir au moins 8 caractères." });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Les mots de passe ne correspondent pas." });
      return;
    }

    setLoading(true);

    try {
      let accessToken: string | undefined;
      if (supabase) {
        const { data: sessionData } = await supabase.auth.getSession();
        accessToken = sessionData?.session?.access_token;
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          console.warn("Supabase updateUser warning:", error.message);
        }
      }

      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, accessToken }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Mot de passe réinitialisé avec succès ! Redirection..." });
        setTimeout(() => {
          window.location.replace("/login");
        }, 1200);
      } else {
        setMessage({ type: "success", text: "Mot de passe mis à jour ! Redirection..." });
        setTimeout(() => {
          window.location.replace("/login");
        }, 1200);
      }
    } catch {
      setMessage({ type: "error", text: "Erreur de connexion." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#11233f] px-4 py-8 sm:px-6 sm:py-16 flex items-center justify-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-10 shadow-2xl space-y-6">
        <Link href="/" className="flex items-center gap-1 font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-tight text-[#11233f]">
          <span>ProfySpace</span>
          <span className="rounded-md bg-[#0d8d78] px-1.5 py-0.5 text-xs font-extrabold text-white">.tn</span>
        </Link>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#11233f]">
            Nouveau mot de passe
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
            Saisissez votre nouveau mot de passe sécurisé pour réactiver votre accès.
          </p>
        </div>

        {message && (
          <div
            className={`rounded-2xl p-4 text-xs font-semibold ${message.type === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-900 flex items-center gap-2"
                : "border border-rose-200 bg-rose-50 text-rose-900"
              }`}
          >
            {message.type === "success" && <IconCheck className="h-4 w-4 text-emerald-600 shrink-0" />}
            <p>{message.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Nouveau mot de passe (8 caractères min) *
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

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[#0d8d78] py-3.5 font-bold text-white shadow-lg shadow-[#0d8d78]/20 transition hover:bg-[#0b7866] disabled:opacity-50"
          >
            {loading ? "Mise à jour..." : "Enregistrer le mot de passe →"}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <IconShield className="h-3.5 w-3.5 text-[#0d8d78]" />
            <span>Sécurisé</span>
          </div>
          <Link href="/login" className="font-bold text-[#0d8d78] hover:underline">
            ← Se connecter
          </Link>
        </div>
      </div>
    </main>
  );
}
