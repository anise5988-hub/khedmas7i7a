/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteNavbar } from "@/components/site-navbar";
import { governorates, subjects as allSubjects } from "@/lib/domain/catalog";
import {
  IconCheckCircle,
  IconAlertCircle,
  IconPlus,
  IconTrash,
} from "@/components/icons";

type AvailabilitySlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

const dayNames = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export default function TeacherProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [experienceYears, setExperienceYears] = useState(2);
  const [hourlyRateTnd, setHourlyRateTnd] = useState(25);
  const [governorate, setGovernorate] = useState("Tunis");
  const [city, setCity] = useState("Tunis");
  const [online, setOnline] = useState(true);
  const [inPerson, setInPerson] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState("PENDING");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(["Mathématiques"]);
  const [availabilities, setAvailabilities] = useState<AvailabilitySlot[]>([
    { dayOfWeek: 0, startTime: "17:00", endTime: "20:00" },
    { dayOfWeek: 2, startTime: "17:00", endTime: "20:00" },
    { dayOfWeek: 5, startTime: "10:00", endTime: "16:00" },
  ]);

  useEffect(() => {
    fetch("/api/teacher/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.teacher) {
          const t = data.teacher;
          setSlug(t.slug || "");
          setTitle(t.title || "");
          setBio(t.bio || "");
          setExperienceYears(t.experienceYears || 0);
          setHourlyRateTnd(t.hourlyRateTnd || 25);
          setGovernorate(t.governorate || "Tunis");
          setCity(t.city || "");
          setOnline(t.online !== false);
          setInPerson(Boolean(t.inPerson));
          setVerificationStatus(t.verificationStatus || "PENDING");
          setAvatarUrl(t.avatarUrl || "");
          if (Array.isArray(t.subjects) && t.subjects.length > 0) {
            setSelectedSubjects(t.subjects);
          }
          if (Array.isArray(t.availabilities) && t.availabilities.length > 0) {
            setAvailabilities(t.availabilities);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggleSubject(subj: string) {
    if (selectedSubjects.includes(subj)) {
      if (selectedSubjects.length > 1) {
        setSelectedSubjects(selectedSubjects.filter((s) => s !== subj));
      }
    } else {
      setSelectedSubjects([...selectedSubjects, subj]);
    }
  }

  function addAvailabilitySlot() {
    setAvailabilities([...availabilities, { dayOfWeek: 0, startTime: "18:00", endTime: "20:00" }]);
  }

  function removeAvailabilitySlot(index: number) {
    setAvailabilities(availabilities.filter((_, i) => i !== index));
  }

  function updateSlot(index: number, field: keyof AvailabilitySlot, value: string | number) {
    const updated = [...availabilities];
    updated[index] = { ...updated[index], [field]: value };
    setAvailabilities(updated);
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMessage({ type: "error", text: "Veuillez choisir une image." }); return; }
    setAvatarUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", "image");
    try {
      const response = await fetch("/api/uploads/video", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload impossible.");
      setAvatarUrl(data.url);
      setMessage({ type: "success", text: "Photo téléchargée. Cliquez sur enregistrer pour la sauvegarder." });
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Upload impossible." }); }
    finally { setAvatarUploading(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload = {
      avatarUrl: avatarUrl || null,
      title: title.trim(),
      bio: bio.trim(),
      experienceYears: Number(experienceYears),
      hourlyRateMillimes: Math.round(Number(hourlyRateTnd) * 1000),
      governorate,
      city: city.trim(),
      online,
      inPerson,
      subjects: selectedSubjects,
      availability: availabilities,
    };

    try {
      const res = await fetch("/api/teacher/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: "success",
          text: data.message || "Profil enseignant mis à jour avec succès !",
        });
        if (data.status) setVerificationStatus(data.status);
      } else {
        setMessage({
          type: "error",
          text: data.error || "Impossible d'enregistrer les modifications.",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Erreur de connexion au serveur." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <SiteNavbar dark={false} />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#e5f7f2] border border-[#0d8d78]/25 px-2.5 py-0.5 text-xs font-bold text-[#0d8d78]">
                Enseignant
              </span>
              {verificationStatus === "APPROVED" ? (
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  ✓ Fiche Publique Validée
                </span>
              ) : verificationStatus === "UNDER_REVIEW" ? (
                <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                  ⏳ En cours d'examen
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                  📝 À compléter
                </span>
              )}
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">Mon Profil Enseignant</h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Gérez votre présentation publique, vos matières, tarifs et disponibilités hebdomadaires.
            </p>
          </div>

          {slug && (
            <Link
              href={`/teachers/${slug}`}
              target="_blank"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-[#0d8d78] hover:text-[#0d8d78] shadow-sm"
            >
              Voir ma fiche publique ↗
            </Link>
          )}
        </div>

        {message && (
          <div
            className={`mt-6 rounded-2xl p-4 text-xs font-semibold flex items-center gap-2 ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                : "bg-rose-50 text-rose-900 border border-rose-200"
            }`}
          >
            {message.type === "success" ? <IconCheckCircle className="h-4 w-4 shrink-0 text-emerald-600" /> : <IconAlertCircle className="h-4 w-4 shrink-0 text-rose-600" />}
            <p>{message.text}</p>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0d8d78] border-t-transparent mx-auto"></div>
            <p className="mt-4 text-xs text-slate-500">Chargement de votre profil...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="mt-8 space-y-8">
            {/* Photo de profil */}
            <div className="rounded-3xl border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <h2 className="text-lg font-bold">Photo de profil</h2>
              <p className="mt-1 text-xs text-slate-500">Ajoutez une photo professionnelle à votre fiche publique.</p>
              <div className="mt-4 flex-wrap items-center gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-2xl bg-[#e5f7f2] text-2xl font-bold text-[#0d8d78] flex items-center justify-center">{avatarUrl ? <img src={avatarUrl} alt="Votre photo" className="h-full w-full object-cover" /> : "👤"}</div>
                <label className="cursor-pointer rounded-xl border-[#0d8d78] px-4 py-2 text-xs font-bold text-[#0d8d78] hover:bg-[#e5f7f2]">{avatarUploading ? "Upload..." : "Choisir une photo"}<input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" /></label>
              </div>
            </div>

            {/* 1. Titre & Présentation */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-4">
              <h2 className="text-lg font-bold">1. Titre & Biographie Pédagogique</h2>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Titre professionnel / Spécialité *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Professeur de Mathématiques - Spécialiste Bac & Concours"
                  className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Présentation & Méthodologie d'enseignement *
                </label>
                <textarea
                  required
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Décrivez votre expérience, votre parcours universitaire et vos méthodes pédagogiques pour aider les élèves à progresser..."
                  className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Années d'expérience professionnelle
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Tarif horaire de base (DT / heure) *
                  </label>
                  <input
                    type="number"
                    min={5}
                    step={1}
                    required
                    value={hourlyRateTnd}
                    onChange={(e) => setHourlyRateTnd(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-3.5 text-sm font-bold text-[#0d8d78] outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
                  />
                </div>
              </div>
            </div>

            {/* 2. Matières Enseignées */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-4">
              <h2 className="text-lg font-bold">2. Matières Enseignées</h2>
              <p className="text-xs text-slate-500">Sélectionnez les matières que vous maîtrisez :</p>

              <div className="flex flex-wrap gap-2">
                {allSubjects.map((subj) => {
                  const isSelected = selectedSubjects.includes(subj);
                  return (
                    <button
                      type="button"
                      key={subj}
                      onClick={() => toggleSubject(subj)}
                      className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                        isSelected
                          ? "bg-[#0d8d78] text-white shadow-xs"
                          : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {isSelected ? "✓ " : "+ "}
                      {subj}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Localisation & Formats */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-4">
              <h2 className="text-lg font-bold">3. Localisation & Formats de Cours</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Gouvernorat
                  </label>
                  <select
                    value={governorate}
                    onChange={(e) => setGovernorate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
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
                    placeholder="Ex: La Marsa, Menzah, Sahloul..."
                    className="w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={online}
                    onChange={(e) => setOnline(e.target.checked)}
                    className="h-4 w-4 rounded text-[#0d8d78]"
                  />
                  <span>🌐 Cours en ligne (WebRTC)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={inPerson}
                    onChange={(e) => setInPerson(e.target.checked)}
                    className="h-4 w-4 rounded text-[#0d8d78]"
                  />
                  <span>🏠 Cours en présentiel à domicile / local</span>
                </label>
              </div>
            </div>

            {/* 4. Créneaux de Disponibilité */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-lg font-bold">4. Créneaux Hebdomadaires</h2>
                  <p className="text-xs text-slate-500">Indiquez vos plages horaires ouvertes aux réservations :</p>
                </div>
                <button
                  type="button"
                  onClick={addAvailabilitySlot}
                  className="flex items-center gap-1.5 rounded-xl bg-[#e5f7f2] border border-[#0d8d78]/25 px-3 py-1.5 text-xs font-bold text-[#0d8d78] hover:bg-[#d4f2e9] transition"
                >
                  <IconPlus className="h-3.5 w-3.5" />
                  <span>Ajouter un créneau</span>
                </button>
              </div>

              {availabilities.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Aucun créneau défini. Cliquez sur « Ajouter un créneau » pour ouvrir vos disponibilités.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {availabilities.map((slot, index) => (
                    <div key={index} className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-3 border border-slate-100 text-xs">
                      <select
                        value={slot.dayOfWeek}
                        onChange={(e) => updateSlot(index, "dayOfWeek", Number(e.target.value))}
                        className="rounded-xl border border-slate-200 bg-white p-2 font-bold outline-none"
                      >
                        {dayNames.map((d, dIdx) => (
                          <option key={dIdx} value={dIdx}>
                            {d}
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">De</span>
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => updateSlot(index, "startTime", e.target.value)}
                          className="rounded-xl border border-slate-200 bg-white p-2 font-mono outline-none"
                        />
                        <span className="text-slate-400">à</span>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => updateSlot(index, "endTime", e.target.value)}
                          className="rounded-xl border border-slate-200 bg-white p-2 font-mono outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeAvailabilitySlot(index)}
                        className="ml-auto rounded-xl p-1.5 text-rose-500 hover:bg-rose-50 transition"
                        title="Supprimer ce créneau"
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-[#0d8d78] px-8 py-4 text-sm font-bold text-white shadow-lg shadow-[#0d8d78]/20 transition hover:bg-[#0b7866] disabled:opacity-50"
              >
                {saving ? "Enregistrement..." : "Enregistrer et soumettre mon profil →"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}