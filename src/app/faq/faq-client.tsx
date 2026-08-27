"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteNavbar } from "@/components/site-navbar";
import { IconSearch } from "@/components/icons";

const faqCategories = [
  {
    category: "Élèves & Réservations",
    items: [
      {
        q: "Comment réserver une séance de cours particulier ?",
        a: "Consultez l'annuaire des professeurs vérifiés, filtrez par matière (Maths, Physique, etc.) et niveau (Bac, Lycée), choisissez un créneau horaire sur le profil de l'enseignant et validez votre réservation. Vous pouvez également discuter directement avec le professeur pour demander une offre sur-mesure.",
      },
      {
        q: "Comment rejoindre la classe virtuelle en direct ?",
        a: "Le jour et à l'heure du cours, rendez-vous dans votre espace élève sous « Mes cours » ou « Calendrier » et cliquez sur « Rejoindre la classe ». La salle de classe WebRTC s'ouvre directement dans votre navigateur avec vidéo HD, tableau blanc et micro sans aucune installation.",
      },
      {
        q: "Puis-je annuler ou reporter une séance ?",
        a: "Oui, vous pouvez contacter votre professeur via la messagerie intégrée pour convenir d'un nouvel horaire à tout moment avant le début prévu de la séance.",
      },
    ],
  },
  {
    category: "Paiements & Recharges (Tunisie)",
    items: [
      {
        q: "Quels sont les moyens de paiement acceptés en Tunisie ?",
        a: "Vous pouvez alimenter votre portefeuille élève (Wallet) par carte e-Dinar / D17 de La Poste Tunisienne, par l'application Flouci Wallet, ou par virement bancaire direct (Banque Zitouna, etc.).",
      },
      {
        q: "Mon solde est-il sécurisé ?",
        a: "Absolument. Votre solde reste en sécurité sur votre portefeuille et n'est débité qu'au moment de la confirmation de votre séance de cours.",
      },
    ],
  },
  {
    category: "Professeurs & Rémunération",
    items: [
      {
        q: "Comment devenir professeur sur ProfySpace.tn ?",
        a: "Lors de votre inscription sur la plateforme, sélectionnez le rôle « Professeur ». Complétez votre profil avec vos matières, diplômes, bio et tarifs. Votre dossier sera validé sous 24h par notre équipe administrative.",
      },
      {
        q: "Quand et comment puis-je retirer mes gains d'enseignement ?",
        a: "Dès que vous cumulez au moins 10 DT sur votre solde professeur, vous pouvez demander un virement depuis votre tableau de bord vers votre compte bancaire, D17 ou Flouci. Les 10% de commission de la plateforme sont automatiquement calculés en toute transparence.",
      },
    ],
  },
];

export function FaqPageClient() {
  const [openMap, setOpenMap] = useState<{ [key: string]: boolean }>({});
  const [search, setSearch] = useState("");

  function toggle(key: string) {
    setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <SiteNavbar dark={false} />

      {/* Header */}
      <section className="bg-[#11233f] text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center space-y-4">
          <span className="rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#72d6bf]">
            Centre d'Aide & FAQ
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Foire Aux Questions
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Retrouvez toutes les réponses essentielles sur le fonctionnement de ProfySpace.tn, les cours et les paiements.
          </p>

          <div className="pt-2 max-w-md mx-auto relative">
            <IconSearch className="absolute left-3.5 top-5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une question (ex: D17, cours, retrait...)"
              className="w-full rounded-2xl bg-white/10 border border-white/20 pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder-slate-400 outline-none focus:bg-white focus:text-[#11233f] transition"
            />
          </div>
        </div>
      </section>

      {/* FAQ Sections */}
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 space-y-10">
        {faqCategories.map((cat, cIdx) => {
          const filteredItems = cat.items.filter(
            (item) =>
              item.q.toLowerCase().includes(search.toLowerCase()) ||
              item.a.toLowerCase().includes(search.toLowerCase())
          );

          if (filteredItems.length === 0) return null;

          return (
            <div key={cIdx} className="space-y-4">
              <h2 className="text-lg font-bold text-[#11233f] border-b border-slate-200 pb-2">
                {cat.category}
              </h2>

              <div className="space-y-3">
                {filteredItems.map((item, iIdx) => {
                  const key = `${cIdx}_${iIdx}`;
                  const isOpen = Boolean(openMap[key]);

                  return (
                    <div
                      key={iIdx}
                      className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs transition"
                    >
                      <button
                        type="button"
                        onClick={() => toggle(key)}
                        className="flex w-full items-center justify-between p-5 text-left font-bold text-sm text-[#11233f] hover:text-[#0d8d78]"
                      >
                        <span>{item.q}</span>
                        <span className="text-base font-bold text-[#0d8d78] ml-3 shrink-0">
                          {isOpen ? "−" : "+"}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="px-5 pb-5 pt-1 text-xs sm:text-sm leading-relaxed text-slate-600 border-t border-slate-50">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* CTA Footer */}
        <div className="rounded-3xl border border-slate-200 bg-[#e5f7f2] p-8 text-center space-y-3">
          <h3 className="font-bold text-lg text-[#11233f]">Vous n'avez pas trouvé votre réponse ?</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Notre équipe est disponible 7j/7 pour vous aider et répondre à toutes vos questions.
          </p>
          <Link
            href="/contact"
            className="inline-block rounded-2xl bg-[#0d8d78] px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-[#0b7866] transition"
          >
            Contacter le support →
          </Link>
        </div>
      </div>
    </main>
  );
}