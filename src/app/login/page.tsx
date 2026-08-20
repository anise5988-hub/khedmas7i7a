"use client";

import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setPending(false); setError(result.error ?? "Connexion impossible."); return; }
    window.location.href = result.role === "TEACHER" ? "/teacher/dashboard" : result.role === "ADMIN" ? "/admin" : "/dashboard";
  }

  return <main className="min-h-screen bg-[#11233f] px-6 py-12"><div className="mx-auto max-w-md rounded-3xl bg-white p-8"><Link href="/" className="text-2xl font-bold text-[#11233f]">profy<span className="text-[#0d8d78]">.tn</span></Link><h1 className="mt-12 text-3xl font-bold text-[#11233f]">Bon retour.</h1><p className="mt-3 text-slate-500">Connecte-toi pour retrouver ton parcours.</p><form onSubmit={login} className="mt-8 space-y-4"><input name="email" required type="email" placeholder="Email" className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#0d8d78]" /><input name="password" required type="password" placeholder="Mot de passe" className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#0d8d78]" />{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}<button disabled={pending} className="w-full rounded-xl bg-[#0d8d78] p-3 font-bold text-white transition hover:bg-[#087261] disabled:cursor-wait disabled:opacity-60">{pending ? "Connexion..." : "Se connecter"}</button></form><p className="mt-6 text-center text-sm text-slate-500">Pas encore de compte ? <Link className="font-bold text-[#0d8d78]" href="/register">S’inscrire</Link></p></div></main>;
}
