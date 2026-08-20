"use client";

import Link from "next/link";
import { useState } from "react";

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
    const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName: formData.get("firstName"), lastName: formData.get("lastName"), email: formData.get("email"), phone: formData.get("phone"), password: formData.get("password"), role }) });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) { setStatus({ type: "error", message: result.error ?? "Inscription impossible." }); return; }
    setStatus({ type: "success", message: role === "TEACHER" ? "Candidature envoyée. Elle sera vérifiée par l'équipe Profy." : "Compte créé. Tu peux maintenant accéder à ton espace." });
    event.currentTarget.reset();
  }

  return <main className="min-h-screen bg-[#11233f] px-6 py-10 text-[#11233f]"><div className="mx-auto max-w-4xl"><Link href="/" className="font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-[-.06em] text-white">profy<span className="text-[#72d6bf]">.tn</span></Link><div className="mt-12 rounded-[28px] bg-white p-6 sm:p-10"><p className="profy-reveal text-sm font-bold uppercase tracking-[.18em] text-[#0d8d78]">Rejoindre Profy</p><h1 className="profy-reveal profy-reveal-delay-1 mt-3 text-4xl font-bold tracking-tight">Comment veux-tu utiliser Profy ?</h1><p className="mt-3 text-slate-500">Choisis ton parcours. Tu pourras compléter ton profil ensuite.</p><div className="mt-8 grid gap-4 sm:grid-cols-2"><button type="button" onClick={() => { setRole("STUDENT"); setStatus(null); }} className={`group rounded-2xl border p-6 text-left transition duration-300 hover:-translate-y-2 hover:border-[#72d6bf] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#72d6bf] ${role === "STUDENT" ? "border-[#0d8d78] bg-[#e5f7f2] shadow-lg" : "border-slate-200"}`}><span className="block text-3xl transition duration-300 group-hover:scale-125">◎</span><span className="mt-5 block text-xl font-bold">Je suis élève</span><span className="mt-2 block text-sm leading-6 text-slate-500">Je veux trouver un professeur, réserver des cours et progresser.</span><span className="mt-5 block text-sm font-bold text-[#0d8d78]">Choisir ce parcours →</span></button><button type="button" onClick={() => { setRole("TEACHER"); setStatus(null); }} className={`group rounded-2xl border p-6 text-left transition duration-300 hover:-translate-y-2 hover:border-[#72d6bf] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#72d6bf] ${role === "TEACHER" ? "border-[#0d8d78] bg-[#e5f7f2] shadow-lg" : "border-slate-200"}`}><span className="block text-3xl transition duration-300 group-hover:scale-125">✦</span><span className="mt-5 block text-xl font-bold">Je suis professeur</span><span className="mt-2 block text-sm leading-6 text-slate-500">Je veux partager mon expertise et accompagner des élèves.</span><span className="mt-5 block text-sm font-bold text-[#0d8d78]">Choisir ce parcours →</span></button></div>{role && <form onSubmit={register} className="mt-10 border-t border-slate-200 pt-8"><h2 className="text-xl font-bold">Créer mon compte {role === "TEACHER" ? "professeur" : "élève"}</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><input name="firstName" required placeholder="Prénom" className="rounded-xl border border-slate-200 p-3 outline-none focus:border-[#0d8d78]" /><input name="lastName" required placeholder="Nom" className="rounded-xl border border-slate-200 p-3 outline-none focus:border-[#0d8d78]" /><input name="email" required type="email" placeholder="Email" className="rounded-xl border border-slate-200 p-3 outline-none focus:border-[#0d8d78]" /><input name="phone" placeholder="Téléphone" className="rounded-xl border border-slate-200 p-3 outline-none focus:border-[#0d8d78]" /><input name="password" required minLength={8} type="password" placeholder="Mot de passe · 8 caractères minimum" className="rounded-xl border border-slate-200 p-3 outline-none focus:border-[#0d8d78] sm:col-span-2" /></div>{status && <p role="status" className={`mt-4 rounded-xl p-3 text-sm font-semibold ${status.type === "success" ? "bg-[#e5f7f2] text-[#0d8d78]" : "bg-red-50 text-red-700"}`}>{status.message}</p>}<button disabled={pending} className="mt-6 rounded-xl bg-[#11233f] px-6 py-3 font-bold text-white transition duration-300 hover:-translate-y-1 hover:bg-[#0d8d78] disabled:cursor-wait disabled:opacity-60">{pending ? "Création en cours..." : "Créer mon compte"}</button></form>}</div></div></main>;
}
