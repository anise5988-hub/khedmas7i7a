/* eslint-disable @next/next/no-location-assign-relative-destination */
"use client";

import Link from "next/link";
import { useState } from "react";
import { IconUser, IconTeacher, IconShield } from "@/components/icons";
import { GoogleIcon } from "@/app/login/page";

export default function RegisterPage() {
  const [role, setRole] = useState<"STUDENT" | "TEACHER" | null>(null);
  const [status, setStatus] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function register(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!role) return;
    setPending(true);
    setStatus(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        password: formData.get("password"),
        role,
      }),
    });

    const result = await response.json().catch(() => ({}));
    setPending(false);

    if (!response.ok) {
      setStatus({ type: "error", message: result.error ?? "Inscription impossible." });
      return;
    }

    event.currentTarget.reset();
    // Direct redirect to login with confirmation
    window.location.href = "/login?registered=1";
  }

  function handleGoogleRegister() {
    alert("Authentification Google : Vous pouvez créer votre compte ci-dessous en quelques secondes.");
  }

  return (
    <main className="min-h-screen bg-[#11233f] px-4 py-8 sm:px-6 sm:py-12 text-[#11233f]">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="flex items-center gap-1 font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-tight text-white">
          <span>ProfySpace</span>
          <span className="rounded-md bg-[#72d6bf] px-1.5 py-0.5 text-xs font-extrabold text-[#11233f]">.tn</span>
        </Link>

        <div className="mt-8 rounded-3xl bg-white p-6 sm:p-10 shadow-2xl">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#0d8d78]">Inscription Sécurisée</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-[#11233f]">
            Rejoignez la communauté ProfySpace.tn
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Choisissez votre profil pour commencer votre expérience d'apprentissage ou d'enseignement.
          </p>

          {/* Google Sign-in Alternative */}
          <button
            type="button"
            onClick={handleGoogleRegister}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 py-3.5 text-xs sm:text-sm font-bold text-slate-700 shadow-xs transition hover:bg-slate-100 hover:border-slate-300"
          >
            <GoogleIcon />
            <span>S’inscrire rapidement avec Google</span>
          </button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-100" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">ou choisir un parcours</span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setRole("STUDENT");
                setStatus(null);
              }}
              className={`group rounded-2xl border p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-[#72d6bf] hover:shadow-lg focus:outline-none ${
                role === "STUDENT"
                  ? "border-[#0d8d78] bg-[#e5f7f2] shadow-md ring-2 ring-[#0d8d78]"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0d8d78]/10 text-[#0d8d78]">
                <IconUser className="h-6 w-6" />
              </div>
              <span className="mt-4 block text-xl font-bold text-[#11233f]">Je suis élève / parent</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Trouvez les meilleurs professeurs particuliers en Tunisie, réservez en ligne et progressez.
              </span>
              <span className="mt-4 block text-xs font-bold text-[#0d8d78]">Choisir ce profil →</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRole("TEACHER");
                setStatus(null);
              }}
              className={`group rounded-2xl border p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-[#72d6bf] hover:shadow-lg focus:outline-none ${
                role === "TEACHER"
                  ? "border-[#0d8d78] bg-[#e5f7f2] shadow-md ring-2 ring-[#0d8d78]"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8c5820]/10 text-[#8c5820]">
                <IconTeacher className="h-6 w-6" />
              </div>
              <span className="mt-4 block text-xl font-bold text-[#11233f]">Je suis professeur</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Déposez votre candidature, fixez vos tarifs horaires et donnez vos cours en ligne ou à domicile.
              </span>
              <span className="mt-4 block text-xs font-bold text-[#8c5820]">Déposer ma candidature →</span>
            </button>
          </div>

          {role && (
            <form onSubmit={register} method="post" className="mt-8 space-y-4 border-t border-slate-100 pt-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Prénom *</label>
                  <input
                    name="firstName"
                    id="firstName"
                    required
                    autoComplete="given-name"
                    placeholder="Ex: Yassine"
                    className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Nom *</label>
                  <input
                    name="lastName"
                    id="lastName"
                    required
                    autoComplete="family-name"
                    placeholder="Ex: Trabelsi"
                    className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Adresse Email *</label>
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Numéro de téléphone</label>
                <input
                  name="phone"
                  id="phone"
                  autoComplete="tel"
                  placeholder="+216 20 000 000"
                  className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Mot de passe (8 caractères minimum) *</label>
                <input
                  name="password"
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
                />
              </div>

              {status && (
                <div
                  className={`rounded-xl p-4 text-xs font-semibold ${
                    status.type === "error" ? "bg-rose-50 text-rose-800 border border-rose-200" : "bg-emerald-50 text-emerald-800"
                  }`}
                >
                  {status.message}
                </div>
              )}

              <button
                disabled={pending}
                className="w-full rounded-2xl bg-[#0d8d78] py-4 text-center font-bold text-white shadow-lg shadow-[#0d8d78]/20 transition hover:bg-[#0b7866] disabled:opacity-50"
              >
                {pending ? "Création du compte en cours..." : "Créer mon compte et se connecter →"}
              </button>

              <div className="flex items-center justify-center gap-2 pt-2 text-xs text-slate-400">
                <IconShield className="h-4 w-4 text-[#0d8d78]" />
                <span>Compatible avec le gestionnaire de mots de passe Google / Chrome</span>
              </div>
            </form>
          )}

          <p className="mt-8 text-center text-xs text-slate-500">
            Vous avez déjà un compte ?{" "}
            <Link href="/login" className="font-bold text-[#0d8d78] hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
