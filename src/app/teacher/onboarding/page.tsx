/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { subjects, governorates } from "@/lib/domain/catalog";
import { IconCamera, IconCheck, IconShield, IconUser } from "@/components/icons";

const documentTypeLabels: Record<string, string> = {
  NATIONAL_ID: "Carte d'identité nationale (CIN)",
  DIPLOMA: "Diplôme",
  CERTIFICATE: "Certificat professionnel",
  OTHER: "Autre document",
};

type VerificationDocument = {
  id: string;
  type: string;
  fileName: string;
  url: string | null;
  createdAt: string;
};

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
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
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

  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [documentType, setDocumentType] = useState("NATIONAL_ID");
  const [documentUploading, setDocumentUploading] = useState(false);
  const [documentMessage, setDocumentMessage] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  function loadDocuments() {
    fetch("/api/teacher/verification-documents", { headers: getAuthHeaders() })
      .then((res) => (res.ok ? res.json() : { documents: [] }))
      .then((data) => setDocuments(data.documents || []))
      .catch(() => {});
  }

  function getAuthHeaders(): Record<string, string> {
    const userId = typeof window !== "undefined" ? localStorage.getItem("profyspace_user_id") || "" : "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (userId) headers["x-user-id"] = userId;
    return headers;
  }

  useEffect(() => {
    fetch("/api/teacher/profile", { headers: getAuthHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.teacher) {
          const t = data.teacher;
          if (t.title) setTitle(t.title);
          if (t.avatarUrl) setAvatarUrl(t.avatarUrl);
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
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDocumentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocumentUploading(true);
    setDocumentMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", documentType);
      const userId = typeof window !== "undefined" ? localStorage.getItem("profyspace_user_id") || "" : "";
      const res = await fetch("/api/teacher/verification-documents", {
        method: "POST",
        headers: userId ? { "x-user-id": userId } : undefined,
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setDocumentMessage("Document envoyé avec succès.");
        loadDocuments();
      } else {
        setDocumentMessage(data.error || "Impossible d'envoyer le document.");
      }
    } catch {
      setDocumentMessage("Erreur de connexion au serveur.");
    } finally {
      setDocumentUploading(false);
      if (documentInputRef.current) documentInputRef.current.value = "";
    }
  }

  async function handleDocumentDelete(id: string) {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    await fetch(`/api/teacher/verification-documents/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    }).catch(() => {});
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Veuillez choisir une image." });
      return;
    }
    setAvatarUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", "image");
    try {
      const res = await fetch("/api/uploads/video", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Envoi de la photo impossible.");
      setAvatarUrl(data.url);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Envoi de la photo impossible." });
    } finally {
      setAvatarUploading(false);
    }
  }

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
      .filter(([, val]) => val.enabled && val.start && val.end)
      .map(([dayIndex, val]) => ({
        dayOfWeek: Number(dayIndex),
        startTime: val.start,
        endTime: val.end,
      }));

    try {
      const res = await fetch("/api/teacher/profile", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title,
          avatarUrl,
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
          text: "Candidature enregistrée avec succès ! Votre dossier est en attente de vérification par l'équipe administrative.",
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
          <Link href="/" className="flex items-center gap-1 font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-tight">
            <span>ProfySpace</span>
            <span className="rounded-md bg-[#0d8d78] px-1.5 py-0.5 text-xs font-extrabold text-white">.tn</span>
          </Link>
          <Link
            href="/teacher/dashboard"
            className="rounded-2xl bg-[#0d8d78] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0b7866] shadow-sm sm:text-sm"
          >
            Accéder à mon espace →
          </Link>
        </div>

        {/* Status Alert Banner */}
        {currentStatus === "PENDING" && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-900 font-bold">
                ⏳
              </div>
              <div>
                <h3 className="font-bold text-base">Candidature en cours de traitement</h3>
                <p className="mt-1 text-xs sm:text-sm text-amber-800 leading-relaxed">
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
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-200 text-emerald-900 font-bold">
                <IconCheck className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <h3 className="font-bold text-base">Profil approuvé et actif</h3>
                <p className="mt-1 text-xs sm:text-sm text-emerald-800">
                  Félicitations ! Votre profil professeur est validé et visible par les élèves sur la marketplace.
                </p>
              </div>
            </div>
          </div>
        )}

        {currentStatus === "REJECTED" && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-200 text-rose-900 font-bold">
                ✕
              </div>
              <div>
                <h3 className="font-bold text-base">Dossier incomplet ou non retenu</h3>
                <p className="mt-1 text-xs sm:text-sm text-rose-800">
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
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#0d8d78]">Dossier Professionnel</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Formulaire de professeur</h1>
            <p className="mt-2 text-sm text-slate-500">
              Renseignez vos informations professionnelles et ajoutez votre photo de profil.
            </p>
          </div>

          {/* Section 1: Photo & Informations Générales */}
          <section className="space-y-5">
            <h2 className="text-lg font-bold border-b border-slate-100 pb-2">1. Photo & Informations Générales</h2>

            {/* Avatar Upload */}
            <div className="flex flex-col sm:flex-row items-center gap-5 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-white border-2 border-slate-200 overflow-hidden shadow-sm">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Aperçu" className="h-full w-full object-cover" />
                ) : (
                  <IconUser className="h-10 w-10 text-slate-400" />
                )}
              </div>

              <div className="flex-1 text-center sm:text-left space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50"
                >
                  <IconCamera className="h-4 w-4 text-[#0d8d78]" />
                  <span>{avatarUploading ? "Envoi en cours..." : avatarUrl ? "Modifier ma photo" : "Ajouter une photo de profil"}</span>
                </button>
                <p className="text-xs text-slate-400">
                  Format JPG, PNG ou WebP. Une photo professionnelle augmente le taux de réservation.
                </p>
              </div>
            </div>

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

          {/* Section 2: Matières enseignées */}
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
                        ? "border-[#0d8d78] bg-[#e5f7f2] text-[#0d8d78] ring-1 ring-[#0d8d78]"
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

          {/* Section 3: Modes d'enseignement */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold border-b border-slate-100 pb-2">3. Modes d'enseignement</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${
                  online ? "border-[#0d8d78] bg-[#e5f7f2] ring-1 ring-[#0d8d78]" : "border-slate-200 bg-white"
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
                  <p className="text-xs text-slate-500">Depuis la classe virtuelle interactive ProfySpace</p>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${
                  inPerson ? "border-[#0d8d78] bg-[#e5f7f2] ring-1 ring-[#0d8d78]" : "border-slate-200 bg-white"
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

          {/* Section 4: Créneaux de disponibilité */}
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
                          className="rounded-lg border border-slate-200 p-2 outline-none font-semibold"
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
                          className="rounded-lg border border-slate-200 p-2 outline-none font-semibold"
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

          {/* Section 5: Documents de vérification */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold border-b border-slate-100 pb-2">5. Documents de vérification</h2>
            <p className="text-xs text-slate-500">
              Ajoutez votre carte d&apos;identité et vos diplômes pour obtenir le badge &laquo; Professeur vérifié &raquo;.
              Ces documents ne sont jamais publics : seule l&apos;équipe ProfySpace peut les consulter.
            </p>

            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:flex-row sm:items-center">
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold outline-none focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
              >
                {Object.entries(documentTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                type="file"
                ref={documentInputRef}
                onChange={handleDocumentUpload}
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => documentInputRef.current?.click()}
                disabled={documentUploading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-300 px-4 py-3 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50"
              >
                {documentUploading ? "Envoi en cours..." : "Choisir un fichier (PDF, JPG, PNG)"}
              </button>
            </div>

            {documentMessage && <p className="text-xs font-semibold text-slate-600">{documentMessage}</p>}

            {documents.length > 0 && (
              <ul className="space-y-2">
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold">{documentTypeLabels[doc.type] || doc.type}</p>
                      {doc.url ? (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[#0d8d78] hover:underline"
                        >
                          {doc.fileName}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">{doc.fileName}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDocumentDelete(doc.id)}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100"
                    >
                      Supprimer
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="border-t border-slate-200 pt-6">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-[#0d8d78] py-4 text-center font-bold text-white shadow-lg shadow-[#0d8d78]/20 transition duration-300 hover:bg-[#0b7866] hover:shadow-xl disabled:opacity-50"
            >
              {submitting ? "Enregistrement en cours..." : "Soumettre ma candidature pour validation →"}
            </button>
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <IconShield className="h-3.5 w-3.5 text-[#0d8d78]" />
              <span>Dossier examiné sous 24h par l'administration ProfySpace.tn</span>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
