import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { educationLevels } from "@/lib/domain/catalog";

export const metadata: Metadata = {
  title: "Niveaux scolaires | ProfySpace.tn",
  description: "Du primaire au Baccalauréat, trouve un professeur particulier adapté à ton niveau dans le système éducatif tunisien.",
};

const cycleLabels: Record<string, string> = {
  PRIMARY: "Primaire",
  BASIC: "Collège",
  SECONDARY: "Secondaire",
  UNIVERSITY: "Supérieur",
  PROFESSIONAL: "Formation professionnelle",
};

export default function LevelsPage() {
  return (
    <PageShell
      eyebrow="Système éducatif tunisien"
      title="Ton niveau, ton rythme."
      description="Du primaire au Baccalauréat, retrouve des professeurs qui connaissent le programme tunisien pour ton niveau."
    >
      <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-10">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {educationLevels.map((level) => (
            <a
              key={level.slug}
              href={`/teachers?level=${encodeURIComponent(level.slug)}`}
              className="group rounded-2xl border border-slate-200 bg-white p-6 transition duration-300 hover:-translate-y-2 hover:border-[#72d6bf] hover:shadow-xl"
            >
              <span className="rounded-full bg-[#e5f7f2] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#0d8d78]">
                {cycleLabels[level.cycle] ?? level.cycle}
              </span>
              <h2 className="mt-4 font-bold">{level.name}</h2>
              <p className="mt-2 text-sm text-slate-500">
                Voir les professeurs <span className="float-right transition-transform group-hover:translate-x-1">→</span>
              </p>
            </a>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
