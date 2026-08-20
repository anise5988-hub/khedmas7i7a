
"use client";

import Link from "next/link";
import { useState } from "react";
import { IconUser, IconTeacher } from "@/components/icons";
import { GoogleIcon } from "@/app/login/page";
import { signInWithGoogle } from "@/lib/client/supabase";

export default function RegisterPage() {
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [status, setStatus] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);

  async function register(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(null);

    const formData = new FormData(event.currentTarget);
    const firstName = String(formData.get("firstName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setPending(false);
      setStatus({ type: "error", message: "Veuillez remplir tous les champs obligatoires." });
      return;
    }
    if (password !== confirmPassword) {
      setPending(false);
      setStatus({ type: "error", message: "Les mots de passe ne correspondent pas." });
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          password,
          confirmPassword,
          role,
        }),
      });

      const result = await response.json().catch(() => ({}));
      setPending(false);

      if (!response.ok) {
        setStatus({ type: "error", message: result.error ?? "Inscription impossible. Vérifiez vos informations." });
        return;
      }

      if (result.requiresEmailConfirmation) {
        setStatus({ type: "success", message: "Compte créé. Consultez votre boîte email et cliquez sur le lien de confirmation avant de vous connecter." });
        return;
      }

      if (result.user?.id) {
        localStorage.setItem("profyspace_user_id", result.user.id);
        localStorage.setItem("profyspace_user", JSON.stringify(result.user));
      }

      setStatus({ type: "success", message: "Compte créé avec succès ! Redirection vers la connexion..." });
      setTimeout(() => window.location.replace("/login?registered=1"), 500);
    } catch {
      setPending(false);
      setStatus({ type: "error", message: "Erreur de connexion au serveur." });
    }
  }

  async function handleGoogleRegister() {
    setGooglePending(true);
    setStatus(null);
    try {
      const { error } = await signInWithGoogle(role);
      if (error) {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        setStatus({
          type: "error",
          message: `Erreur Google: ${error.message}. Ajoutez "${origin}/auth/callback" dans Supabase > Authentication > URL Configuration > Redirect URLs.`,
        });
        setGooglePending(false);
      }
    } catch {
      setStatus({ type: "error", message: "Erreur de connexion Google." });
      setGooglePending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#11233f] px-4 py-8 sm:px-6 sm:py-12 text-[#11233f]">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="flex items-center gap-1 font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-tight text-white">
          <span>ProfySpace</span>
          <span className="rounded-md bg-[#72d6bf] px-1.5 py-0.5 text-xs font-extrabold text-[#11233f]">.tn</span>
        </Link>

        <div className="mt-8 rounded-3xl bg-white p-6 sm:p-10 shadow-2xl">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#0d8d78]">Inscription Sécurisée</p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[#11233f]">
            Rejoignez la communauté ProfySpace.tn
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 mb-6">
            Créez votre compte pour réserver vos cours particuliers ou proposer vos enseignements.
          </p>

          {/* Role Selection Tabs */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Je m'inscris en tant que :
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("STUDENT")}
                className={`flex items-center justify-center gap-2 rounded-2xl border p-3.5 text-xs sm:text-sm font-bold transition duration-200 ${
                  role === "STUDENT"
                    ? "border-[#0d8d78] bg-[#e5f7f2] text-[#0d8d78] shadow-sm ring-2 ring-[#0d8d78]"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <IconUser className="h-4 w-4" />
                <span>Élève / Parent</span>
              </button>

              <button
                type="button"
                onClick={() => setRole("TEACHER")}
                className={`flex items-center justify-center gap-2 rounded-2xl border p-3.5 text-xs sm:text-sm font-bold transition duration-200 ${
                  role === "TEACHER"
                    ? "border-[#0d8d78] bg-[#e5f7f2] text-[#0d8d78] shadow-sm ring-2 ring-[#0d8d78]"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <IconTeacher className="h-4 w-4" />
                <span>Professeur</span>
              </button>
            </div>
          </div>

          {/* Registration Form - Always Rendered */}
          <form onSubmit={register} method="post" className="mt-6 space-y-4 border-t border-slate-100 pt-5">
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

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Confirmer le mot de passe *</label>
              <input
                name="confirmPassword"
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="••"
                className="w-full rounded-xl border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
              />
            </div>

            {status && (
              <div
                className={`rounded-xl p-4 text-xs font-semibold ${
                  status.type === "error"
                    ? "bg-rose-50 text-rose-800 border border-rose-200"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                }`}
              >
                {status.message}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-2xl bg-[#0d8d78] py-4 text-center font-bold text-white shadow-lg shadow-[#0d8d78]/20 transition hover:bg-[#0b7866] disabled:opacity-50"
            >
              {pending ? "Création du compte en cours..." : "Créer mon compte et continuer →"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-100" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">ou</span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          {/* Google Sign-in Alternative - At Bottom */}
          <button
            type="button"
            disabled={googlePending}
            onClick={handleGoogleRegister}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 py-3.5 text-xs sm:text-sm font-bold text-slate-700 shadow-xs transition hover:bg-slate-100 hover:border-slate-300 disabled:opacity-60"
          >
            <GoogleIcon />
            <span>{googlePending ? "Redirection vers Google..." : "S’inscrire rapidement avec Google"}</span>
          </button>

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
