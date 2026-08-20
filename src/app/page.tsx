/* eslint-disable @next/next/no-location-assign-relative-destination, @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteNavbar } from "@/components/site-navbar";
import { educationLevels, subjects } from "@/lib/domain/catalog";
import {
  IconSearch,
  IconStar,
  IconUser,
  IconTeacher,
  IconClock,
} from "@/components/icons";

type ApprovedTeacher = {
  id: string;
  slug: string;
  avatarUrl?: string | null;
  initials: string;
  name: string;
  subject: string;
  rating: number;
  rate: number;
  city: string;
};

const testimonials = [
  {
    name: "Mariem Khelil",
    role: "Élève en Baccalauréat Math",
    text: "Grâce à mon professeur de Maths sur ProfySpace, j'ai surmonté mes blocages en analyse et géométrie. La classe virtuelle avec tableau blanc est ultra fluide !",
    rating: 5,
  },
  {
    name: "Mohamed Ben Amor",
    role: "Parent d'élève (9ème de base)",
    text: "Une plateforme tunisienne sérieuse. Paiement D17 instantané et professeurs très pédagogues. Ma fille a nettement amélioré ses moyennes.",
    rating: 5,
  },
  {
    name: "Professeur Hichem",
    role: "Enseignant de Physique",
    text: "ProfySpace me permet d'enseigner en direct depuis chez moi avec des élèves motivés sur toute la Tunisie. Retraits rapides et interface claire.",
    rating: 5,
  },
];

const faqs = [
  {
    q: "Comment réserver une séance de cours particulier ?",
    a: "Explorez nos professeurs certifiés, choisissez la matière et votre niveau, sélectionnez un créneau horaire dans l'agenda du professeur et confirmez votre réservation en 1 clic.",
  },
  {
    q: "Comment se déroule la classe virtuelle en direct ?",
    a: "Vous rejoignez la salle de classe WebRTC directement depuis votre navigateur sans rien installer. Vous disposez de la vidéo HD, du tableau blanc interactif et du partage de documents.",
  },
  {
    q: "Quels sont les moyens de recharge acceptés en Tunisie ?",
    a: "Vous pouvez recharger votre compte facilement par D17 (La Poste), Flouci Wallet (au 21000319) ou par virement bancaire sécurisé.",
  },
  {
    q: "Comment devenir professeur sur ProfySpace.tn ?",
    a: "Cliquez sur 'Devenir professeur', remplissez votre dossier de candidature avec vos diplômes et tarifs. Notre administration valide votre profil sous 24h.",
  },
];

export default function Home() {
  const [subject, setSubject] = useState("Mathématiques");
  const [level, setLevel] = useState("bac");
  const [mode, setMode] = useState("ONLINE");
  const [featuredTeachers, setFeaturedTeachers] = useState<ApprovedTeacher[]>([]);
  const [stats, setStats] = useState<{
    studentsCount: number;
    teachersCount: number;
    hoursTaught: number;
    satisfactionRate: number;
  } | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/teachers")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ApprovedTeacher[]) => {
        if (Array.isArray(data)) {
          setFeaturedTeachers(data.slice(0, 6));
        }
      })
      .catch(() => {});

    fetch("/api/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setStats(data);
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
                    {educationLevels.map((item) => (
                      <option key={item.slug} value={item.slug}>
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

      {/* Dynamic Key Stats Bar - Real Database Connected */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-8 sm:grid-cols-4 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e5f7f2] text-[#0d8d78]">
              <IconUser className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#11233f]">
                {stats ? `+${stats.studentsCount}` : "..."}
              </p>
              <p className="text-xs text-slate-500">Élèves inscrits</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e5f7f2] text-[#0d8d78]">
              <IconTeacher className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#11233f]">
                {stats ? `+${stats.teachersCount}` : "..."}
              </p>
              <p className="text-xs text-slate-500">Professeurs certifiés</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e5f7f2] text-[#0d8d78]">
              <IconClock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#11233f]">
                {stats ? `+${stats.hoursTaught} h` : "..."}
              </p>
              <p className="text-xs text-slate-500">Heures de cours dispensées</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e5f7f2] text-[#0d8d78]">
              <IconStar className="h-6 w-6 fill-[#0d8d78]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#11233f]">
                {stats ? `${stats.satisfactionRate}%` : "..."}
              </p>
              <p className="text-xs text-slate-500">Taux de satisfaction</p>
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
                      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#72d6bf] font-bold text-lg text-[#11233f] overflow-hidden">
                        {teacher.avatarUrl ? (
                          <img src={teacher.avatarUrl} alt={teacher.name} className="h-full w-full object-cover" />
                        ) : (
                          <span>{teacher.initials}</span>
                        )}
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

      {/* Testimonials Section */}
      <section className="bg-slate-50 border-y border-slate-200 px-6 py-20 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#0d8d78]">Avis & Réussite</p>
            <h2 className="mt-2 font-[family-name:var(--font-dm-sans)] text-3xl sm:text-4xl font-bold tracking-tight text-[#11233f]">
              Ce que disent nos élèves et parents.
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-500">
              Des milliers de familles nous font confiance pour accompagner leur parcours scolaire.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {testimonials.map((t, idx) => (
              <div key={idx} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 text-amber-500 mb-3">
                    {[...Array(t.rating)].map((_, i) => (
                      <IconStar key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed italic">
                    "{t.text}"
                  </p>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-3">
                  <p className="font-bold text-sm text-[#11233f]">{t.name}</p>
                  <p className="text-[11px] text-[#0d8d78] font-semibold">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="mx-auto max-w-4xl px-6 py-20 lg:px-10">
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#0d8d78]">Foire Aux Questions</p>
          <h2 className="mt-2 font-[family-name:var(--font-dm-sans)] text-3xl sm:text-4xl font-bold tracking-tight text-[#11233f]">
            Questions Fréquemment Posées
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden transition shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="flex w-full items-center justify-between p-5 text-left font-bold text-sm text-[#11233f]"
                >
                  <span>{faq.q}</span>
                  <span className="text-[#0d8d78] text-base font-bold">{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Support Card (Email Only) */}
      <section className="border-t border-slate-200 bg-white px-6 py-16 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-[#11233f] to-[#1a365d] p-8 sm:p-12 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#72d6bf]">Assistance & Qualité 7j/7</p>
              <h3 className="mt-2 text-2xl sm:text-3xl font-bold">Une question ? Notre équipe vous répond.</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                Contactez notre support officiel pour toute demande relative aux cours particuliers, recharge de solde ou assistance technique.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-6 py-4 border border-white/20 backdrop-blur-md">
              <span className="text-2xl">✉️</span>
              <div>
                <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Email officiel support</p>
                <a
                  href="mailto:profyspace@gmail.com"
                  className="text-base font-bold text-white hover:text-[#72d6bf] transition"
                >
                  profyspace@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#11233f] text-slate-400 px-6 py-10 lg:px-10 border-t border-white/10">
        <div className="mx-auto flex flex-col sm:flex-row max-w-7xl justify-between items-center gap-4 text-xs">
          <p className="font-bold text-white">
            ProfySpace<span className="text-[#72d6bf]">.tn</span> · Marketplace Tunisienne de Cours Particuliers
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
