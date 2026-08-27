"use client";

import Link from "next/link";
import { SiteNavbar } from "@/components/site-navbar";
import { IconShield, IconGraduationCap, IconUsers } from "@/components/icons";

export function AboutPageClient() {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <SiteNavbar dark={false} />

      {/* Hero */}
      <section className="bg-[#11233f] text-white py-16 px-4 sm:px-6 lg:px-8 text-center">
        <div className="mx-auto max-w-3xl space-y-4">
          <span className="rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#72d6bf]">
            Notre Mission en Tunisie
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Démocratiser l'excellence scolaire et le soutien sur-mesure.
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl mx-auto">
            ProfySpace.tn est la marketplace éducative tunisienne de référence reliant directement élèves, parents et professeurs certifiés pour des cours particuliers de haute qualité.
          </p>
        </div>
      </section>

      {/* Values Grid */}
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 space-y-12">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e5f7f2] text-[#0d8d78]">
              <IconShield className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-base text-[#11233f]">Professeurs Vérifiés</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Chaque dossier de professeur est vérifié et certifié par notre administration avant de pouvoir enseigner et être visible sur la marketplace.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e5f7f2] text-[#0d8d78]">
              <IconGraduationCap className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-base text-[#11233f]">Pédagogie & Progrès</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Des cours particuliers ciblés pour surmonter les blocages scolaires, préparer les examens nationaux (Bac, 9ème) et les études supérieures.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e5f7f2] text-[#0d8d78]">
              <IconUsers className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-base text-[#11233f]">Proximité Tunisienne</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Une plateforme pensée pour les besoins des élèves et familles tunisiennes, avec paiement local via D17 et Flouci.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-3xl border border-slate-200 bg-[#e5f7f2] p-8 sm:p-10 text-center space-y-4">
          <h2 className="text-2xl font-bold text-[#11233f]">Prêt à faire décoller vos résultats scolaires ?</h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
            Trouvez dès maintenant le professeur particulier idéal ou rejoignez notre communauté d'enseignants.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              href="/teachers"
              className="rounded-2xl bg-[#0d8d78] px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-[#0b7866] transition"
            >
              Trouver un professeur →
            </Link>
            <Link
              href="/register?role=TEACHER"
              className="rounded-2xl border border-[#0d8d78] bg-white px-6 py-3 text-xs font-bold text-[#0d8d78] hover:bg-[#d4f2e9] transition"
            >
              Devenir professeur
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}