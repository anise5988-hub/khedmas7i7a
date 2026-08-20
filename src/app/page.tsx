/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-location-assign-relative-destination */
"use client";

import { useEffect, useState } from "react";
import { calculateTeacherWithdrawal, formatTndFromMillimes } from "@/lib/finance/withdrawal";
import { educationLevels, subjects } from "@/lib/domain/catalog";

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

const subjectIcons = ["∑", "文", "Aa", "◒", "</>"];
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
    <main className="min-h-screen overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-[#11233f] text-white">
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:48px_48px]" />
        
        <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
          <a href="#top" className="font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-[-.06em]">
            profy<span className="text-[#72d6bf]">.tn</span>
          </a>
          <div className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <a href="/teachers" className="hover:text-white transition">Explorer les professeurs</a>
            <a href="#how" className="hover:text-white transition">Comment ça marche</a>
            <a href="/teacher/onboarding" className="hover:text-white transition">Devenir professeur</a>
          </div>
          <div className="flex items-center gap-3">
            <a href="/login" className="hidden text-sm font-semibold text-slate-300 hover:text-white sm:block">
              Se connecter
            </a>
            <a
              href="/register"
              className="rounded-full bg-[#72d6bf] px-5 py-2.5 text-sm font-bold text-[#11233f] transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#72d6bf]/20"
            >
              S’inscrire
            </a>
          </div>
        </nav>

        <div id="top" className="relative mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-12 lg:grid-cols-[1.05fr_.95fr] lg:px-10 lg:pb-28 lg:pt-20">
          <div className="max-w-2xl self-center">
            <p className="mb-6 text-sm font-bold uppercase tracking-[.22em] text-[#72d6bf]">
              L’apprentissage qui avance avec toi
            </p>
            <h1 className="font-[family-name:var(--font-dm-sans)] text-5xl font-bold leading-[1.04] tracking-[-.055em] sm:text-6xl lg:text-[74px]">
              Trouve le professeur qui <span className="text-[#72d6bf]">te correspond.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
              Des professeurs particuliers vérifiés, des cours qui s’adaptent à ton rythme et une expérience pensée pour les élèves en Tunisie.
            </p>
          </div>

          <form onSubmit={submitSearch} className="rounded-[28px] bg-white p-5 text-[#11233f] shadow-2xl shadow-black/20 sm:p-7">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-[#0d8d78]">Commencer une recherche</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight">Ton prochain déclic est ici.</h2>
              </div>
              <span className="rounded-full bg-[#e5f7f2] px-3 py-1 text-xs font-bold text-[#0d8d78]">01</span>
            </div>

            <div className="space-y-3">
              <label className="block rounded-2xl border border-slate-200 p-4 transition focus-within:border-[#0d8d78] focus-within:shadow-sm">
                <span className="block text-xs font-bold text-slate-400">JE CHERCHE UN PROFESSEUR DE</span>
                <select value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1 w-full bg-transparent font-semibold outline-none">
                  {subjects.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="rounded-2xl border border-slate-200 p-4 transition focus-within:border-[#0d8d78]">
                  <span className="block text-xs font-bold text-slate-400">MON NIVEAU</span>
                  <select value={level} onChange={(event) => setLevel(event.target.value)} className="mt-1 w-full bg-transparent font-semibold outline-none">
                    <option>Bac</option>
                    {educationLevels.map((item) => <option key={item.slug}>{item.name}</option>)}
                  </select>
                </label>

                <label className="rounded-2xl border border-slate-200 p-4 transition focus-within:border-[#0d8d78]">
                  <span className="block text-xs font-bold text-slate-400">MODE</span>
                  <select value={mode} onChange={(event) => setMode(event.target.value)} className="mt-1 w-full bg-transparent font-semibold outline-none">
                    <option value="ONLINE">En ligne (WebRTC)</option>
                    <option value="IN_PERSON">Présentiel</option>
                  </select>
                </label>
              </div>

              <button
                type="submit"
                className="block w-full rounded-2xl bg-[#0d8d78] px-5 py-4 text-center font-bold text-white shadow-lg shadow-[#0d8d78]/20 transition duration-300 hover:bg-[#0b7866]"
              >
                Rechercher un professeur →
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-7 sm:grid-cols-4 lg:px-10">
          <div>
            <p className="text-2xl font-bold text-[#11233f]">100%</p>
            <p className="mt-1 text-sm text-slate-500">Profils vérifiés par admin</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#11233f]">24</p>
            <p className="mt-1 text-sm text-slate-500">Gouvernorats couverts</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#11233f]">WebRTC</p>
            <p className="mt-1 text-sm text-slate-500">Classe virtuelle HD</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#11233f]">D17 & Flouci</p>
            <p className="mt-1 text-sm text-slate-500">Paiement local tunisien</p>
          </div>
        </div>
      </section>

      {/* Subjects explore */}
      <section id="explore" className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.18em] text-[#0d8d78]">Pour chaque objectif</p>
            <h2 className="mt-3 font-[family-name:var(--font-dm-sans)] text-4xl font-bold tracking-[-.045em] text-[#11233f]">
              Apprends à ta manière.
            </h2>
          </div>
          <a href="/teachers" className="text-sm font-bold text-[#0d8d78] transition hover:translate-x-1">
            Voir tous les professeurs →
          </a>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {subjects.slice(0, 5).map((item, index) => (
            <a
              href={`/teachers?subject=${encodeURIComponent(item)}`}
              key={item}
              className="group rounded-2xl border border-slate-200 bg-white p-5 transition duration-300 hover:-translate-y-2 hover:border-[#72d6bf] hover:shadow-xl"
            >
              <span className="mb-8 block text-2xl text-[#0d8d78] transition duration-300 group-hover:scale-125">
                {subjectIcons[index]}
              </span>
              <span className="font-bold text-[#11233f]">{item}</span>
              <span className="mt-2 block text-sm text-slate-500">
                Professeurs disponibles <span className="float-right transition-transform group-hover:translate-x-1">→</span>
              </span>
            </a>
          ))}
        </div>

        {/* Roles dual section */}
        <div className="mt-16 grid gap-5 lg:grid-cols-2">
          <div className="rounded-[26px] bg-[#e7f5f1] p-8 sm:p-10">
            <p className="text-sm font-bold uppercase tracking-[.16em] text-[#0d8d78]">Pour les élèves & parents</p>
            <h3 className="mt-3 max-w-md text-3xl font-bold tracking-tight text-[#11233f]">
              Le bon accompagnement peut tout changer.
            </h3>
            <p className="mt-4 max-w-md leading-7 text-slate-600">
              Comparez les profils certifiés, choisissez votre créneau et rejoignez votre séance en direct depuis votre espace.
            </p>
            <a
              href="/register"
              className="mt-7 inline-block rounded-full bg-[#11233f] px-5 py-3 text-sm font-bold text-white transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              Créer mon compte étudiant
            </a>
          </div>

          <div id="teacher" className="rounded-[26px] bg-[#f2ede7] p-8 sm:p-10">
            <p className="text-sm font-bold uppercase tracking-[.16em] text-[#8c5820]">Pour les professeurs</p>
            <h3 className="mt-3 max-w-md text-3xl font-bold tracking-tight text-[#11233f]">
              Enseignez à votre rythme et recevez vos paiements.
            </h3>
            <p className="mt-4 max-w-md leading-7 text-slate-600">
              Déposez votre candidature, fixez vos tarifs en dinars tunisiens et recevez vos élèves en ligne ou en présentiel.
            </p>
            <a
              href="/register"
              className="mt-7 inline-block rounded-full bg-[#8c5820] px-5 py-3 text-sm font-bold text-white transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              Rejoindre comme professeur
            </a>
          </div>
        </div>
      </section>

      {/* Featured Teachers */}
      <section id="teachers" className="bg-[#11233f] px-6 py-20 text-white lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[.18em] text-[#72d6bf]">Des profils qui inspirent confiance</p>
              <h2 className="mt-3 font-[family-name:var(--font-dm-sans)] text-4xl font-bold tracking-[-.045em]">
                Les professeurs du moment.
              </h2>
            </div>
            <a href="/teachers" className="text-sm font-bold text-[#72d6bf] transition hover:translate-x-1">
              Explorer tous les profils →
            </a>
          </div>

          {featuredTeachers.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-white/10 bg-white/[.04] p-10 text-center">
              <span className="text-3xl">👨‍🏫</span>
              <h3 className="mt-3 text-lg font-bold">Nos professeurs rejoignent la marketplace.</h3>
              <p className="mt-1 text-sm text-slate-400">
                Vous êtes enseignant ? Déposez votre candidature dès maintenant.
              </p>
              <a
                href="/register"
                className="mt-4 inline-block rounded-full bg-[#72d6bf] px-5 py-2.5 text-xs font-bold text-[#11233f]"
              >
                Déposer ma candidature prof →
              </a>
            </div>
          ) : (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredTeachers.map((teacher) => (
                <a
                  href={`/teachers/${teacher.slug}`}
                  key={teacher.id}
                  className="rounded-[22px] border border-white/10 bg-white/[.07] p-5 transition duration-300 hover:-translate-y-1 hover:bg-white/[.12]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#72d6bf] font-bold text-[#11233f]">
                      {teacher.initials}
                    </div>
                    <div>
                      <h3 className="font-bold">{teacher.name}</h3>
                      <p className="mt-1 text-sm text-slate-300">{teacher.subject}</p>
                    </div>
                    <span className="ml-auto text-sm font-bold text-[#72d6bf]">★ {teacher.rating.toFixed(1)}</span>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
                    <span className="text-slate-300">{teacher.city}</span>
                    <span className="font-bold">{teacher.rate} DT / h</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.18em] text-[#0d8d78]">Simple, du début à la réussite</p>
            <h2 className="mt-3 font-[family-name:var(--font-dm-sans)] text-4xl font-bold tracking-[-.045em] text-[#11233f]">
              Trois étapes.<br />Un vrai progrès.
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <span className="font-[family-name:var(--font-dm-sans)] text-5xl font-bold text-[#d6e7e3]">01</span>
              <h3 className="mt-5 font-bold text-[#11233f]">Définis ton objectif</h3>
              <p className="mt-3 text-sm leading-6 text-slate-500">Matière, niveau et format de cours.</p>
            </div>
            <div>
              <span className="font-[family-name:var(--font-dm-sans)] text-5xl font-bold text-[#d6e7e3]">02</span>
              <h3 className="mt-5 font-bold text-[#11233f]">Choisis ton professeur</h3>
              <p className="mt-3 text-sm leading-6 text-slate-500">Compare les profils vérifiés par notre équipe.</p>
            </div>
            <div>
              <span className="font-[family-name:var(--font-dm-sans)] text-5xl font-bold text-[#d6e7e3]">03</span>
              <h3 className="mt-5 font-bold text-[#11233f]">Progresse avec méthode</h3>
              <p className="mt-3 text-sm leading-6 text-slate-500">Rejoins la classe WebRTC et suis ton évolution.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Finance Transparency */}
      <section className="border-t border-slate-200 bg-white px-6 py-16 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.18em] text-[#0d8d78]">Transparence pour les professeurs</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#11233f]">Un retrait clair, sans surprise.</h2>
            <p className="mt-3 max-w-xl leading-7 text-slate-500">
              Chaque retrait inclut des frais plateforme de 10% pour la maintenance de la classe virtuelle et la gestion des paiements.
            </p>
          </div>
          <div className="min-w-[280px] rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Montant demandé</span>
              <span>{formatTndFromMillimes(feeExample.requestedAmountInMillimes)}</span>
            </div>
            <div className="mt-3 flex justify-between text-sm text-slate-500">
              <span>Frais Profy · 10%</span>
              <span>- {formatTndFromMillimes(feeExample.feeAmountInMillimes)}</span>
            </div>
            <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 font-bold text-[#11233f]">
              <span>Vous recevez net</span>
              <span className="text-[#0d8d78]">{formatTndFromMillimes(feeExample.payoutAmountInMillimes)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#f1f5f6] px-6 py-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl justify-between text-sm text-slate-500">
          <p className="font-bold text-[#11233f]">profy<span className="text-[#0d8d78]">.tn</span> · Marketplace Tunisienne de Cours Particuliers</p>
          <div className="flex gap-5">
            <a href="/teachers" className="hover:text-[#11233f]">Professeurs</a>
            <a href="/support" className="hover:text-[#11233f]">Support</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
