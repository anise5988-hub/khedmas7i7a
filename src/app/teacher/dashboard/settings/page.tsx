/* eslint-disable @next/next/no-location-assign-relative-destination */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconCheck, IconShield, IconUser } from "@/components/icons";

export default function TeacherSettingsPage() {
  const [loading, setLoading] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: "", text: "" });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setFirstName(data.user.firstName || "");
          setLastName(data.user.lastName || "");
          setEmail(data.user.email || "");
          setPhone(data.user.phone || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg({ type: "", text: "" });

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, phone }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfileMsg({ type: "success", text: "Profil mis à jour avec succès !" });
      } else {
        setProfileMsg({ type: "error", text: data.error || "Erreur lors de la mise à jour." });
      }
    } catch {
      setProfileMsg({ type: "error", text: "Erreur de connexion." });
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Les deux mots de passe ne correspondent pas." });
      return;
    }

    setPasswordSaving(true);
    setPasswordMsg({ type: "", text: "" });

    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMsg({ type: "success", text: "Mot de passe modifié avec succès !" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordMsg({ type: "error", text: data.error || "Erreur lors du changement." });
      }
    } catch {
      setPasswordMsg({ type: "error", text: "Erreur de connexion." });
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setDeleteLoading(true);
    setDeleteError("");

    try {
      const res = await fetch("/api/user/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (res.ok) {
        window.location.href = "/";
      } else {
        setDeleteError(data.error || "Mot de passe incorrect.");
      }
    } catch {
      setDeleteError("Erreur de connexion.");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/teacher/dashboard" className="text-sm font-semibold text-slate-500 hover:text-slate-800">
              ← Dashboard Professeur
            </Link>
            <span className="text-slate-300">/</span>
            <span className="font-bold text-sm">Paramètres</span>
          </div>

          <Link href="/" className="flex items-center gap-1 font-[family-name:var(--font-dm-sans)] text-xl font-bold tracking-tight">
            <span>ProfySpace</span>
            <span className="rounded-md bg-[#0d8d78] px-1.5 py-0.5 text-xs font-extrabold text-white">.tn</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#0d8d78]">Sécurité & Compte</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Paramètres du compte professeur</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gérez vos accès et la sécurité de votre compte enseignant.
          </p>
        </div>

        <div className="mt-8 space-y-8">
          {/* Form 1: Profile Info */}
          <form onSubmit={handleUpdateProfile} className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0d8d78]/10 text-[#0d8d78]">
                <IconUser className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Informations de contact</h2>
                <p className="text-xs text-slate-500">Coordonnées personnelles associées à votre profil</p>
              </div>
            </div>

            {profileMsg.text && (
              <div
                className={`rounded-xl p-3.5 text-xs font-semibold ${
                  profileMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-900 border border-emerald-200 flex items-center gap-2"
                    : "bg-rose-50 text-rose-900 border border-rose-200"
                }`}
              >
                {profileMsg.type === "success" && <IconCheck className="h-4 w-4 text-emerald-600 shrink-0" />}
                <p>{profileMsg.text}</p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Prénom</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Nom</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Téléphone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+216 20 000 000"
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={profileSaving || loading}
              className="rounded-xl bg-[#0d8d78] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#0b7866] disabled:opacity-50"
            >
              {profileSaving ? "Enregistrement..." : "Enregistrer les coordonnées →"}
            </button>
          </form>

          {/* Form 2: Password */}
          <form onSubmit={handleChangePassword} className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <IconShield className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Sécurité du mot de passe</h2>
                <p className="text-xs text-slate-500">Mettez à jour votre mot de passe régulier</p>
              </div>
            </div>

            {passwordMsg.text && (
              <div
                className={`rounded-xl p-3.5 text-xs font-semibold ${
                  passwordMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-900 border border-emerald-200 flex items-center gap-2"
                    : "bg-rose-50 text-rose-900 border border-rose-200"
                }`}
              >
                {passwordMsg.type === "success" && <IconCheck className="h-4 w-4 text-emerald-600 shrink-0" />}
                <p>{passwordMsg.text}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Mot de passe actuel *
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Nouveau mot de passe *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Confirmer le mot de passe *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={passwordSaving}
              className="rounded-xl bg-[#11233f] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
            >
              {passwordSaving ? "Mise à jour..." : "Modifier mon mot de passe →"}
            </button>
          </form>

          {/* Danger Zone */}
          <div className="rounded-3xl border border-rose-200 bg-rose-50/40 p-6 sm:p-8 space-y-4">
            <h2 className="text-lg font-bold text-rose-900">Zone de danger</h2>
            <p className="text-xs text-rose-800 leading-relaxed max-w-xl">
              La suppression de votre profil enseignant entraînera la suppression irréversible de vos créneaux, réservations et données associées.
            </p>

            <button
              type="button"
              onClick={() => {
                setDeleteModalOpen(true);
                setDeleteError("");
              }}
              className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700"
            >
              Supprimer mon compte définitivement
            </button>
          </div>
        </div>
      </div>

      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-rose-900">Confirmer la suppression</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Pour des raisons de sécurité, veuillez saisir votre mot de passe pour confirmer la suppression définitive.
            </p>

            {deleteError && (
              <p className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
                {deleteError}
              </p>
            )}

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div>
                <input
                  type="password"
                  required
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Mot de passe"
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-rose-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
                >
                  {deleteLoading ? "Suppression..." : "Confirmer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
