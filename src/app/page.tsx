/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteNavbar } from "@/components/site-navbar";
import { HomepageNews } from "@/components/homepage-news";
import { HeroNewsLandscape } from "@/components/hero-news-landscape";
import {
  IconStar,
  IconUser,
  IconTeacher,
  IconClock,
  IconBookOpen,
  IconCheck,
  IconAlertCircle,
  IconMail,
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
  verificationStatus?: string;
};

type RealReview = {
  id: string;
  name: string;
  role: string;
  teacherName: string;
  rating: number;
  text: string;
  createdAt: string;
};

type HomeCourse = {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherSlug: string;
  teacherAvatarUrl?: string;
  title: string;
  description: string;
  subject: string;
  level: string;
  priceTnd: number;
  visibility: "PUBLIC" | "LOCKED" | "PRIVATE" | "DRAFT";
  thumbnailUrl: string;
  durationMinutes: number;
  totalLessons: number;
  rating: number;
  reviewCount: number;
  studentCount: number;
};

const defaultFaqs = [
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

function formatStat(value: number): string {
  return value.toLocaleString("fr-TN");
}

export default function Home() {
  const [featuredTeachers, setFeaturedTeachers] = useState<ApprovedTeacher[]>([]);
  const [courses, setCourses] = useState<HomeCourse[]>([]);
  const [selectedCourseSubject, setSelectedCourseSubject] = useState("ALL");
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [reviews, setReviews] = useState<RealReview[]>([]);
  const [stats, setStats] = useState<{
    studentsCount: number;
    teachersCount: number;
    hoursTaught: number;
    satisfactionRate: number;
  } | null>(null);
  const [statsError, setStatsError] = useState("");
  const [teachersError, setTeachersError] = useState("");

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [faqs, setFaqs] = useState(defaultFaqs);
  const [heroContent, setHeroContent] = useState<{ titlePrefix: string; titleHighlight: string; description: string } | null>(null);
  const [banner, setBanner] = useState<{ message: string; linkUrl: string | null; linkLabel: string | null } | null>(null);

  // Review submission modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewStatus, setReviewStatus] = useState({ type: "", text: "" });

  useEffect(() => {
    fetch("/api/teachers")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ApprovedTeacher[]) => {
        if (Array.isArray(data)) {
          setFeaturedTeachers(data.slice(0, 6));
        }
      })
      .catch(() => setTeachersError("Impossible de charger les professeurs."));

    fetch("/api/courses")
      .then((res) => (res.ok ? res.json() : { courses: [] }))
      .then((data) => {
        if (Array.isArray(data.courses)) setCourses(data.courses);
      })
      .catch(() => setCourses([]))
      .finally(() => setCoursesLoading(false));

    fetch("/api/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setStats(data);
        else setStatsError("Impossible de charger les statistiques.");
      })
      .catch(() => setStatsError("Impossible de charger les statistiques."));

    loadReviews();

    fetch("/api/content/homepage")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.hero?.titlePrefix && data.hero?.titleHighlight && data.hero?.description) {
          setHeroContent(data.hero);
        }
        if (data.banner) setBanner(data.banner);
        if (Array.isArray(data.faqs) && data.faqs.length > 0) {
          setFaqs(data.faqs.map((f: { question: string; answer: string }) => ({ q: f.question, a: f.answer })));
        }
      })
      .catch(() => {});
  }, []);

  function loadReviews() {
    fetch("/api/reviews")
      .then((res) => (res.ok ? res.json() : { reviews: [] }))
      .then((data) => {
        if (Array.isArray(data.reviews)) {
          setReviews(data.reviews);
        }
      })
      .catch(() => {});
  }

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    setReviewSubmitting(true);
    setReviewStatus({ type: "", text: "" });

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setReviewStatus({
          type: "success",
          text: "Merci ! Votre avis a été publié avec succès !",
        });
        setReviewComment("");
        loadReviews();
        setTimeout(() => {
          setReviewModalOpen(false);
          setReviewStatus({ type: "", text: "" });
        }, 1200);
      } else {
        setReviewStatus({
          type: "error",
          text: data.error || "Erreur lors de l'enregistrement de votre avis.",
        });
      }
    } catch {
      setReviewStatus({ type: "error", text: "Erreur de connexion au serveur." });
    } finally {
      setReviewSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#0c1626] text-white">
      {/* Animated Homepage News Banner (Admin Controlled) */}
      <HomepageNews />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#11233f] text-white">
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-[#0d8d78]/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-[#72d6bf]/20 blur-3xl" />

        {/* Auth-Aware Navbar */}
        <SiteNavbar dark={true} />

        <div id="top" className="relative mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-14 lg:px-10 lg:pb-24 lg:pt-16">
          <div className="max-w-2xl self-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#72d6bf] backdrop-blur-md mb-6">
              <span className="h-2 w-2 rounded-full bg-[#72d6bf] animate-pulse"></span>
              Plateforme tunisienne certifiée
            </div>

            <h1 className="font-[family-name:var(--font-dm-sans)] text-4xl font-bold leading-[1.05] tracking-[-.03em] sm:text-5xl lg:text-[62px]">
              {heroContent?.titlePrefix ?? "Trouvez votre prof particulier"}{" "}
              <span className="text-[#72d6bf]">{heroContent?.titleHighlight ?? "idéal."}</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              {heroContent?.description ??
                "Cours particuliers en ligne par classe virtuelle HD ou en présentiel partout en Tunisie. Des professeurs vérifiés par notre équipe, du primaire au Baccalauréat, pour réussir vos examens et booster vos moyennes."}
            </p>

            {banner && (
              <div className="mt-5 inline-flex flex-wrap items-center gap-3 rounded-2xl border border-[#72d6bf]/30 bg-[#72d6bf]/10 px-4 py-3 text-sm text-white">
                <span>{banner.message}</span>
                {banner.linkUrl && (
                  <Link href={banner.linkUrl} className="font-bold text-[#72d6bf] hover:underline">
                    {banner.linkLabel || "En savoir plus"} →
                  </Link>
                )}
              </div>
            )}

            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-slate-300">
              <li className="inline-flex items-center gap-2">
                <IconCheck className="h-4 w-4 text-[#72d6bf]" />
                Réservation en 1 clic
              </li>
              <li className="inline-flex items-center gap-2">
                <IconCheck className="h-4 w-4 text-[#72d6bf]" />
                Paiement D17 &amp; Flouci
              </li>
              <li className="inline-flex items-center gap-2">
                <IconCheck className="h-4 w-4 text-[#72d6bf]" />
                Profils vérifiés ✓
              </li>
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/teachers"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#72d6bf] px-6 py-3.5 text-sm font-bold text-[#11233f] shadow-lg shadow-[#72d6bf]/20 transition hover:bg-[#5ec4ad] active:scale-95"
              >
                <IconUser className="h-5 w-5" />
                Explorer tous les professeurs
              </Link>
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 backdrop-blur px-6 py-3.5 text-sm font-bold text-white hover:bg-white/20 transition active:scale-95"
              >
                <IconBookOpen className="h-5 w-5 text-[#72d6bf]" />
                Cours & Packs vidéo
              </Link>
            </div>
          </div>

          {/* Right Hero: Animated Landscape News Carousel */}
          <div className="self-center w-full">
            <HeroNewsLandscape />
          </div>
        </div>
      </section>

      {/* Real Live Database Stats Bar */}
      <section className="border-b border-white/10 bg-[#0f1d32] text-white">
        {statsError && (
          <div className="mx-auto max-w-7xl px-5 pt-4 sm:px-8 lg:px-10">
            <div className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-xs font-semibold text-amber-300">
              <IconAlertCircle className="h-4 w-4 shrink-0" />
              {statsError}
            </div>
          </div>
        )}
        {stats === null && !statsError ? (
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-5 px-5 py-9 sm:grid-cols-3 lg:grid-cols-5 lg:px-10">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-16 animate-pulse rounded bg-white/10" />
                  <div className="h-3 w-20 animate-pulse rounded bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-5 px-5 py-9 sm:grid-cols-3 lg:grid-cols-5 lg:px-10">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#72d6bf]/15 text-[#72d6bf] border border-[#72d6bf]/20">
                <IconUser className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {stats ? formatStat(stats.studentsCount) : "0"}
                </p>
                <p className="text-xs text-slate-400">Élèves inscrits</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#72d6bf]/15 text-[#72d6bf] border border-[#72d6bf]/20">
                <IconTeacher className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {stats ? formatStat(stats.teachersCount) : "0"}
                </p>
                <p className="text-xs text-slate-400">Professeurs certifiés</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#72d6bf]/15 text-[#72d6bf] border border-[#72d6bf]/20">
                <IconClock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {stats ? `${formatStat(stats.hoursTaught)} h` : "0 h"}
                </p>
                <p className="text-xs text-slate-400">Heures de cours</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#72d6bf]/15 text-[#72d6bf] border border-[#72d6bf]/20">
                <IconBookOpen className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{courses.length}</p>
                <p className="text-xs text-slate-400">Cours &amp; packs</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300 border border-amber-400/20">
                <IconStar className="h-6 w-6 fill-amber-400 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {stats ? `${stats.satisfactionRate}%` : "0%"}
                </p>
                <p className="text-xs text-slate-400">Taux de satisfaction</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Interactive Curriculum & Grade Explorer */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#72d6bf]/15 border border-[#72d6bf]/30 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#72d6bf]">
              Programme Tunisien Officiel
            </span>
            <h2 className="mt-2 font-[family-name:var(--font-dm-sans)] text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Trouvez votre niveau scolaire.
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-xl">
              De l'enseignement de base au Baccalauréat tunisien et études supérieures, nos enseignants couvrent l'ensemble du cursus national.
            </p>
          </div>
          <Link
            href="/levels"
            className="text-xs font-bold text-[#72d6bf] hover:text-[#5ec4ad] hover:underline shrink-0"
          >
            Voir tous les niveaux détaillés →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/teachers?level=primaire"
            className="group rounded-3xl border border-white/10 bg-white/[.05] p-6 shadow-xl backdrop-blur-md transition hover:-translate-y-1.5 hover:border-[#72d6bf]/60 hover:bg-white/[.10] flex flex-col justify-between"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-300 font-bold text-xl mb-4 group-hover:scale-110 transition border border-amber-400/30">
                🎒
              </div>
              <h3 className="font-bold text-lg text-white group-hover:text-[#72d6bf] transition">
                Cycle Primaire
              </h3>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                1ère à la 6ème année de base. Renforcement en Calcul, Français, Arabe et Éveil scientifique.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs font-bold text-[#72d6bf]">
              <span>Explorer les profs</span>
              <span>→</span>
            </div>
          </Link>

          <Link
            href="/teachers?level=college"
            className="group rounded-3xl border border-white/10 bg-white/[.05] p-6 shadow-xl backdrop-blur-md transition hover:-translate-y-1.5 hover:border-[#72d6bf]/60 hover:bg-white/[.10] flex flex-col justify-between"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-400/20 text-blue-300 font-bold text-xl mb-4 group-hover:scale-110 transition border border-blue-400/30">
                📐
              </div>
              <h3 className="font-bold text-lg text-white group-hover:text-[#72d6bf] transition">
                Collège & 9ème
              </h3>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                7ème, 8ème et 9ème année de base. Préparation intensive pour le Concours d'Entrée aux Lycées Pilotes.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs font-bold text-[#72d6bf]">
              <span>Explorer les profs</span>
              <span>→</span>
            </div>
          </Link>

          <Link
            href="/teachers?level=secondaire"
            className="group rounded-3xl border border-white/10 bg-white/[.05] p-6 shadow-xl backdrop-blur-md transition hover:-translate-y-1.5 hover:border-[#72d6bf]/60 hover:bg-white/[.10] flex flex-col justify-between"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0d8d78]/30 text-[#72d6bf] font-bold text-xl mb-4 group-hover:scale-110 transition border border-[#0d8d78]/40">
                🔬
              </div>
              <h3 className="font-bold text-lg text-white group-hover:text-[#72d6bf] transition">
                Lycée Secondaire
              </h3>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                1ère, 2ème et 3ème année secondaire. Consolidation des bases scientifiques, littéraires et économiques.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs font-bold text-[#72d6bf]">
              <span>Explorer les profs</span>
              <span>→</span>
            </div>
          </Link>

          <Link
            href="/teachers?level=bac"
            className="group rounded-3xl border-2 border-[#72d6bf] bg-gradient-to-br from-[#11233f] to-[#162e52] p-6 text-white shadow-xl transition hover:-translate-y-1.5 hover:shadow-2xl flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-2 right-2 rounded-full bg-[#72d6bf] text-[#11233f] text-[10px] font-black px-2 py-0.5 uppercase tracking-wider">
              Priorité
            </div>
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#72d6bf]/20 text-[#72d6bf] font-bold text-xl mb-4 group-hover:scale-110 transition">
                🎓
              </div>
              <h3 className="font-bold text-lg text-white group-hover:text-[#72d6bf] transition">
                Baccalauréat Tunisien
              </h3>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                Toutes sections : Mathématiques, Sciences Exp, Économie-Gestion, Info, Technique, Lettres.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs font-bold text-[#72d6bf]">
              <span>Section Bac →</span>
              <span>→</span>
            </div>
          </Link>
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

          {featuredTeachers.length === 0 && teachersError ? (
            <div className="mt-10 rounded-3xl border border-white/10 bg-white/[.04] p-12 text-center">
              <h3 className="text-lg font-bold">Impossible de charger les professeurs.</h3>
              <p className="mt-1 text-sm text-slate-400">
                Veuillez réessayer ultérieurement.
              </p>
              <button
                type="button"
                onClick={() => {
                  setTeachersError("");
                  fetch("/api/teachers")
                    .then((res) => (res.ok ? res.json() : []))
                    .then((data: ApprovedTeacher[]) => {
                      if (Array.isArray(data)) setFeaturedTeachers(data.slice(0, 6));
                    })
                    .catch(() => setTeachersError("Impossible de charger les professeurs."));
                }}
                className="mt-5 inline-block rounded-full bg-[#72d6bf] px-6 py-3 text-xs font-bold text-[#11233f] transition hover:bg-[#5ec4ad]"
              >
                Réessayer
              </button>
            </div>
          ) : featuredTeachers.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-white/10 bg-white/[.04] p-12 text-center">
              <h3 className="text-lg font-bold">Rejoignez notre communauté d'enseignants.</h3>
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
            <div className="mt-8 sm:mt-10 grid gap-3.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredTeachers.map((teacher) => (
                <Link
                  href={`/teachers/${teacher.slug}`}
                  key={teacher.id}
                  className="rounded-3xl border border-white/15 bg-white/[.08] p-4 sm:p-6 transition duration-300 hover:-translate-y-1.5 hover:bg-white/[.14] hover:border-[#72d6bf]/50 shadow-xl flex flex-col justify-between active:scale-95"
                >
                  <div>
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#72d6bf] to-[#0d8d78] font-bold text-base sm:text-lg text-[#11233f] overflow-hidden shadow-xs">
                        {teacher.avatarUrl ? (
                          <img src={teacher.avatarUrl} alt={teacher.name} className="h-full w-full object-cover" />
                        ) : (
                          <span>{teacher.initials}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-sm sm:text-base text-white truncate">{teacher.name}</h3>
                          {teacher.verificationStatus === "APPROVED" && (
                            <span className="rounded-full bg-[#72d6bf]/20 text-[#72d6bf] border border-[#72d6bf]/30 px-1.5 py-0.2 text-[9px] sm:text-[10px] font-bold">
                              ✓ Vérifié
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 truncate mt-0.5">{teacher.subject}</p>
                      </div>
                      <span className="shrink-0 flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 sm:px-2.5 sm:py-1 text-xs font-bold text-amber-300">
                        <IconStar className="h-3 w-3 fill-amber-300" />
                        {teacher.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 sm:mt-6 flex items-center justify-between border-t border-white/10 pt-3.5 sm:pt-4 text-xs">
                    <span className="text-slate-300 font-medium">📍 {teacher.city || "Tunisie"}</span>
                    <span className="font-bold text-sm text-[#72d6bf]">{teacher.rate} DT <span className="text-slate-300 text-xs font-normal">/ h</span></span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Courses & Revision Packs Section */}
      <section id="courses" className="bg-[#0c1626] px-6 py-20 text-white lg:px-10 border-t border-white/10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#72d6bf]/15 border border-[#72d6bf]/30 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#72d6bf]">
                E-Learning & Révision Autonome
              </span>
              <h2 className="mt-2 font-[family-name:var(--font-dm-sans)] text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Nos Meilleurs Cours & Packs Vidéo.
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Apprenez à votre rythme avec des vidéos HD, des synthèses de cours et des séries d'exercices type Baccalauréat tunisien corrigés pas à pas par des enseignants réputés.
              </p>
            </div>

            <Link
              href="/courses"
              className="inline-flex items-center gap-1 text-sm font-bold text-[#72d6bf] transition hover:text-[#5ec4ad] hover:underline shrink-0"
            >
              <span>Explorer tout le catalogue ({courses.length}+)</span>
              <span>→</span>
            </Link>
          </div>

          {/* Subject Filter Tabs */}
          <div className="mt-8 flex flex-wrap items-center gap-2">
            {[
              { id: "ALL", label: "✨ Tous les packs" },
              { id: "Mathématiques", label: "📐 Mathématiques" },
              { id: "Physique-Chimie", label: "🔬 Physique-Chimie" },
              { id: "Informatique", label: "💻 Informatique / Python" },
              { id: "Français", label: "📚 Français" },
              { id: "Économie / Gestion", label: "📊 Éco-Gestion" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCourseSubject(tab.id)}
                className={`rounded-2xl px-4 py-2 text-xs font-bold transition duration-200 active:scale-95 ${
                  selectedCourseSubject === tab.id
                    ? "bg-[#0d8d78] text-white shadow-md shadow-[#0d8d78]/25 border border-[#72d6bf]/30"
                    : "bg-white/10 text-slate-300 hover:bg-white/15 border border-white/10"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {coursesLoading ? (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-96 animate-pulse rounded-3xl bg-white/10" />)}</div>
          ) : courses.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-white/10 bg-white/[.04] p-12 text-center">
              <h3 className="text-lg font-bold">Nouveaux cours et packs en cours de publication.</h3>
              <p className="mt-1 text-sm text-slate-400">
                Nos professeurs préparent de nouveaux contenus de révision. Revenez bientôt !
              </p>
              <Link
                href="/courses"
                className="mt-5 inline-block rounded-full bg-[#72d6bf] px-6 py-3 text-xs font-bold text-[#11233f] transition hover:bg-[#5ec4ad]"
              >
                Accéder au catalogue →
              </Link>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses
                .filter((c) => selectedCourseSubject === "ALL" || c.subject.toLowerCase().includes(selectedCourseSubject.toLowerCase()))
                .slice(0, 6)
                .map((course) => (
                  <div
                    key={course.id}
                    className="group flex flex-col justify-between rounded-3xl border border-white/15 bg-[#101b2d] shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:border-[#72d6bf]/60 overflow-hidden"
                  >
                    <div>
                      {/* Image Thumbnail with Overlay Badges */}
                      <div className="relative h-48 w-full overflow-hidden bg-slate-900 border-b border-white/10">
                        <img
                          src={course.thumbnailUrl}
                          alt={course.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                          <span className="rounded-xl bg-[#11233f]/90 backdrop-blur-md px-3 py-1 text-[10px] font-bold text-white shadow-sm border border-white/10">
                            {course.subject}
                          </span>
                          {course.visibility === "LOCKED" && (
                            <span className="rounded-xl bg-amber-500/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-extrabold text-white shadow-sm flex items-center gap-1">
                              🔒 Pack Protégé
                            </span>
                          )}
                          {course.visibility === "PUBLIC" && (
                            <span className="rounded-xl bg-emerald-600/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-extrabold text-white shadow-sm flex items-center gap-1">
                              Gratuit
                            </span>
                          )}
                        </div>

                        <div className="absolute bottom-3 right-3 rounded-xl bg-[#11233f]/95 backdrop-blur-md border border-[#72d6bf]/40 px-3 py-1 text-xs font-black text-[#72d6bf] shadow-md">
                          {course.priceTnd > 0 ? `${course.priceTnd} DT` : "GRATUIT"}
                        </div>
                      </div>

                      {/* Content Details */}
                      <div className="p-6 space-y-3">
                        <span className="text-[11px] font-semibold text-[#72d6bf] block">
                          {course.level}
                        </span>

                        <h3 className="text-base font-bold text-white group-hover:text-[#72d6bf] transition duration-200 line-clamp-2 leading-snug">
                          {course.title}
                        </h3>

                        <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                          {course.description}
                        </p>

                        {/* Teacher and Metrics */}
                        <div className="pt-3 flex items-center justify-between border-t border-white/10 text-xs text-slate-300">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-[#72d6bf]/20 text-[#72d6bf] font-bold flex items-center justify-center text-xs border border-[#72d6bf]/30">
                              {course.teacherName.charAt(0)}
                            </div>
                            <span className="font-semibold text-slate-200 truncate max-w-[130px]">
                              {course.teacherName}
                            </span>
                          </div>

                          <span className="text-[11px] text-slate-400 font-medium">
                            {course.totalLessons} vidéos · {course.durationMinutes} min
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CTA Footer */}
                    <div className="p-6 pt-0">
                      <Link
                        href={`/courses/${course.id}`}
                        className="block w-full text-center rounded-2xl bg-[#0d8d78] py-3.5 text-xs font-bold text-white shadow-md shadow-[#0d8d78]/20 transition duration-200 hover:bg-[#0b7866] active:scale-95"
                      >
                        {course.priceTnd > 0 ? `Débloquer ce pack (${course.priceTnd} DT) →` : "Accéder gratuitement au cours →"}
                      </Link>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </section>

      {/* Trust & Guarantee Section */}
      <section className="bg-[#0f1d32] border-t border-white/10 px-6 py-16 lg:px-10 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#72d6bf]/15 border border-[#72d6bf]/30 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#72d6bf]">
              Sécurité & Excellence Pédagogique
            </span>
            <h2 className="mt-2 font-[family-name:var(--font-dm-sans)] text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Pourquoi des milliers de familles tunisiennes choisissent ProfySpace.
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-white/[.05] p-6 shadow-xl backdrop-blur-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#72d6bf]/20 text-[#72d6bf] border border-[#72d6bf]/30 font-bold text-xl mb-4">
                ✓
              </div>
              <h3 className="font-bold text-base text-white">100% Vérifiés & Certifiés</h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Chaque enseignant soumet sa pièce d'identité et ses diplômes officiels vérifiés manuellement par l'équipe d'administration.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[.05] p-6 shadow-xl backdrop-blur-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#72d6bf]/20 text-[#72d6bf] border border-[#72d6bf]/30 font-bold text-xl mb-4">
                💳
              </div>
              <h3 className="font-bold text-base text-white">Paiement Tunisien Local</h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Rechargez votre compte en Dinars Tunisiens par carte e-Dinar D17 (La Poste), Flouci ou virement bancaire instantané.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[.05] p-6 shadow-xl backdrop-blur-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#72d6bf]/20 text-[#72d6bf] border border-[#72d6bf]/30 font-bold text-xl mb-4">
                💻
              </div>
              <h3 className="font-bold text-base text-white">Classe Virtuelle HD</h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Visioconférence sécurisée WebRTC avec tableau blanc collaboratif, partage d'écran et messagerie en direct intégrée.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[.05] p-6 shadow-xl backdrop-blur-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#72d6bf]/20 text-[#72d6bf] border border-[#72d6bf]/30 font-bold text-xl mb-4">
                🎯
              </div>
              <h3 className="font-bold text-base text-white">Garantie & Flexibilité</h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Tarifs transparents à l'heure sans abonnement caché. Possibilité d'annuler ou reprogrammer vos séances en toute sérénité.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl px-6 py-20 lg:px-10 border-t border-white/10 text-white">
        <div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#72d6bf]">Méthode & Simplicité</p>
            <h2 className="mt-2 font-[family-name:var(--font-dm-sans)] text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Trois étapes simples.<br />Un vrai progrès scolaire.
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/[.05] p-6 shadow-xl backdrop-blur-md">
              <span className="font-[family-name:var(--font-dm-sans)] text-4xl font-bold text-[#72d6bf]">01</span>
              <h3 className="mt-4 font-bold text-lg text-white">Choisissez la matière</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Maths, Physique, Français, Arabe ou Anglais selon votre niveau d'études.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[.05] p-6 shadow-xl backdrop-blur-md">
              <span className="font-[family-name:var(--font-dm-sans)] text-4xl font-bold text-[#72d6bf]">02</span>
              <h3 className="mt-4 font-bold text-lg text-white">Sélectionnez le créneau</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Consultez le planning du professeur et réservez l'horaire idéal pour vous.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[.05] p-6 shadow-xl backdrop-blur-md">
              <span className="font-[family-name:var(--font-dm-sans)] text-4xl font-bold text-[#72d6bf]">03</span>
              <h3 className="mt-4 font-bold text-lg text-white">Rejoignez la classe</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Connectez-vous à la salle vidéo interactive avec chat et échange d'exercices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Real Reviews Section - Connected to Database */}
      <section className="bg-[#0f1d32] border-t border-white/10 px-6 py-20 lg:px-10 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-[#72d6bf]">Avis & Réussite</p>
              <h2 className="mt-2 font-[family-name:var(--font-dm-sans)] text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Ce que disent nos élèves satisfaits.
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-300">
                Avis et retours d'expérience vérifiés d'élèves et parents sur ProfySpace.tn.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setReviewModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#72d6bf] px-5 py-3 text-xs sm:text-sm font-bold text-[#11233f] shadow-md transition hover:bg-[#5ec4ad] active:scale-95 shrink-0"
            >
              <IconStar className="h-4 w-4 fill-[#11233f]" />
              <span>Laisser un avis d'élève satisfait</span>
            </button>
          </div>

          {reviews.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[.05] p-12 text-center shadow-xl">
              <h3 className="font-bold text-base text-white">Aucun avis pour le moment.</h3>
              <p className="mt-1 text-xs text-slate-400">Soyez le premier élève à partager votre expérience de cours !</p>
              <button
                type="button"
                onClick={() => setReviewModalOpen(true)}
                className="mt-4 rounded-xl bg-[#0d8d78] px-4 py-2 text-xs font-bold text-white shadow-xs"
              >
                Écrire mon avis →
              </button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-3xl border border-white/10 bg-white/[.05] p-6 shadow-xl backdrop-blur-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1 text-amber-400 mb-3">
                      {[...Array(r.rating)].map((_, i) => (
                        <IconStar key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic">
                      "{r.text}"
                    </p>
                  </div>

                  <div className="mt-6 border-t border-white/10 pt-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-white">{r.name}</p>
                      <p className="text-[11px] text-[#72d6bf] font-semibold">{r.role}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(r.createdAt).toLocaleDateString("fr-TN")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="mx-auto max-w-4xl px-6 py-20 lg:px-10 border-t border-white/10 text-white">
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#72d6bf]">Foire Aux Questions</p>
          <h2 className="mt-2 font-[family-name:var(--font-dm-sans)] text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Questions Fréquemment Posées
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="rounded-2xl border border-white/10 bg-white/[.05] backdrop-blur-md overflow-hidden transition shadow-xl"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="flex w-full items-center justify-between p-5 text-left font-bold text-sm text-white hover:text-[#72d6bf] transition"
                >
                  <span>{faq.q}</span>
                  <span className="text-[#72d6bf] text-base font-bold">{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/10">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Support Card (Email Only) */}
      <section className="border-t border-white/10 bg-[#09111c] px-6 py-16 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-[#11233f] to-[#1a365d] p-8 sm:p-12 text-white shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#72d6bf]">Assistance & Qualité 7j/7</p>
              <h3 className="mt-2 text-2xl sm:text-3xl font-bold">Une question ? Notre équipe vous répond.</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                Contactez notre support officiel pour toute demande relative aux cours particuliers, recharge de solde ou assistance technique.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-6 py-4 border border-white/20 backdrop-blur-md">
              <IconMail className="h-6 w-6 text-[#72d6bf]" />
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
      <footer className="bg-[#070c14] text-slate-400 px-6 py-10 lg:px-10 border-t border-white/10">
        <div className="mx-auto flex flex-col sm:flex-row max-w-7xl justify-between items-center gap-4 text-xs">
          <p className="font-bold text-white">
            ProfySpace<span className="text-[#72d6bf]">.tn</span> · Marketplace Tunisienne de Cours Particuliers
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/teachers" className="hover:text-white transition">Professeurs</Link>
            <Link href="/subjects" className="hover:text-white transition">Matières</Link>
            <Link href="/levels" className="hover:text-white transition">Niveaux</Link>
            <Link href="/login" className="hover:text-white transition">Espace Membre</Link>
            <Link href="/register" className="hover:text-white transition">Inscription</Link>
          </div>
        </div>
      </footer>

      {/* Review Submission Modal */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-[#11233f]">Donner mon avis d'élève</h3>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {reviewStatus.text && (
              <div
                className={`rounded-xl p-3 text-xs font-semibold ${
                  reviewStatus.type === "success"
                    ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                    : "bg-rose-50 text-rose-900 border border-rose-200"
                }`}
              >
                {reviewStatus.text}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Votre Note d'évaluation (1 à 5 étoiles) *
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="p-1.5 focus:outline-none"
                    >
                      <IconStar
                        className={`h-7 w-7 transition ${
                          star <= reviewRating ? "fill-amber-400 text-amber-400 scale-110" : "text-slate-200"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Votre commentaire / retour d'expérience *
                </label>
                <textarea
                  required
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Partagez votre avis sur les cours, la pédagogie et vos résultats..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-[#0d8d78]"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="rounded-xl bg-[#0d8d78] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b7866] disabled:opacity-50"
                >
                  {reviewSubmitting ? "Publication..." : "Publier mon avis →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
