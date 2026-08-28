"use client";

import { useEffect, useState } from "react";
import { SiteNavbar } from "@/components/site-navbar";
import { IconShield, IconPhone, IconMail } from "@/components/icons";
import { SupportTicketsPanel } from "@/components/support-tickets-panel";

const faqs = [
  {
    q: "Comment réserver une séance de cours particulier ?",
    a: "Accédez à la liste des professeurs, choisissez le profil correspondant à vos besoins, puis sélectionnez un créneau horaire dans son agenda pour confirmer instantanément votre réservation.",
  },
  {
    q: "Comment recharger mon portefeuille ProfySpace ?",
    a: "Rendez-vous dans la section Portefeuille > Recharger mon compte. Vous pouvez effectuer un virement, un transfert D17 ou Flouci. Votre solde sera crédité sous 15 minutes.",
  },
  {
    q: "Comment rejoindre ma classe virtuelle en direct ?",
    a: "À l'heure de votre cours, rendez-vous dans l'onglet 'Mes cours' ou sur votre tableau de bord, puis cliquez sur 'Rejoindre la classe'. La salle s'ouvre directement dans votre navigateur.",
  },
  {
    q: "Que faire si mon professeur a un empêchement ?",
    a: "En cas d'annulation ou de report, vous êtes immédiatement notifié et les fonds sont automatiquement recrédités sur votre portefeuille ProfySpace.",
  },
];

export default function StudentSupportPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.id) setUserId(data.user.id);
      })
      .catch(() => {});
  }, []);

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <SiteNavbar dark={false} />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 space-y-8">
        {/* Header */}
        <div className="border-b border-slate-200 pb-5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0d8d78]">
            Assistance & Service Élève
          </span>
          <h1 className="mt-1 text-3xl font-bold">Centre d'Aide & Support</h1>
          <p className="mt-1 text-sm text-slate-500">
            Une question sur un cours, une réservation ou votre compte ? Nous sommes là pour vous aider.
          </p>
        </div>

        {/* Quick Contact Info Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e5f7f2] text-[#0d8d78]">
                <IconPhone className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base">Support Téléphonique</h3>
              <p className="text-xs text-slate-500">Du Lundi au Samedi (8h - 20h)</p>
            </div>
            <a href="tel:+21658249938" className="mt-4 font-bold text-sm text-[#0d8d78] hover:underline">
              +216 58 249 938
            </a>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e5f7f2] text-[#0d8d78]">
                <IconMail className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base">Email Officiel</h3>
              <p className="text-xs text-slate-500">Réponse garantie en moins de 24h</p>
            </div>
            <a href="mailto:profyspace@gmail.com" className="mt-4 font-bold text-sm text-[#0d8d78] hover:underline">
              profyspace@gmail.com
            </a>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e5f7f2] text-[#0d8d78]">
                <IconShield className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base">Garantie & Sécurité</h3>
              <p className="text-xs text-slate-500">Paiements et remboursements sécurisés</p>
            </div>
            <span className="mt-4 text-xs font-bold text-slate-600">
              Professeurs 100% vérifiés
            </span>
          </div>
        </div>

        {/* FAQ & Tickets Grid */}
        <div className="grid gap-8 lg:grid-cols-12">
          {/* FAQ Accordion */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="text-xl font-bold">Questions Fréquentes (FAQ)</h2>
            <div className="space-y-3">
              {faqs.map((f, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                  <h3 className="font-bold text-sm text-[#11233f] flex items-center gap-2">
                    <span className="text-[#0d8d78] font-bold">?</span>
                    {f.q}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed pl-4 border-l-2 border-[#0d8d78]/30">
                    {f.a}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Real support tickets */}
          <div className="lg:col-span-7">
            {userId && <SupportTicketsPanel currentUserId={userId} />}
          </div>
        </div>
      </div>
    </main>
  );
}
