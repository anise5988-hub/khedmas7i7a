import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { subjects } from "@/lib/domain/catalog";

export const metadata: Metadata = {
  title: "Matières | ProfySpace.tn",
  description: "Parcours toutes les matières du programme tunisien — mathématiques, physique, français, informatique et plus — et trouve un professeur particulier vérifié.",
};

export default function SubjectsPage() {
  return <PageShell eyebrow="Catalogue" title="Une matière pour chaque ambition." description="Choisis une matière pour voir les professeurs disponibles et commencer ta recherche."><section className="mx-auto max-w-7xl px-6 pb-20 lg:px-10"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{subjects.map((subject) => <a key={subject} href={`/teachers?subject=${encodeURIComponent(subject)}`} className="group rounded-2xl border border-slate-200 bg-white p-6 transition duration-300 hover:-translate-y-2 hover:border-[#72d6bf] hover:shadow-xl"><span className="text-2xl text-[#0d8d78] transition group-hover:scale-125">✦</span><h2 className="mt-5 font-bold">{subject}</h2><p className="mt-2 text-sm text-slate-500">Voir les professeurs <span className="float-right transition-transform group-hover:translate-x-1">→</span></p></a>)}</div></section></PageShell>;
}
