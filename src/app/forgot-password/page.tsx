"use client";

import Link from "next/link";
import { useState } from "react";
import { IconCheck, IconShield } from "@/components/icons";

type Step = "email" | "otp";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("email") || "";
  });
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setStep("otp");
        setMessage({ type: "success", text: data.message || "Un code OTP a été envoyé à votre adresse email." });
      } else {
        setMessage({ type: "error", text: data.error || "Une erreur est survenue." });
      }
    } catch {
      setMessage({ type: "error", text: "Erreur de connexion au serveur." });
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          password,
          confirmPassword,
          type: "PASSWORD_RESET",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: data.message || "Mot de passe réinitialisé avec succès." });
        setTimeout(() => {
          window.location.replace("/login");
        }, 1500);
      } else {
        setMessage({ type: "error", text: data.error || "Code OTP invalide ou expiré." });
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

        <div className="mt-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#11233f]">
            Mot de passe oublié ?
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500">
            {step === "email"
              ? "Indiquez votre adresse email pour recevoir un code de réinitialisation."
              : "Saisissez le code reçu par email et votre nouveau mot de passe."}
          </p>
        </div>

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

        {step === "email" ? (
          <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Adresse Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@exemple.tn"
                className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#0d8d78] py-3.5 font-bold text-white shadow-lg shadow-[#0d8d78]/20 transition hover:bg-[#0b7866] disabled:opacity-50"
            >
              {loading ? "Envoi en cours..." : "Envoyer le code OTP →"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Code OTP (6 chiffres)
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="123456"
                className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Nouveau mot de passe (8 caractères min)
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
                Confirmer le mot de passe
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
              {loading ? "Vérification..." : "Réinitialiser le mot de passe →"}
            </button>
          </form>
        )}

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
