/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";

const days = [
  { index: 0, label: "Lundi" },
  { index: 1, label: "Mardi" },
  { index: 2, label: "Mercredi" },
  { index: 3, label: "Jeudi" },
  { index: 4, label: "Vendredi" },
  { index: 5, label: "Samedi" },
  { index: 6, label: "Dimanche" },
];

export default function TeacherAvailabilityPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [teacherData, setTeacherData] = useState<any>(null);

  const [availabilities, setAvailabilities] = useState<{
    [dayIndex: number]: { start: string; end: string; enabled: boolean };
  }>({
    0: { start: "17:00", end: "20:00", enabled: true },
    1: { start: "17:00", end: "20:00", enabled: true },
    2: { start: "14:00", end: "19:00", enabled: true },
    3: { start: "17:00", end: "20:00", enabled: true },
    4: { start: "17:00", end: "20:00", enabled: true },
    5: { start: "09:00", end: "18:00", enabled: true },
    6: { start: "09:00", end: "14:00", enabled: false },
  });

  useEffect(() => {
    fetch("/api/teacher/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.teacher) {
          setTeacherData(data.teacher);
          if (data.teacher.availabilities && data.teacher.availabilities.length > 0) {
            setAvailabilities((prev) => {
              const newAvail = { ...prev };
              data.teacher.availabilities.forEach((a: { dayOfWeek: number; startTime: string; endTime: string }) => {
                newAvail[a.dayOfWeek] = { start: a.startTime, end: a.endTime, enabled: true };
              });
              return newAvail;
            });
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!teacherData) return;
    setSaving(true);
    setMessage("");

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
          title: teacherData.title,
          bio: teacherData.bio,
          experienceYears: teacherData.experienceYears,
          hourlyRateMillimes: teacherData.hourlyRateMillimes,
          governorate: teacherData.governorate,
          city: teacherData.city,
          online: teacherData.online,
          inPerson: teacherData.inPerson,
          subjects: teacherData.subjects,
          availability: activeAvailabilities,
        }),
      });

      if (res.ok) {
        setMessage("Vos créneaux de disponibilité ont été mis à jour avec succès !");
      } else {
        setMessage("Erreur lors de l'enregistrement des disponibilités.");
      }
    } catch {
      setMessage("Erreur de connexion.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/teacher/dashboard" className="text-slate-500 hover:text-slate-800">
              ← Dashboard Professeur
            </a>
            <span className="text-slate-300">/</span>
            <span className="font-bold">Mes Disponibilités</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-3xl font-bold">Planning & Disponibilités hebdomadaires</h1>
            <p className="mt-1 text-sm text-slate-500">
              Définissez les créneaux ouverts sur votre fiche publique pour permettre aux élèves de réserver.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="rounded-2xl bg-[#0d8d78] px-6 py-3 font-bold text-white shadow-lg shadow-[#0d8d78]/20 transition hover:bg-[#0b7866] disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Enregistrer mes créneaux →"}
          </button>
        </div>

        {message && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            {message}
          </div>
        )}

        <div className="mt-8 space-y-3">
          {days.map(({ index, label }) => {
            const current = availabilities[index] || { start: "17:00", end: "20:00", enabled: false };
            return (
              <div
                key={index}
                className={`flex flex-wrap items-center justify-between gap-4 rounded-3xl border p-5 transition ${
                  current.enabled ? "border-slate-200 bg-white shadow-sm" : "border-slate-100 bg-slate-50 opacity-60"
                }`}
              >
                <label className="flex items-center gap-3 font-bold text-base w-36 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={current.enabled}
                    onChange={(e) =>
                      setAvailabilities({
                        ...availabilities,
                        [index]: { ...current, enabled: e.target.checked },
                      })
                    }
                    className="h-5 w-5 rounded text-[#0d8d78] focus:ring-[#0d8d78]"
                  />
                  {label}
                </label>

                {current.enabled ? (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-slate-400 font-semibold">De</span>
                    <input
                      type="time"
                      value={current.start}
                      onChange={(e) =>
                        setAvailabilities({
                          ...availabilities,
                          [index]: { ...current, start: e.target.value },
                        })
                      }
                      className="rounded-xl border border-slate-200 p-2.5 outline-none font-semibold"
                    />
                    <span className="text-slate-400 font-semibold">à</span>
                    <input
                      type="time"
                      value={current.end}
                      onChange={(e) =>
                        setAvailabilities({
                          ...availabilities,
                          [index]: { ...current, end: e.target.value },
                        })
                      }
                      className="rounded-xl border border-slate-200 p-2.5 outline-none font-semibold"
                    />
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-slate-400">Non disponible ce jour</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
