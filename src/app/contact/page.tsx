"use client";

import { useState } from "react";
import { SiteNavbar } from "@/components/site-navbar";
import { IconCheckCircle, IconShield } from "@/components/icons";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("Question générale");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setName("");
    setEmail("");
    setMessage("");
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <SiteNavbar dark={false} />

      {/* Hero Header */}
      <section className="bg-[#11233f] text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center space-y-3">
          <span className="rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#72d6bf]">
            Assistance & Contact 7j/7
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Une question ? Notre équipe vous accompagne.
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Nous répondons à toutes vos questions concernant les cours particuliers, les recharges de solde ou la candidature enseignant.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Contact Form */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-bold">Envoyez-nous un message</h2>
              <p className="mt-1 text-xs text-slate-500">Nous vous répondrons par email dans un délai maximum de 24h.</p>
            </div>

            {submitted && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center gap-2">
                <IconCheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Merci ! Votre message a été transmis avec succès à notre équipe support.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Votre Nom *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Yassine Trabelsi"
                    className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78]"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Votre Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@exemple.tn"
                    className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Objet de votre demande *</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm outline-none transition focus:border-[#0d8d78]"
                >
                  <option value="Question générale">Question générale sur la plateforme</option>
                  <option value="Réservation de cours">Réservation & déroulement des cours</option>
                  <option value="Recharge Wallet & Paiement">Recharge de compte (D17, Flouci)</option>
                  <option value="Candidature Enseignant">Candidature & Vérification professeur</option>
                  <option value="Assistance technique">Assistance technique WebRTC</option>
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Votre Message *</label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Détaillez votre demande pour nous permettre de vous aider au mieux..."
                  className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78]"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-[#0d8d78] py-4 text-center text-xs font-bold text-white shadow-lg shadow-[#0d8d78]/20 transition hover:bg-[#0b7866]"
              >
                Envoyer le message →
              </button>
            </form>
          </div>

          {/* Contact Details Sidebar */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0d8d78]">Coordonnées Directes</span>
              <h3 className="font-bold text-base">ProfySpace.tn Tunisie</h3>

              <div className="space-y-3 text-xs text-slate-600">
                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Email Officiel</p>
                  <a href="mailto:profyspace@gmail.com" className="font-bold text-sm text-[#0d8d78] hover:underline">
                    profyspace@gmail.com
                  </a>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Téléphone Assistance</p>
                  <a href="tel:+21658249938" className="font-bold text-sm text-[#11233f] hover:underline">
                    +216 58 249 938
                  </a>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Disponibilité</p>
                  <p className="font-bold text-[#11233f]">Du Lundi au Dimanche (9h – 21h)</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-[#11233f] to-[#1a365d] p-6 text-white shadow-md space-y-2">
              <IconShield className="h-6 w-6 text-[#72d6bf]" />
              <h3 className="font-bold text-sm">Garantie Qualité & Sécurité</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tous nos professeurs sont vérifiés par l'équipe avant publication. En cas de séance non honorée, votre solde est protégé.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}