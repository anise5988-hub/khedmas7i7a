"use client";

import { useState } from "react";
import { SiteNavbar } from "@/components/site-navbar";
import { IconShield } from "@/components/icons";

export default function StudentSupportPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: string; text: string }>({ type: "", text: "" });

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

  async function handleSendSupport(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatus({ type: "", text: "" });

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Élève ProfySpace", email: "eleve@profyspace.tn", subject, message }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatus({
          type: "success",
          text: data.message || "Votre message a été transmis à notre équipe d'assistance. Un conseiller vous répondra sous 24h.",
        });
        setSubject("");
        setMessage("");
      } else {
        setStatus({ type: "error", text: data.error || "Erreur lors de l'envoi du message." });
      }
    } catch {
      setStatus({ type: "error", text: "Erreur de connexion au serveur." });
    } finally {
      setSubmitting(false);
    }
  }

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
                📞
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
                ✉️
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

        {/* Contact Form & FAQ Grid */}
        <div className="grid gap-8 lg:grid-cols-12">
          {/* FAQ Accordion */}
          <div className="lg:col-span-7 space-y-4">
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

          {/* Ticket Submission Form */}
          <div className="lg:col-span-5">
            <form onSubmit={handleSendSupport} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-bold">Envoyer un message au support</h2>
              <p className="text-xs text-slate-500">
                Décrivez votre problème et nous vous répondrons directement par email et notification.
              </p>

              {status.text && (
                <div
                  className={`rounded-2xl p-3.5 text-xs font-semibold ${
                    status.type === "success"
                      ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                      : "bg-rose-50 text-rose-900 border border-rose-200"
                  }`}
                >
                  {status.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Sujet de votre demande *
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex: Problème de recharge, question sur un cours..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-[#0d8d78]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Message détaillé *
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Expliquez-nous en détail votre situation..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-[#0d8d78]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-[#0d8d78] py-3.5 text-xs font-bold text-white shadow-md transition hover:bg-[#0b7866] disabled:opacity-50"
              >
                {submitting ? "Envoi en cours..." : "Envoyer ma demande →"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}