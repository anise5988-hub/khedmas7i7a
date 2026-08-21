import { SiteNavbar } from "@/components/site-navbar";
import type { ReactNode } from "react";

export function PageShell({ children, eyebrow, title, description }: { children: ReactNode; eyebrow: string; title: string; description: string }) {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <SiteNavbar dark={false} />
      <section className="mx-auto max-w-7xl px-6 pb-8 pt-10 lg:px-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#e5f7f2] border border-[#0d8d78]/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#0d8d78] mb-4">
          {eyebrow}
        </div>
        <h1 className="max-w-3xl font-[family-name:var(--font-dm-sans)] text-3xl font-bold tracking-tight sm:text-5xl text-[#11233f]">{title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-500">{description}</p>
      </section>
      {children}
    </main>
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#0d8d78]/30">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#11233f]">{value}</p>
    </div>
  );
}
