import Link from "next/link";
import type { ReactNode } from "react";

export function PageShell({ children, eyebrow, title, description }: { children: ReactNode; eyebrow: string; title: string; description: string }) {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10"><Link href="/" className="font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-[-.06em]">profy<span className="text-[#0d8d78]">.tn</span></Link><nav className="flex items-center gap-5 text-sm font-semibold text-slate-500"><Link href="/teachers" className="hover:text-[#0d8d78]">Professeurs</Link><Link href="/register" className="rounded-full bg-[#11233f] px-4 py-2 text-white">Créer un compte</Link></nav></div></header>
      <section className="mx-auto max-w-7xl px-6 pb-10 pt-14 lg:px-10"><p className="text-sm font-bold uppercase tracking-[.18em] text-[#0d8d78]">{eyebrow}</p><h1 className="mt-3 max-w-3xl font-[family-name:var(--font-dm-sans)] text-4xl font-bold tracking-[-.05em] sm:text-5xl">{title}</h1><p className="mt-5 max-w-2xl leading-7 text-slate-500">{description}</p></section>{children}
    </main>
  );
}

export function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>; }
