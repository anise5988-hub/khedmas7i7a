"use client";

import Link from "next/link";
import { useState } from "react";
import { IconCheck, IconShield } from "@/components/icons";
import { signInWithGoogle } from "@/lib/client/supabase";

export function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.88c2.27-2.09 3.665-5.17 3.665-9.09z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.09C3.29 21.43 7.37 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.32c-.25-.72-.38-1.49-.38-2.32s.13-1.6.38-2.32V6.59H1.26C.46 8.19 0 9.98 0 12s.46 3.81 1.26 5.41l4.02-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.29 2.57 1.26 6.59l4.02 3.09c.95-2.83 3.6-4.93 6.72-4.93z"
      />
    </svg>
  );
}

export function LoginPageClient() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [justRegistered] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("registered") === "1" || params.get("registered") === "true";
  });
  const [googlePending, setGooglePending] = useState(false);

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

    if (result.user?.id) {
      localStorage.setItem("profyspace_user_id", result.user.id);
      localStorage.setItem("profyspace_user", JSON.stringify(result.user));
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

  async function handleGoogleLogin() {
    setGooglePending(true);
    setError("");
    try {
      const { error } = await signInWithGoogle("STUDENT");
      if (error) {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        setError(`Erreur Google: ${error.message}. Ajoutez "${origin}/auth/callback" dans Supabase > Authentication > URL Configuration > Redirect URLs.`);
        setGooglePending(false);
      }
    } catch {
      setError("Erreur de connexion Google.");
      setGooglePending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#11233f] px-4 py-8 sm:px-6 sm:py-16 flex items-center justify-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-10 shadow-2xl">
        <Link href="/" className="flex items-center gap-1 font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-tight text-[#11233f]">
          <span>ProfySpace</span>
          <span className="rounded-md bg-[#0d8d78] px-1.5 py-0.5 text-xs font-extrabold text-white">.tn</span>
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
        <p className="mt-1 text-xs sm:text-sm text-slate-500 mb-6">
          Connectez-vous pour retrouver vos cours, vos réservations et votre portefeuille.
        </p>

        <form onSubmit={login} method="post" className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Adresse Email
            </label>
            <input
              name="email"
              id="email"
              type="email"
              required
              autoComplete="username email"
              placeholder="nom@exemple.tn"
              className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Mot de passe
              </label>
              <Link href="/forgot-password" className="text-xs font-bold text-[#0d8d78] hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>
            <input
              name="password"
              id="password"
              type="password"
              required
              autoComplete="current-password"
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
            className="w-full rounded-2xl bg-[#0d8d78] py-4 font-bold text-white shadow-lg shadow-[#0d8d78]/20 transition hover:bg-[#0b7866] disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "Connexion en cours..." : "Se connecter →"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-100" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">ou</span>
          <div className="h-px flex-1 bg-slate-100" />
        </div>

        {/* Google OAuth Button - At Bottom */}
        <button
          type="button"
          disabled={googlePending}
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 py-3.5 text-xs sm:text-sm font-bold text-slate-700 shadow-xs transition hover:bg-slate-100 hover:border-slate-300 disabled:opacity-60"
        >
          <GoogleIcon />
          <span>{googlePending ? "Redirection vers Google..." : "Continuer avec Google"}</span>
        </button>

        <p className="mt-8 text-center text-xs text-slate-500">
          Pas encore de compte ?{" "}
          <Link className="font-bold text-[#0d8d78] hover:underline" href="/register">
            S’inscrire gratuitement
          </Link>
        </p>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
          <IconShield className="h-3.5 w-3.5 text-[#0d8d78]" />
          <span>Gestionnaire de mots de passe Google & Chrome compatible</span>
        </div>
      </div>
    </main>
  );
}
