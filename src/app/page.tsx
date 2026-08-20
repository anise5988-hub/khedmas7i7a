/* eslint-disable react/no-unescaped-entities, @next/next/no-location-assign-relative-destination */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteNavbar } from "@/components/site-navbar";
import { calculateTeacherWithdrawal, formatTndFromMillimes } from "@/lib/finance/withdrawal";
import { educationLevels, subjects } from "@/lib/domain/catalog";
import {
  IconSearch,
  IconStar,
  IconShield,
  IconVideo,
  IconCreditCard,
  IconCheck,
} from "@/components/icons";

type ApprovedTeacher = {
  id: string;
  slug: string;
  initials: string;
  name: string;
  subject: string;
  rating: number;
  rate: number;
  city: string;
};

const feeExample = calculateTeacherWithdrawal(250_000);

export default function Home() {
  const [subject, setSubject] = useState("Mathématiques");
  const [level, setLevel] = useState("Bac");
  const [mode, setMode] = useState("ONLINE");
  const [featuredTeachers, setFeaturedTeachers] = useState<ApprovedTeacher[]>([]);

  useEffect(() => {
    fetch("/api/teachers")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ApprovedTeacher[]) => {
        if (Array.isArray(data)) {
          setFeaturedTeachers(data.slice(0, 6));
        }
      })
      .catch(() => {});
  }, []);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.location.href = `/teachers?subject=${encodeURIComponent(subject)}&level=${encodeURIComponent(level)}&mode=${mode}`;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f8fafc] text-[#11233f]">
      {/* Hero Section */}
      <section className="relative bg-[#11233f] text-white">
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:48px_48px]" />

        {/* Auth-Aware Navbar */}
        <SiteNavbar dark={true} />

        <div id="top" className="relative mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.05fr_.95fr] lg:px-10 lg:pb-28 lg:pt-16">
          <div className="max-w-2xl self-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#72d6bf] backdrop-blur-md mb-6">
              <span className="h-2 w-2 rounded-full bg-[#72d6bf] animate-pulse"></span>
              Plateforme Tunisienne Certifiée
            </div>

            <h1 className="font-[family-name:var(--font-dm-sans)] text-4xl font-bold leading-[1.08] tracking-[-.04em] sm:text-6xl lg:text-[70px]">
              Trouvez le professeur qui <span className="text-[#72d6bf]">vous correspond.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-slate-300">
              Des enseignants particuliers qualifiés et validés par notre équipe. Cours en ligne par classe virtuelle HD ou en présentiel en Tunisie.
            </p>
          </div>

          <form onSubmit={submitSearch} className="rounded-3xl bg-white p-6 text-[#11233f] shadow-2xl sm:p-8">
            <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-[#0d8d78]">Recherche Immédiate</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight">Réservez votre séance</h2>
              </div>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e5f7f2] text-xs font-bold text-[#0d8d78]">
                01
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Matière souhaitée
                </label>
                <select
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 text-sm font-semibold outline-none transition focus:border-[#0d8d78] focus:bg-white focus:ring-2 focus:ring-[#d9f1e9]"
                >
                  {subjects.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Niveau scolaire
                  </label>
                  <select
                    value={level}
                    onChange={(event) => setLevel(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 text-sm font-semibold outline-none transition focus:border-[#0d8d78] focus:bg-white focus:ring-2 focus:ring-[#d9f1e9]"
                  >
                    <option value="Bac">Baccalauréat (Bac)</option>
                    {educationLevels.map((item) => (
                      <option key={item.slug} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Format
                  </label>
                  <select
                    value={mode}
                    onChange={(event) => setMode(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 text-sm font-semibold outline-none transition focus:border-[#0d8d78] focus:bg-white focus:ring-2 focus:ring-[#d9f1e9]"
                  >
                    <option value="ONLINE">🌐 En ligne (WebRTC)</option>
                    <option value="IN_PERSON">🏠 Présentiel</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0d8d78] py-4 text-center font-bold text-white shadow-lg shadow-[#0d8d78]/20 transition duration-300 hover:bg-[#0b7866] hover:shadow-xl"
              >
                <IconSearch className="h-5 w-5" />
                <span>Rechercher les professeurs disponibles →</span>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Trust & Guarantee Bar */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-8 sm:grid-cols-4 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e5f7f2] text-[#0d8d78]">
              <IconShield className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xl font-bold text-[#11233f]">100% Vérifiés</p>
              <p className="text-xs text-slate-500">Validation par l&apos;administration</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e5f7f2] text-[#0d8d78]">
              <IconVideo className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xl font-bold text-[#11233f]">Classe HD</p>
              <p className="text-xs text-slate-500">Audio, Vidéo & Partage WebRTC</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e5f7f2] text-[#0d8d78]">
              <IconCreditCard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xl font-bold text-[#11233f]">D17 & Flouci</p>
              <p className="text-xs text-slate-500">Paiement 100% tunisien sécurisé</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e5f7f2] text-[#0d8d78]">
              <IconCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xl font-bold text-[#11233f]">24 Gouvernorats</p>
              <p className="text-xs text-slate-500">Couverture sur toute la Tunisie</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Teachers */}
      <section id="teachers" className="bg-[#11233f] px-6 py-20 text-white lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-[#72d6bf]">Profils Certifiés</p>
              <h2 className="mt-2 font-[family-name:var(--font-dm-sans)] text-3xl sm:text-4xl font-bold tracking-tight">
                Les professeurs du moment.
              </h2>
            </div>
            <Link href="/teachers" className="text-sm font-bold text-[#72d6bf] transition hover:underline">
              Explorer tous les professeurs ({featuredTeachers.length}+) →
            </Link>
          </div>

          {featuredTeachers.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-white/10 bg-white/[.04] p-12 text-center">
              <span className="text-4xl">👨‍🏫</span>
              <h3 className="mt-3 text-lg font-bold">Rejoignez notre communauté d'enseignants.</h3>
              <p className="mt-1 text-sm text-slate-400">
                Vous êtes professeur ou tuteur ? Proposez vos cours dès aujourd'hui.
              </p>
              <Link
                href="/register"
                className="mt-5 inline-block rounded-full bg-[#72d6bf] px-6 py-3 text-xs font-bold text-[#11233f] transition hover:bg-[#5ec4ad]"
              >
                Déposer ma candidature prof →
              </Link>
            </div>
          ) : (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredTeachers.map((teacher) => (
                <Link
                  href={`/teachers/${teacher.slug}`}
                  key={teacher.id}
                  className="rounded-3xl border border-white/10 bg-white/[.07] p-6 transition duration-300 hover:-translate-y-1.5 hover:bg-white/[.12] hover:border-[#72d6bf]/50 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#72d6bf] font-bold text-lg text-[#11233f]">
                        {teacher.initials}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-base">{teacher.name}</h3>
                          <span className="text-[#72d6bf] text-xs">✓</span>
                        </div>
                        <p className="text-xs text-slate-300">{teacher.subject}</p>
                      </div>
                      <span className="flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-1 text-xs font-bold text-amber-300">
                        <IconStar className="h-3 w-3 fill-amber-300" />
                        {teacher.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs">
                    <span className="text-slate-300 font-medium">📍 {teacher.city}</span>
                    <span className="font-bold text-sm text-white">{teacher.rate} DT / h</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#0d8d78]">Méthode & Simplicité</p>
            <h2 className="mt-2 font-[family-name:var(--font-dm-sans)] text-3xl sm:text-4xl font-bold tracking-tight text-[#11233f]">
              Trois étapes simples.<br />Un vrai progrès scolaire.
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="font-[family-name:var(--font-dm-sans)] text-4xl font-bold text-[#0d8d78]">01</span>
              <h3 className="mt-4 font-bold text-lg text-[#11233f]">Choisissez la matière</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                Maths, Physique, Français, Arabe ou Anglais selon votre niveau d'études.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="font-[family-name:var(--font-dm-sans)] text-4xl font-bold text-[#0d8d78]">02</span>
              <h3 className="mt-4 font-bold text-lg text-[#11233f]">Sélectionnez le créneau</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                Consultez le planning du professeur et réservez l'horaire idéal pour vous.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="font-[family-name:var(--font-dm-sans)] text-4xl font-bold text-[#0d8d78]">03</span>
              <h3 className="mt-4 font-bold text-lg text-[#11233f]">Rejoignez la classe</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                Connectez-vous à la salle vidéo interactive avec chat et échange d'exercices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Finance Transparency */}
      <section className="border-t border-slate-200 bg-white px-6 py-16 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#0d8d78]">Transparence financière</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[#11233f]">
              Des retraits clairs, sans surprise pour les professeurs.
            </h2>
            <p className="mt-2 max-w-xl text-xs sm:text-sm leading-relaxed text-slate-500">
              Frais fixes de 10% sur les retraits pour la gestion des serveurs WebRTC et les passerelles de paiement.
            </p>
          </div>
          <div className="min-w-[280px] rounded-3xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Montant demandé :</span>
              <span className="font-bold">{formatTndFromMillimes(feeExample.requestedAmountInMillimes)}</span>
            </div>
            <div className="mt-3 flex justify-between text-xs text-slate-500">
              <span>Frais Profy (10%) :</span>
              <span className="font-bold text-amber-700">- {formatTndFromMillimes(feeExample.feeAmountInMillimes)}</span>
            </div>
            <div className="mt-4 flex justify-between border-t border-slate-200 pt-3 font-bold text-sm text-[#11233f]">
              <span>Net versé :</span>
              <span className="text-[#0d8d78] text-base">{formatTndFromMillimes(feeExample.payoutAmountInMillimes)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#11233f] text-slate-400 px-6 py-10 lg:px-10 border-t border-white/10">
        <div className="mx-auto flex flex-col sm:flex-row max-w-7xl justify-between items-center gap-4 text-xs">
          <p className="font-bold text-white">
            profy<span className="text-[#72d6bf]">.tn</span> · Marketplace Tunisienne de Cours Particuliers
          </p>
          <div className="flex gap-6">
            <Link href="/teachers" className="hover:text-white transition">Professeurs</Link>
            <Link href="/login" className="hover:text-white transition">Espace Membre</Link>
            <Link href="/register" className="hover:text-white transition">Inscription</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
