import Link from "next/link";
import { IconBookOpen, IconBarChart, IconGraduationCap } from "@/components/icons";

const sections = [
  {
    href: "/admin/subjects",
    icon: IconBookOpen,
    title: "Matières",
    description: "Créer, modifier, activer ou désactiver les matières enseignées sur la plateforme.",
  },
  {
    href: "/admin/levels",
    icon: IconBarChart,
    title: "Niveaux scolaires",
    description: "Gérer les niveaux du primaire au supérieur, leur cycle et leur ordre d'affichage.",
  },
  {
    href: "/admin/sections",
    icon: IconGraduationCap,
    title: "Sections du Baccalauréat",
    description: "Gérer les sections du Bac tunisien (Mathématiques, Sciences expérimentales, etc.).",
  },
];

export default function AdminEducationPage() {
  return (
    <main className="min-h-screen bg-[#101b2d] px-4 py-8 sm:px-6 sm:py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h1 className="text-3xl font-bold">Système éducatif</h1>
            <p className="mt-1 text-sm text-slate-400">
              Configure le catalogue tunisien — matières, niveaux et sections du Bac — utilisé dans toute la plateforme.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
          >
            ← Retour Dashboard
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-3xl border border-white/10 bg-white/[.04] p-6 transition hover:-translate-y-1 hover:border-[#72d6bf]/40 hover:bg-white/[.06]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#72d6bf]/15 text-[#72d6bf]">
                <item.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-base font-bold text-white">{item.title}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-400">{item.description}</p>
              <span className="mt-3 inline-block text-xs font-bold text-[#72d6bf] transition group-hover:translate-x-1">
                Gérer →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
