"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  IconUser,
  IconLogout,
  IconSettings,
  IconTeacher,
  IconShield,
  IconChevronDown,
  IconMenu,
  IconX,
} from "./icons";
import { NotificationCenter } from "./notification-center";
import { ThemeToggle } from "./theme-toggle";
import { supabase } from "@/lib/client/supabase";

export type UserSession = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
};

export function SiteNavbar({ dark = false }: { dark?: boolean }) {
  const pathname = usePathname();
  const [user, setUser] = useState<UserSession | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem("profyspace_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userId = typeof window !== "undefined" ? localStorage.getItem("profyspace_user_id") || "" : "";
    const headers: Record<string, string> = userId ? { "x-user-id": userId } : {};

    fetch("/api/auth/me", { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          localStorage.setItem("profyspace_user", JSON.stringify(data.user));
          if (data.user.id) localStorage.setItem("profyspace_user_id", data.user.id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    localStorage.removeItem("profyspace_user");
    localStorage.removeItem("profyspace_user_id");
    localStorage.removeItem("profyspace_oauth_role");
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.replace("/");
  }

  const role = user?.role;
  const isDark = dark || role === "ADMIN";

  // Helpers for active link styling
  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname?.startsWith(path);
  };

  const linkBaseClass = (path: string) => {
    const active = isActive(path);
    if (isDark) {
      return active
        ? "text-[#72d6bf] font-bold bg-white/10 px-3 py-1.5 rounded-xl border border-[#72d6bf]/30 shadow-xs"
        : "text-slate-300 hover:text-white hover:bg-white/5 px-3 py-1.5 rounded-xl font-medium transition duration-150";
    }
    return active
      ? "text-[#0d8d78] font-bold bg-[#e5f7f2] px-3 py-1.5 rounded-xl border border-[#0d8d78]/20 shadow-xs"
      : "text-slate-600 hover:text-[#0d8d78] hover:bg-slate-100/70 px-3 py-1.5 rounded-xl font-medium transition duration-150";
  };

  return (
    <header className="relative w-full z-30 transition-all duration-300">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3 lg:px-10">
        {/* Brand Logo with Role-Specific Visual Identity */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="group flex items-center gap-1 font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-tight transition duration-200"
          >
            <span className={isDark ? "text-white group-hover:text-slate-100" : "text-[#11233f] group-hover:text-[#0d8d78]"}>
              ProfySpace
            </span>
            <span
              className={`rounded-md px-1.5 py-0.5 text-xs font-extrabold shadow-sm ${
                role === "ADMIN"
                  ? "bg-[#72d6bf] text-[#101b2d]"
                  : role === "TEACHER"
                  ? "bg-[#0d8d78] text-white"
                  : "bg-[#0d8d78] text-white"
              }`}
            >
              {role === "ADMIN" ? ".admin" : ".tn"}
            </span>
          </Link>

          {role === "TEACHER" && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[#e5f7f2] border border-[#0d8d78]/25 px-2.5 py-0.5 text-[11px] font-bold text-[#0d8d78]">
              <IconTeacher className="h-3 w-3" />
              <span>Espace Enseignant</span>
            </span>
          )}

          {role === "STUDENT" && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
              <span>Espace Élève</span>
            </span>
          )}
        </div>

        {/* ========================================================================= */}
        {/* DESKTOP NAVIGATION: ROLE-SPECIFIC HEADERS (Strictly adhering to Rule 8)    */}
        {/* ========================================================================= */}

        {/* 1. STUDENT HEADER LINKS */}
        {!loading && role === "STUDENT" && (
          <div className="hidden items-center gap-6 text-xs lg:text-sm md:flex">
            <Link href="/" className={linkBaseClass("/")}>
              Accueil
            </Link>
            <Link href="/teachers" className={linkBaseClass("/teachers")}>
              Professeurs
            </Link>
            <Link href="/courses" className={linkBaseClass("/courses")}>
              Cours
            </Link>
            <Link href="/dashboard/messages" className={linkBaseClass("/dashboard/messages")}>
              Messages
            </Link>
            <Link href="/dashboard/calendar" className={linkBaseClass("/dashboard/calendar")}>
              Réservations
            </Link>
            <Link href="/dashboard/classes" className={linkBaseClass("/dashboard/classes")}>
              Mes Cours
            </Link>
            <Link href="/dashboard/homework" className={linkBaseClass("/dashboard/homework")}>
              Devoirs
            </Link>
            <Link href="/dashboard/favorites" className={linkBaseClass("/dashboard/favorites")}>
              Favoris
            </Link>
          </div>
        )}

        {/* 2. PROFESSOR HEADER LINKS */}
        {!loading && role === "TEACHER" && (
          <div className="hidden items-center gap-5 text-xs lg:text-sm md:flex">
            <Link href="/" className={linkBaseClass("/")}>
              Accueil
            </Link>
            <Link href="/teacher/dashboard" className={linkBaseClass("/teacher/dashboard")}>
              Dashboard
            </Link>
            <Link href="/teacher/dashboard/profile" className={linkBaseClass("/teacher/dashboard/profile")}>
              Mon Profil
            </Link>
            <Link href="/teacher/dashboard/courses" className={linkBaseClass("/teacher/dashboard/courses")}>
              Mes Cours
            </Link>
            <Link href="/teacher/dashboard/students" className={linkBaseClass("/teacher/dashboard/students")}>
              Élèves
            </Link>
            <Link href="/teacher/dashboard/messages" className={linkBaseClass("/teacher/dashboard/messages")}>
              Messages
            </Link>
            <Link href="/teacher/dashboard/homework" className={linkBaseClass("/teacher/dashboard/homework")}>
              Devoirs
            </Link>
            <Link href="/teacher/dashboard/calendar" className={linkBaseClass("/teacher/dashboard/calendar")}>
              Planning
            </Link>
            <Link href="/teacher/dashboard/earnings" className={linkBaseClass("/teacher/dashboard/earnings")}>
              Gains
            </Link>
          </div>
        )}

        {/* 3. ADMIN HEADER LINKS */}
        {!loading && role === "ADMIN" && (
          <div className="hidden items-center gap-4 text-xs font-semibold lg:flex text-slate-300">
            <Link href="/admin" className={linkBaseClass("/admin")}>
              Dashboard
            </Link>
            <Link href="/admin/users" className={linkBaseClass("/admin/users")}>
              Utilisateurs
            </Link>
            <Link href="/admin/teacher-verifications" className={linkBaseClass("/admin/teacher-verifications")}>
              Vérifications
            </Link>
            <Link href="/admin/teachers" className={linkBaseClass("/admin/teachers")}>
              Professeurs
            </Link>
            <Link href="/admin/students" className={linkBaseClass("/admin/students")}>
              Élèves
            </Link>
            <Link href="/admin/news" className={linkBaseClass("/admin/news")}>
              Actualités
            </Link>
            <Link href="/admin/bookings" className={linkBaseClass("/admin/bookings")}>
              Réservations
            </Link>
            <Link href="/admin/wallets" className={linkBaseClass("/admin/wallets")}>
              Paiements
            </Link>
            <Link href="/admin/notifications" className={linkBaseClass("/admin/notifications")}>
              Notifications
            </Link>
            <Link href="/admin/settings" className={linkBaseClass("/admin/settings")}>
              Paramètres
            </Link>
          </div>
        )}

        {/* 4. PUBLIC HEADER LINKS (When user is not authenticated) */}
        {!loading && !user && (
          <div className={`hidden items-center gap-7 text-xs lg:text-sm md:flex ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            <Link href="/teachers" className="hover:text-[#0d8d78] transition duration-150">
              Explorer les professeurs
            </Link>
            <Link href="/subjects" className="hover:text-[#0d8d78] transition duration-150">
              Matières
            </Link>
            <Link href="/courses" className="hover:text-[#0d8d78] transition duration-150">
              Cours & Packs
            </Link>
            <Link href="/#how" className="hover:text-[#0d8d78] transition duration-150">
              Comment ça marche
            </Link>
            <Link href="/register?role=TEACHER" className="hover:text-[#0d8d78] font-bold text-[#0d8d78] transition duration-150">
              Devenir professeur
            </Link>
          </div>
        )}

        {/* ========================================================================= */}
        {/* RIGHT ACTIONS: NOTIFICATIONS + THEME TOGGLE + ROLE PROFILE MENU            */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle (Desktop Pill & Mobile Compact) */}
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <div className="sm:hidden">
            <ThemeToggle compact={true} />
          </div>

          {!loading && user && (
            <NotificationCenter dark={isDark} />
          )}

          {!loading && user ? (
            <div className="relative" ref={dropdownRef}>
              {/* Profile Menu Trigger */}
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className={`flex items-center gap-2 rounded-2xl px-3 py-1.5 text-xs font-bold transition shadow-xs ${
                  isDark
                    ? "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                    : "bg-[#e5f7f2] text-[#0d8d78] hover:bg-[#d4f2e9] border border-[#0d8d78]/25"
                }`}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0d8d78] text-white text-[11px] font-bold">
                  {user.firstName ? user.firstName.charAt(0).toUpperCase() : "U"}
                </div>
                <span className="max-w-[110px] truncate hidden sm:inline">
                  {user.firstName}
                </span>
                <IconChevronDown className="h-3.5 w-3.5 opacity-70" />
              </button>

              {/* Profile Menu Dropdown */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 p-2 shadow-2xl text-[#11233f] z-50 animate-fade-in">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="font-bold text-xs truncate">{user.firstName} {user.lastName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    <span className="mt-1.5 inline-block rounded-md bg-[#e5f7f2] px-2 py-0.5 text-[10px] font-bold text-[#0d8d78]">
                      {role === "ADMIN" ? "Administrateur" : role === "TEACHER" ? "Professeur" : "Élève"}
                    </span>
                  </div>

                  <div className="py-1 space-y-0.5 text-xs font-semibold">
                    {role === "STUDENT" && (
                      <>
                        <Link
                          href="/dashboard"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-slate-50 transition"
                        >
                          <IconUser className="h-4 w-4 text-[#0d8d78]" />
                          <span>Mon Espace Élève</span>
                        </Link>
                        <Link
                          href="/dashboard/settings"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-slate-50 transition"
                        >
                          <IconSettings className="h-4 w-4 text-slate-500" />
                          <span>Paramètres du compte</span>
                        </Link>
                      </>
                    )}

                    {role === "TEACHER" && (
                      <>
                        <Link
                          href="/teacher/dashboard"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-slate-50 transition"
                        >
                          <IconTeacher className="h-4 w-4 text-[#0d8d78]" />
                          <span>Dashboard Enseignant</span>
                        </Link>
                        <Link
                          href="/teacher/dashboard/settings"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-slate-50 transition"
                        >
                          <IconSettings className="h-4 w-4 text-slate-500" />
                          <span>Paramètres Enseignant</span>
                        </Link>
                      </>
                    )}

                    {role === "ADMIN" && (
                      <>
                        <Link
                          href="/admin"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-slate-50 transition"
                        >
                          <IconShield className="h-4 w-4 text-[#0d8d78]" />
                          <span>Console Admin</span>
                        </Link>
                        <Link
                          href="/admin/settings"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-slate-50 transition"
                        >
                          <IconSettings className="h-4 w-4 text-slate-500" />
                          <span>Paramètres Plateforme</span>
                        </Link>
                      </>
                    )}
                  </div>

                  <div className="pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
                    >
                      <IconLogout className="h-4 w-4" />
                      <span>Se déconnecter</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/login"
                className={`text-xs sm:text-sm font-semibold px-3 py-2 transition duration-200 ${
                  isDark ? "text-slate-300 hover:text-white" : "text-slate-700 hover:text-slate-900"
                }`}
              >
                Se connecter
              </Link>
              <Link
                href="/register"
                className="rounded-2xl bg-[#0d8d78] px-5 py-2.5 text-xs sm:text-sm font-bold text-white transition duration-300 shadow-md hover:bg-[#0b7866] hover:shadow-[#0d8d78]/20"
              >
                S’inscrire
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-2 rounded-xl md:hidden transition ${
              isDark ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"
            }`}
            aria-label="Menu Mobile"
          >
            {mobileMenuOpen ? <IconX className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* MOBILE DRAWER: ROLE-SPECIFIC DRAWER NAVIGATION                            */}
      {/* ========================================================================= */}
      {mobileMenuOpen && (
        <div
          className={`md:hidden px-6 py-5 border-b backdrop-blur-xl ${
            isDark ? "bg-[#101b2d]/95 border-white/10 text-white" : "bg-white/95 border-slate-200 text-[#11233f]"
          }`}
        >
          <div className="flex items-center justify-between py-2 border-b border-slate-200/20 mb-3">
            <span className="text-xs font-bold opacity-80">Mode d'affichage</span>
            <ThemeToggle />
          </div>

          <div className="flex flex-col space-y-3 text-xs sm:text-sm font-bold">
            {/* Student Mobile Links */}
            {user && role === "STUDENT" && (
              <>
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Accueil
                </Link>
                <Link href="/teachers" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Explorer les professeurs
                </Link>
                <Link href="/courses" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Cours & Packs
                </Link>
                <Link href="/dashboard/messages" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Messagerie & Discussions
                </Link>
                <Link href="/dashboard/calendar" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Mes Réservations
                </Link>
                <Link href="/dashboard/classes" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Mes Cours & Replays
                </Link>
                <Link href="/dashboard/homework" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Mes Devoirs
                </Link>
                <Link href="/dashboard/favorites" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Mes Professeurs Favoris
                </Link>
                <Link href="/dashboard/settings" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Paramètres du compte
                </Link>
              </>
            )}

            {/* Professor Mobile Links */}
            {user && role === "TEACHER" && (
              <>
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Accueil
                </Link>
                <Link href="/teacher/dashboard" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Tableau de bord
                </Link>
                <Link href="/teacher/dashboard/profile" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Mon Profil Enseignant
                </Link>
                <Link href="/teacher/dashboard/courses" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Mes Cours & Formations
                </Link>
                <Link href="/teacher/dashboard/students" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Mes Élèves
                </Link>
                <Link href="/teacher/dashboard/messages" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Messagerie
                </Link>
                <Link href="/teacher/dashboard/homework" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Devoirs
                </Link>
                <Link href="/teacher/dashboard/calendar" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Planning & Disponibilités
                </Link>
                <Link href="/teacher/dashboard/earnings" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Gains & Retraits
                </Link>
                <Link href="/teacher/dashboard/settings" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Paramètres Enseignant
                </Link>
              </>
            )}

            {/* Admin Mobile Links */}
            {user && role === "ADMIN" && (
              <>
                <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Dashboard Super-Admin
                </Link>
                <Link href="/admin/teacher-verifications" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Vérification Candidatures
                </Link>
                <Link href="/admin/users" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Gestion Utilisateurs
                </Link>
                <Link href="/admin/teachers" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Annuaire Professeurs
                </Link>
                <Link href="/admin/news" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Actualités Homepage
                </Link>
                <Link href="/admin/wallets" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Dépôts & Wallets
                </Link>
                <Link href="/admin/withdrawals" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Retraits Enseignants
                </Link>
                <Link href="/admin/notifications" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Diffuser une notification
                </Link>
                <Link href="/admin/settings" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Paramètres Plateforme
                </Link>
              </>
            )}

            {/* Public Mobile Links */}
            {!user && (
              <>
                <Link href="/teachers" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Explorer les professeurs
                </Link>
                <Link href="/subjects" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Matières
                </Link>
                <Link href="/levels" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Niveaux scolaires
                </Link>
                <Link href="/courses" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Cours & Packs
                </Link>
                <Link href="/#how" onClick={() => setMobileMenuOpen(false)} className="py-1">
                  Comment ça marche
                </Link>
                <Link href="/register?role=TEACHER" onClick={() => setMobileMenuOpen(false)} className="py-1 text-[#0d8d78]">
                  Devenir professeur
                </Link>
              </>
            )}

            {/* Bottom Actions in Drawer */}
            <div className="pt-3 border-t border-slate-200/20 flex flex-col gap-2">
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-center py-2.5 rounded-2xl border border-rose-200 text-rose-600 font-bold text-xs hover:bg-rose-50"
                >
                  Se déconnecter
                </button>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-2xl border border-slate-300 font-bold text-xs"
                  >
                    Se connecter
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-2xl bg-[#0d8d78] text-white font-bold text-xs shadow-md"
                  >
                    S'inscrire
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
