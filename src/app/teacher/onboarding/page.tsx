/* eslint-disable @next/next/no-html-link-for-pages, @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useState } from "react";
import { subjects, governorates } from "@/lib/domain/catalog";

const days = [
  { index: 0, label: "Lundi" },
  { index: 1, label: "Mardi" },
  { index: 2, label: "Mercredi" },
  { index: 3, label: "Jeudi" },
  { index: 4, label: "Vendredi" },
  { index: 5, label: "Samedi" },
  { index: 6, label: "Dimanche" },
];

export default function TeacherOnboardingPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [experienceYears, setExperienceYears] = useState(2);
  const [hourlyRate, setHourlyRate] = useState(25);
  const [governorate, setGovernorate] = useState("Tunis");
  const [city, setCity] = useState("");
  const [online, setOnline] = useState(true);
  const [inPerson, setInPerson] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(["Mathématiques"]);
  const [availabilities, setAvailabilities] = useState<{ [dayIndex: number]: { start: string; end: string; enabled: boolean } }>({
    0: { start: "17:00", end: "20:00", enabled: true },
    1: { start: "17:00", end: "20:00", enabled: true },
    2: { start: "14:00", end: "19:00", enabled: true },
    3: { start: "17:00", end: "20:00", enabled: true },
    4: { start: "17:00", end: "20:00", enabled: true },
    5: { start: "09:00", end: "18:00", enabled: true },
    6: { start: "09:00", end: "14:00", enabled: false },
  });
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/teacher/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.teacher) {
          const t = data.teacher;
          if (t.title) setTitle(t.title);
          if (t.bio) setBio(t.bio);
          if (t.experienceYears !== undefined) setExperienceYears(t.experienceYears);
          if (t.hourlyRateTnd) setHourlyRate(t.hourlyRateTnd);
          if (t.governorate) setGovernorate(t.governorate);
          if (t.city) setCity(t.city);
          if (t.online !== undefined) setOnline(t.online);
          if (t.inPerson !== undefined) setInPerson(t.inPerson);
          if (t.subjects && t.subjects.length > 0) setSelectedSubjects(t.subjects);
          if (t.verificationStatus) setCurrentStatus(t.verificationStatus);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggleSubject(subj: string) {
    if (selectedSubjects.includes(subj)) {
      if (selectedSubjects.length === 1) return;
      setSelectedSubjects(selectedSubjects.filter((s) => s !== subj));
    } else {
      setSelectedSubjects([...selectedSubjects, subj]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: "", text: "" });

    const activeAvailabilities = Object.entries(availabilities)
      .filter(([_, val]) => val.enabled && val.start && val.end)
      .map(([dayIndex, val]) => ({
        dayOfWeek: Number(dayIndex),
        startTime: val.start,
        endTime: val.end,
      }));

    try {
      const res = await fetch("/api/teacher/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          bio,
          experienceYears: Number(experienceYears),
          hourlyRateMillimes: Math.round(Number(hourlyRate) * 1000),
          governorate,
          city,
          online,
          inPerson,
          subjects: selectedSubjects,
          availability: activeAvailabilities,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCurrentStatus("PENDING");
        setMessage({
          type: "success",
          text: "Candidature envoyée avec succès ! Votre dossier est maintenant en attente de vérification par l'équipe d'administration.",
        });
      } else {
        setMessage({ type: "error", text: data.error || "Une erreur est survenue." });
      }
    } catch {
      setMessage({ type: "error", text: "Erreur de connexion au serveur." });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0d8d78] border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm font-semibold text-slate-600">Chargement de votre profil...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] px-4 py-8 sm:px-6 sm:py-12 text-[#11233f]">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-1 font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-tight">
            <span>ProfySpace</span>
            <span className="rounded-md bg-[#0d8d78] px-1.5 py-0.5 text-xs font-extrabold text-white">.tn</span>
          </a>
          <a
            href="/teacher/dashboard"
            className="rounded-2xl bg-[#0d8d78] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0b7866] shadow-sm sm:text-sm"
          >
            Accéder à mon espace →
          </a>
        </div>

        {currentStatus === "PENDING" && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⏳</span>
              <div>
                <h3 className="font-bold text-base">Candidature en cours de traitement</h3>
                <p className="mt-1 text-sm text-amber-800">
                  Votre dossier a été soumis et est actuellement analysé par un administrateur. Vous recevrez une
                  confirmation dès validation. Vous pouvez mettre à jour vos informations ci-dessous à tout moment.
                </p>
              </div>
            </div>
          </div>
        )}

        {currentStatus === "APPROVED" && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <h3 className="font-bold text-base">Profil approuvé et actif</h3>
                <p className="mt-1 text-sm text-emerald-800">
                  Félicitations ! Votre profil professeur est validé et visible par les élèves sur la marketplace.
                </p>
              </div>
            </div>
          </div>
        )}

        {currentStatus === "REJECTED" && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-bold text-base">Dossier incomplet ou non retenu</h3>
                <p className="mt-1 text-sm text-rose-800">
                  Votre candidature nécessite des modifications. Veuillez compléter votre biographie, préciser vos
                  matières et ré-enregistrer votre dossier.
                </p>
              </div>
            </div>
          </div>
        )}

        {message.text && (
          <div
            className={`mt-6 rounded-2xl p-4 text-sm font-semibold ${
              message.type === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#0d8d78]">Dossier de candidature</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Formulaire de professeur</h1>
            <p className="mt-2 text-sm text-slate-500">
              Remplissez les informations de votre profil. Elles seront examinées par l'équipe ProfySpace.tn avant
              publication.
            </p>
          </div>

          <section className="space-y-4">
            <h2 className="text-lg font-bold border-b border-slate-100 pb-2">1. Informations Générales</h2>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Titre professionnel *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Professeur de Mathématiques certifié (10 ans d'expérience)"
                className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Présentation / Biographie détaillée *
              </label>
              <textarea
                required
                rows={5}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Présentez votre parcours, vos diplômes, votre pédagogie et votre méthode de travail avec les élèves..."
                className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Années d'expérience
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  required
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Tarif par heure (DT) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  step="1"
                  required
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Gouvernorat *
                </label>
                <select
                  value={governorate}
                  onChange={(e) => setGovernorate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
                >
                  {governorates.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Ville / Délégation
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: Ariana Ville, Menzah, Marsa..."
                  className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-bold border-b border-slate-100 pb-2">2. Matières enseignées *</h2>
            <p className="text-xs text-slate-500">Sélectionnez les matières que vous maîtrisez :</p>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
              {subjects.map((subj) => {
                const isSelected = selectedSubjects.includes(subj);
                return (
                  <button
                    type="button"
                    key={subj}
                    onClick={() => toggleSubject(subj)}
                    className={`flex items-center justify-between rounded-xl border p-3 text-left text-xs font-semibold transition ${
                      isSelected
                        ? "border-[#0d8d78] bg-[#e5f7f2] text-[#0d8d78]"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <span>{subj}</span>
                    <span>{isSelected ? "✓" : "+"}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-bold border-b border-slate-100 pb-2">3. Modes d'enseignement</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${
                  online ? "border-[#0d8d78] bg-[#e5f7f2]" : "border-slate-200 bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  checked={online}
                  onChange={(e) => setOnline(e.target.checked)}
                  className="h-4 w-4 rounded text-[#0d8d78] focus:ring-[#0d8d78]"
                />
                <div>
                  <p className="font-bold text-sm">Cours en ligne (WebRTC)</p>
                  <p className="text-xs text-slate-500">Depuis la classe virtuelle interactive Profy</p>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${
                  inPerson ? "border-[#0d8d78] bg-[#e5f7f2]" : "border-slate-200 bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  checked={inPerson}
                  onChange={(e) => setInPerson(e.target.checked)}
                  className="h-4 w-4 rounded text-[#0d8d78] focus:ring-[#0d8d78]"
                />
                <div>
                  <p className="font-bold text-sm">Cours en présentiel</p>
                  <p className="text-xs text-slate-500">Au domicile ou dans votre lieu d'enseignement</p>
                </div>
              </label>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-bold border-b border-slate-100 pb-2">4. Créneaux de disponibilité</h2>
            <div className="space-y-2.5">
              {days.map(({ index, label }) => {
                const current = availabilities[index] || { start: "17:00", end: "20:00", enabled: false };
                return (
                  <div
                    key={index}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3.5 transition ${
                      current.enabled ? "border-slate-300 bg-white" : "border-slate-100 bg-slate-50 opacity-60"
                    }`}
                  >
                    <label className="flex items-center gap-3 font-semibold text-sm w-32 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={current.enabled}
                        onChange={(e) =>
                          setAvailabilities({
                            ...availabilities,
                            [index]: { ...current, enabled: e.target.checked },
                          })
                        }
                        className="h-4 w-4 rounded text-[#0d8d78] focus:ring-[#0d8d78]"
                      />
                      {label}
                    </label>

                    {current.enabled ? (
                      <div className="flex items-center gap-2 text-xs">
                        <span>De</span>
                        <input
                          type="time"
                          value={current.start}
                          onChange={(e) =>
                            setAvailabilities({
                              ...availabilities,
                              [index]: { ...current, start: e.target.value },
                            })
                          }
                          className="rounded-lg border border-slate-200 p-2 outline-none"
                        />
                        <span>à</span>
                        <input
                          type="time"
                          value={current.end}
                          onChange={(e) =>
                            setAvailabilities({
                              ...availabilities,
                              [index]: { ...current, end: e.target.value },
                            })
                          }
                          className="rounded-lg border border-slate-200 p-2 outline-none"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Indisponible</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <div className="border-t border-slate-200 pt-6">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-[#0d8d78] py-4 text-center font-bold text-white shadow-lg shadow-[#0d8d78]/20 transition duration-300 hover:bg-[#0b7866] hover:shadow-xl disabled:opacity-50"
            >
              {submitting ? "Enregistrement en cours..." : "Soumettre ma candidature pour validation →"}
            </button>
            <p className="mt-3 text-center text-xs text-slate-400">
              En soumettant ce formulaire, votre profil passera au statut <strong>PENDING</strong> en attente de
              validation.
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
