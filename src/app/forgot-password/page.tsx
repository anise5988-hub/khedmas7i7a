/* eslint-disable @next/next/no-location-assign-relative-destination */
"use client";

import Link from "next/link";
import { useState } from "react";
import { IconCheck, IconShield } from "@/components/icons";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          ...(step === 2 ? { newPassword } : {}),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (step === 1) {
          setStep(2);
          setMessage({
            type: "success",
            text: "Compte identifié ! Vous pouvez maintenant saisir votre nouveau mot de passe ci-dessous.",
          });
        } else {
          setMessage({
            type: "success",
            text: data.message || "Mot de passe réinitialisé ! Redirection vers la page de connexion...",
          });
          setTimeout(() => {
            window.location.href = "/login";
          }, 1500);
        }
      } else {
        setMessage({ type: "error", text: data.error || "Une erreur est survenue." });
      }
    } catch {
      setMessage({ type: "error", text: "Erreur de connexion au serveur." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#11233f] px-4 py-8 sm:px-6 sm:py-16 flex items-center justify-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-10 shadow-2xl">
        <Link href="/" className="flex items-center gap-1 font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-tight text-[#11233f]">
          <span>ProfySpace</span>
          <span className="rounded-md bg-[#0d8d78] px-1.5 py-0.5 text-xs font-extrabold text-white">.tn</span>
        </Link>

        <h1 className="mt-8 text-2xl sm:text-3xl font-bold tracking-tight text-[#11233f]">
          Mot de passe oublié ?
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-500">
          {step === 1
            ? "Indiquez l'adresse email associée à votre compte pour réinitialiser votre accès."
            : "Saisissez votre nouveau mot de passe sécurisé (8 caractères minimum)."}
        </p>

        {message.text && (
          <div
            className={`mt-6 rounded-2xl p-4 text-xs font-semibold ${
              message.type === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-900 flex items-center gap-2"
                : "border border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            {message.type === "success" && <IconCheck className="h-4 w-4 text-emerald-600 shrink-0" />}
            <p>{message.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Adresse Email
            </label>
            <input
              type="email"
              required
              disabled={step === 2}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nom@exemple.tn"
              className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9] disabled:bg-slate-100 disabled:opacity-75"
            />
          </div>

          {step === 2 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Nouveau mot de passe *
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[#0d8d78] py-3.5 font-bold text-white shadow-lg shadow-[#0d8d78]/20 transition hover:bg-[#0b7866] disabled:opacity-50"
          >
            {loading
              ? "Traitement..."
              : step === 1
              ? "Continuer →"
              : "Valider le nouveau mot de passe →"}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-5 text-center">
          <Link href="/login" className="text-xs font-bold text-[#0d8d78] hover:underline">
            ← Retour à la connexion
          </Link>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
          <IconShield className="h-3.5 w-3.5 text-[#0d8d78]" />
          <span>Sécurité et confidentialité garanties par ProfySpace.tn</span>
        </div>
      </div>
    </main>
  );
}
