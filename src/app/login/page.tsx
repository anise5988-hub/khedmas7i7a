"use client";

import Link from "next/link";
import { useState } from "react";
import { IconCheck } from "@/components/icons";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [justRegistered] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("registered") === "1" || params.get("registered") === "true";
  });

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: data.get("email"),
        password: data.get("password"),
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setPending(false);
      setError(result.error ?? "Connexion impossible. Vérifiez vos identifiants.");
      return;
    }

    // Redirect to the appropriate dashboard
    const params = new URLSearchParams(window.location.search);
    const redirectUrl = params.get("redirect");
    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      window.location.href =
        result.role === "TEACHER"
          ? "/teacher/dashboard"
          : result.role === "ADMIN"
          ? "/admin"
          : "/dashboard";
    }
  }

  return (
    <main className="min-h-screen bg-[#11233f] px-4 py-8 sm:px-6 sm:py-16 flex items-center justify-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-10 shadow-2xl">
        <Link href="/" className="font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-[-.06em] text-[#11233f]">
          profy<span className="text-[#0d8d78]">.tn</span>
        </Link>

        {justRegistered && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 shadow-sm animate-fade-in">
            <IconCheck className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Compte créé avec succès !</p>
              <p className="mt-0.5 text-emerald-700">Connectez-vous avec votre email et mot de passe pour accéder à votre espace.</p>
            </div>
          </div>
        )}

        <h1 className="mt-8 text-3xl font-bold tracking-tight text-[#11233f]">Bon retour.</h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-500">
          Connectez-vous pour retrouver vos cours, vos réservations et votre portefeuille.
        </p>

        <form onSubmit={login} className="mt-8 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Adresse Email
            </label>
            <input
              name="email"
              required
              type="email"
              placeholder="nom@exemple.tn"
              className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Mot de passe
            </label>
            <input
              name="password"
              required
              type="password"
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
            disabled={pending}
            className="w-full rounded-2xl bg-[#0d8d78] py-4 font-bold text-white shadow-lg shadow-[#0d8d78]/20 transition hover:bg-[#0b7866] disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "Connexion en cours..." : "Se connecter →"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-slate-500">
          Pas encore de compte ?{" "}
          <Link className="font-bold text-[#0d8d78] hover:underline" href="/register">
            S’inscrire gratuitement
          </Link>
        </p>
      </div>
    </main>
  );
}
