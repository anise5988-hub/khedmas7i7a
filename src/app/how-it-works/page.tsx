"use client";

import Link from "next/link";
import { SiteNavbar } from "@/components/site-navbar";
import {
  IconSearch,
  IconCalendar,
  IconVideo,
  IconTeacher,
} from "@/components/icons";

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <SiteNavbar dark={false} />

      {/* Header Banner */}
      <section className="bg-[#11233f] text-white py-14 px-4 sm:px-6 lg:px-8 text-center">
        <div className="mx-auto max-w-3xl space-y-3">
          <span className="rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#72d6bf]">
            Méthode & Simplicité
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Comment fonctionne ProfySpace.tn ?
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Découvrez comment trouver un enseignant qualifié, réserver vos séances de cours particuliers et progresser en toute confiance.
          </p>
        </div>
      </section>

      {/* Steps Section */}
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 space-y-16">
        {/* For Students */}
        <div className="space-y-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0d8d78]">Pour les Élèves & Parents</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-bold">Réservez votre cours en 3 étapes faciles</h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e5f7f2] text-[#0d8d78]">
                  <IconSearch className="h-6 w-6" />
                </div>
                <span className="font-mono text-2xl font-black text-[#0d8d78]">01</span>
                <h3 className="font-bold text-base text-[#11233f]">Explorez les profils vérifiés</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Filtrez selon votre matière (Maths, Physique, Français, etc.), votre niveau scolaire et votre ville.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e5f7f2] text-[#0d8d78]">
                  <IconCalendar className="h-6 w-6" />
                </div>
                <span className="font-mono text-2xl font-black text-[#0d8d78]">02</span>
                <h3 className="font-bold text-base text-[#11233f]">Choisissez un créneau ou discutez</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sélectionnez l'heure de votre choix dans l'agenda du professeur ou envoyez-lui un message direct pour une offre adaptée.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e5f7f2] text-[#0d8d78]">
                  <IconVideo className="h-6 w-6" />
                </div>
                <span className="font-mono text-2xl font-black text-[#0d8d78]">03</span>
                <h3 className="font-bold text-base text-[#11233f]">Rejoignez la classe virtuelle HD</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Le cours se déroule directement dans votre navigateur via notre classe WebRTC avec vidéo, micro et tableau interactif.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* For Teachers */}
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-[#11233f] to-[#1a365d] p-8 sm:p-12 text-white shadow-xl space-y-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#72d6bf]">
            <IconTeacher className="h-4 w-4" />
            <span>Pour les Professeurs & Tuteurs</span>
          </div>

          <div className="grid gap-8 md:grid-cols-2 items-center">
            <div className="space-y-4">
              <h2 className="text-2xl sm:text-3xl font-bold">Transmettez votre savoir et fixez vos tarifs</h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Créez votre profil gratuitement, soumettez vos diplômes et définissez vos disponibilités. Recevez des demandes d'élèves motivés de toute la Tunisie et effectuez vos retraits en toute sécurité.
              </p>
              <div className="pt-2">
                <Link
                  href="/register?role=TEACHER"
                  className="inline-block rounded-2xl bg-[#72d6bf] px-6 py-3 text-xs font-bold text-[#11233f] hover:bg-[#5ec4ad] transition shadow-md"
                >
                  Déposer ma candidature professeur →
                </Link>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-2xl bg-white/10 p-4 border border-white/10 backdrop-blur-md">
                <p className="font-bold text-sm text-[#72d6bf]">✓ Rémunération 100% transparente</p>
                <p className="text-slate-300 mt-0.5">Seulement 10% de frais plateforme, retraits faciles par D17 ou virement.</p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4 border border-white/10 backdrop-blur-md">
                <p className="font-bold text-sm text-[#72d6bf]">✓ Outils complets d'enseignement</p>
                <p className="text-slate-300 mt-0.5">Classe virtuelle interactive, messagerie avec offres sur-mesure et packs de cours.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}