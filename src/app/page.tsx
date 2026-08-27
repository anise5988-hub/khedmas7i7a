/* eslint-disable @next/next/no-location-assign-relative-destination, @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteNavbar } from "@/components/site-navbar";
import { HomepageNews } from "@/components/homepage-news";
import { educationLevels, subjects, academicSections, governorates } from "@/lib/domain/catalog";
import {
  IconSearch,
  IconStar,
  IconUser,
  IconTeacher,
  IconClock,
  IconBookOpen,
  IconCheck,
  IconAlertCircle,
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
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [bacSection, setBacSection] = useState("");
  const [mode, setMode] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
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

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (level) params.set("level", level);
    if (bacSection) params.set("bacSection", bacSection);
    if (mode) params.set("mode", mode);
    if (governorate) params.set("governorate", governorate);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (minRating) params.set("minRating", minRating);
    if (verifiedOnly) params.set("verified", "1");
    window.location.href = `/teachers?${params.toString()}`;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f8fafc] text-[#11233f]">
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

            <Link
              href="/teachers"
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#72d6bf] px-6 py-3.5 text-sm font-bold text-[#11233f] shadow-lg shadow-[#72d6bf]/20 transition hover:bg-[#5ec4ad]"
            >
              <IconUser className="h-5 w-5" />
              Explorer tous les professeurs
            </Link>
          </div>

          <form onSubmit={submitSearch} className="rounded-3xl bg-white p-5 text-[#11233f] shadow-2xl shadow-black/30 sm:p-7">
            <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#0d8d78]">Recherche guidée</p>
                <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">Affinez votre recherche</h2>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Matière
                  </label>
                  <select
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-semibold outline-none transition focus:border-[#0d8d78] focus:bg-white focus:ring-2 focus:ring-[#d9f1e9]"
                  >
                    <option value="">Toutes les matières</option>
                    {subjects.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Niveau scolaire
                  </label>
                  <select
                    value={level}
                    onChange={(event) => {
                      setLevel(event.target.value);
                      setBacSection("");
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-semibold outline-none transition focus:border-[#0d8d78] focus:bg-white focus:ring-2 focus:ring-[#d9f1e9]"
                  >
                    <option value="">Tous les niveaux</option>
                    {educationLevels.map((item) => (
                      <option key={item.slug} value={item.slug}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {level === "bac" && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Section Bac
                  </label>
                  <select
                    value={bacSection}
                    onChange={(event) => setBacSection(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-semibold outline-none transition focus:border-[#0d8d78] focus:bg-white focus:ring-2 focus:ring-[#d9f1e9]"
                  >
                    <option value="">Toutes les sections</option>
                    {academicSections.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Format
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMode("ONLINE")}
                      className={`flex items-center justify-center gap-1.5 rounded-2xl border p-3 text-xs font-bold transition ${
                        mode === "ONLINE"
                          ? "border-[#0d8d78] bg-[#e5f7f2] text-[#0d8d78]"
                          : "border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      En ligne
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("IN_PERSON")}
                      className={`flex items-center justify-center gap-1.5 rounded-2xl border p-3 text-xs font-bold transition ${
                        mode === "IN_PERSON"
                          ? "border-[#0d8d78] bg-[#e5f7f2] text-[#0d8d78]"
                          : "border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Présentiel
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Gouvernorat
                  </label>
                  <select
                    value={governorate}
                    onChange={(event) => setGovernorate(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-semibold outline-none transition focus:border-[#0d8d78] focus:bg-white focus:ring-2 focus:ring-[#d9f1e9]"
                  >
                    <option value="">Toute la Tunisie</option>
                    {governorates.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Tarif max / heure
                  </label>
                  <select
                    value={maxPrice}
                    onChange={(event) => setMaxPrice(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-semibold outline-none transition focus:border-[#0d8d78] focus:bg-white focus:ring-2 focus:ring-[#d9f1e9]"
                  >
                    <option value="">Tous les tarifs</option>
                    <option value="20">≤ 20 DT</option>
                    <option value="30">≤ 30 DT</option>
                    <option value="50">≤ 50 DT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Note minimale
                  </label>
                  <select
                    value={minRating}
                    onChange={(event) => setMinRating(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-semibold outline-none transition focus:border-[#0d8d78] focus:bg-white focus:ring-2 focus:ring-[#d9f1e9]"
                  >
                    <option value="">Toutes les notes</option>
                    <option value="4">★ 4.0 et plus</option>
                    <option value="4.5">★ 4.5 et plus</option>
                    <option value="5">★ 5.0 (Excellent)</option>
                  </select>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 transition hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(event) => setVerifiedOnly(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#0d8d78] accent-[#0d8d78] focus:ring-[#0d8d78]"
                />
                <span className="text-sm font-semibold text-slate-700">
                  Afficher uniquement les profs vérifiés ✓
                </span>
              </label>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0d8d78] py-4 text-center font-bold text-white shadow-lg shadow-[#0d8d78]/20 transition duration-300 hover:bg-[#0b7866] hover:shadow-xl"
              >
                <IconSearch className="h-5 w-5" />
                <span>Trouver un prof</span>
              </button>

              <Link
                href="/courses"
                className="block text-center text-xs font-bold text-[#0d8d78] transition hover:text-[#0b7866] hover:underline"
              >
                Ou explorer les cours &amp; packs de révision →
              </Link>
            </div>
          </form>
        </div>
      </section>

      {/* Real Live Database Stats Bar */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
        {statsError && (
          <div className="mx-auto max-w-7xl px-5 pt-4 sm:px-8 lg:px-10">
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800">
              <IconAlertCircle className="h-4 w-4 shrink-0" />
              {statsError}
            </div>
          </div>
        )}
        {stats === null && !statsError ? (
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-5 px-5 py-9 sm:grid-cols-3 lg:grid-cols-5 lg:px-10">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-16 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-5 px-5 py-9 sm:grid-cols-3 lg:grid-cols-5 lg:px-10">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e5f7f2] text-[#0d8d78]">
                <IconUser className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#11233f]">
                  {stats ? formatStat(stats.studentsCount) : "0"}
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
                  {stats ? formatStat(stats.teachersCount) : "0"}
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
                  {stats ? `${formatStat(stats.hoursTaught)} h` : "0 h"}
                </p>
                <p className="text-xs text-slate-500">Heures de cours</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e5f7f2] text-[#0d8d78]">
                <IconBookOpen className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#11233f]">{courses.length}</p>
                <p className="text-xs text-slate-500">Cours &amp; packs</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fff7e6] text-amber-500">
                <IconStar className="h-6 w-6 fill-amber-400 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#11233f]">
                  {stats ? `${stats.satisfactionRate}%` : "0%"}
                </p>
                <p className="text-xs text-slate-500">Taux de satisfaction</p>
              </div>
            </div>
          </div>
        )}
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
              <span className="text-4xl">⚠️</span>
              <h3 className="mt-3 text-lg font-bold">Impossible de charger les professeurs.</h3>
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
                          {teacher.verificationStatus === "APPROVED" && (
                            <span className="rounded-full bg-[#72d6bf]/20 text-[#72d6bf] border border-[#72d6bf]/30 px-1.5 py-0.2 text-[10px] font-bold">
                              ✓ Vérifié
                            </span>
                          )}
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

      {/* Featured Courses & Revision Packs Section */}
      <section id="courses" className="bg-white px-6 py-20 text-[#11233f] lg:px-10 border-b border-slate-200">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e5f7f2] px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#0d8d78]">
                <span>📚</span> E-Learning & Révision Autonome
              </span>
              <h2 className="mt-2 font-[family-name:var(--font-dm-sans)] text-3xl sm:text-4xl font-bold tracking-tight text-[#11233f]">
                Nos Meilleurs Cours & Packs Vidéo.
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                Apprenez à votre rythme avec des vidéos HD, des synthèses de cours et des séries d'exercices type Baccalauréat tunisien corrigés pas à pas par des enseignants réputés.
              </p>
            </div>

            <Link
              href="/courses"
              className="inline-flex items-center gap-1 text-sm font-bold text-[#0d8d78] transition hover:text-[#0b7866] hover:underline shrink-0"
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
              { id: "Physique-Chimie", label: "⚡ Physique-Chimie" },
              { id: "Informatique", label: "💻 Informatique / Python" },
              { id: "Français", label: "📖 Français" },
              { id: "Économie / Gestion", label: "📊 Éco-Gestion" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCourseSubject(tab.id)}
                className={`rounded-2xl px-4 py-2 text-xs font-bold transition duration-200 ${
                  selectedCourseSubject === tab.id
                    ? "bg-[#0d8d78] text-white shadow-md shadow-[#0d8d78]/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {coursesLoading ? (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-96 animate-pulse rounded-3xl bg-slate-100" />)}</div>
          ) : courses.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-slate-200 bg-slate-50 p-12 text-center">
              <span className="text-4xl">📚</span>
              <h3 className="mt-3 text-lg font-bold">Nouveaux cours et packs en cours de publication.</h3>
              <p className="mt-1 text-sm text-slate-500">
                Nos professeurs préparent de nouveaux contenus de révision. Revenez bientôt !
              </p>
              <Link
                href="/courses"
                className="mt-5 inline-block rounded-full bg-[#0d8d78] px-6 py-3 text-xs font-bold text-white transition hover:bg-[#0b7866]"
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
                    className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-[#72d6bf] overflow-hidden"
                  >
                    <div>
                      {/* Image Thumbnail with Overlay Badges */}
                      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                        <img
                          src={course.thumbnailUrl}
                          alt={course.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                          <span className="rounded-xl bg-[#11233f]/90 backdrop-blur-md px-3 py-1 text-[10px] font-bold text-white shadow-sm">
                            {course.subject}
                          </span>
                          {course.visibility === "LOCKED" && (
                            <span className="rounded-xl bg-amber-500/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-extrabold text-white shadow-sm flex items-center gap-1">
                              🔒 Pack Protégé
                            </span>
                          )}
                          {course.visibility === "PUBLIC" && (
                            <span className="rounded-xl bg-emerald-600/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-extrabold text-white shadow-sm flex items-center gap-1">
                              🌐 Gratuit
                            </span>
                          )}
                        </div>

                        <div className="absolute bottom-3 right-3 rounded-xl bg-white/95 backdrop-blur-md px-3 py-1 text-xs font-black text-[#0d8d78] shadow-md">
                          {course.priceTnd > 0 ? `${course.priceTnd} DT` : "GRATUIT"}
                        </div>
                      </div>

                      {/* Content Details */}
                      <div className="p-6 space-y-3">
                        <span className="text-[11px] font-semibold text-slate-400 block">
                          🎓 {course.level}
                        </span>

                        <h3 className="text-base font-bold text-[#11233f] group-hover:text-[#0d8d78] transition duration-200 line-clamp-2 leading-snug">
                          {course.title}
                        </h3>

                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                          {course.description}
                        </p>

                        {/* Teacher and Metrics */}
                        <div className="pt-3 flex items-center justify-between border-t border-slate-100 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-[#e5f7f2] text-[#0d8d78] font-bold flex items-center justify-center text-xs">
                              {course.teacherName.charAt(0)}
                            </div>
                            <span className="font-semibold text-slate-700 truncate max-w-[130px]">
                              {course.teacherName}
                            </span>
                          </div>

                          <span className="text-[11px] text-slate-400 font-medium">
                            📹 {course.totalLessons} vidéos · {course.durationMinutes} min
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CTA Footer */}
                    <div className="p-6 pt-0">
                      <Link
                        href={`/courses/${course.id}`}
                        className="block w-full text-center rounded-2xl bg-[#0d8d78] py-3.5 text-xs font-bold text-white shadow-md shadow-[#0d8d78]/20 transition duration-200 hover:bg-[#0b7866]"
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

      {/* Real Reviews Section - Connected to Database */}
      <section className="bg-slate-50 border-y border-slate-200 px-6 py-20 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-[#0d8d78]">Avis & Réussite</p>
              <h2 className="mt-2 font-[family-name:var(--font-dm-sans)] text-3xl sm:text-4xl font-bold tracking-tight text-[#11233f]">
                Ce que disent nos élèves satisfaits.
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-500">
                Avis et retours d'expérience vérifiés d'élèves et parents sur ProfySpace.tn.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setReviewModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0d8d78] px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-md transition hover:bg-[#0b7866] shrink-0"
            >
              <span>✍️</span>
              <span>Laisser un avis d'élève satisfait</span>
            </button>
          </div>

          {reviews.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <span className="text-3xl">⭐</span>
              <h3 className="mt-3 font-bold text-base text-slate-800">Aucun avis pour le moment.</h3>
              <p className="mt-1 text-xs text-slate-500">Soyez le premier élève à partager votre expérience de cours !</p>
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
                <div key={r.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1 text-amber-500 mb-3">
                      {[...Array(r.rating)].map((_, i) => (
                        <IconStar key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed italic">
                      "{r.text}"
                    </p>
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-[#11233f]">{r.name}</p>
                      <p className="text-[11px] text-[#0d8d78] font-semibold">{r.role}</p>
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
