/* eslint-disable @next/next/no-location-assign-relative-destination */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconUser, IconLogout } from "./icons";
import { NotificationCenter } from "./notification-center";
import { supabase } from "@/lib/client/supabase";

type UserSession = {
  id: string;
  firstName: string;
  lastName: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
};

export function SiteNavbar({ dark = false }: { dark?: boolean }) {
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
        } else {
          setUser(null);
          localStorage.removeItem("profyspace_user");
          localStorage.removeItem("profyspace_user_id");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
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

  const dashboardUrl =
    user?.role === "TEACHER"
      ? "/teacher/dashboard"
      : user?.role === "ADMIN"
      ? "/admin"
      : "/dashboard";

  return (
    <header className="relative w-full z-30">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-4 lg:px-10">
        <Link
          href="/"
          className="group flex items-center gap-1.5 font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-tight transition duration-200"
        >
          <span className={dark ? "text-white group-hover:text-slate-100" : "text-[#11233f] group-hover:text-[#0d8d78]"}>
            ProfySpace
          </span>
          <span className="rounded-md bg-[#0d8d78] px-1.5 py-0.5 text-xs font-extrabold text-white shadow-sm">
            .tn
          </span>
        </Link>

        {/* Desktop Links */}
        <div className={`hidden items-center gap-8 text-sm font-semibold md:flex ${dark ? "text-slate-300" : "text-slate-600"}`}>
          <Link href="/teachers" className="hover:text-[#0d8d78] transition duration-200">
            Explorer les professeurs
          </Link>
          <Link href="/#how" className="hover:text-[#0d8d78] transition duration-200">
            Comment ça marche
          </Link>
          {(!user || user.role === "TEACHER") && (
            <Link href="/register?role=TEACHER" className="hover:text-[#0d8d78] transition duration-200">
              Devenir professeur
            </Link>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {!loading && user && (
            <div className="flex md:hidden items-center">
              <NotificationCenter dark={dark} />
            </div>
          )}

          {!loading && user ? (
            <div className="hidden md:flex items-center gap-2 sm:gap-3">
              <NotificationCenter dark={dark} />
              <Link
                href={dashboardUrl}
                className={`flex items-center gap-2 rounded-2xl px-3.5 py-2 text-xs sm:text-sm font-bold shadow-sm transition duration-200 ${
                  dark
                    ? "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                    : "bg-[#e5f7f2] text-[#0d8d78] hover:bg-[#d4f2e9] border border-[#0d8d78]/25"
                }`}
              >
                <IconUser className="h-4 w-4 shrink-0 text-[#0d8d78]" />
                <span className="truncate">{user.firstName} (Mon Espace)</span>
              </Link>
              <button
                onClick={handleLogout}
                title="Se déconnecter"
                className={`rounded-xl p-2 text-xs transition duration-200 ${
                  dark
                    ? "bg-white/10 text-slate-300 hover:text-white hover:bg-white/20"
                    : "bg-slate-100 text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200"
                }`}
              >
                <IconLogout className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/login"
                className={`text-xs sm:text-sm font-semibold px-3 py-2 transition duration-200 ${
                  dark ? "text-slate-300 hover:text-white" : "text-slate-700 hover:text-slate-900"
                }`}
              >
                Se connecter
              </Link>
              <Link
                href="/register"
                className={`rounded-2xl px-5 py-2.5 text-xs sm:text-sm font-bold transition duration-300 shadow-md ${
                  dark
                    ? "bg-[#72d6bf] text-[#11233f] hover:bg-[#5ec4ad] hover:shadow-[#72d6bf]/20"
                    : "bg-[#0d8d78] text-white hover:bg-[#0b7866] hover:shadow-[#0d8d78]/20"
                }`}
              >
                S’inscrire
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-2 rounded-xl md:hidden transition ${
              dark ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"
            }`}
            aria-label="Menu Mobile"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {mobileMenuOpen ? (
                <path d="M18 6 6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className={`md:hidden px-6 py-5 border-b backdrop-blur-xl ${
          dark ? "bg-[#101b2d]/95 border-white/10 text-white" : "bg-white/95 border-slate-200 text-[#11233f]"
        }`}>
          <div className="flex flex-col space-y-3.5 text-sm font-bold">
            <Link
              href="/teachers"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#0d8d78] transition"
            >
              Explorer les professeurs
            </Link>
            <Link
              href="/#how"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#0d8d78] transition"
            >
              Comment ça marche
            </Link>
            {(!user || user.role === "TEACHER") && (
              <Link
                href="/register?role=TEACHER"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-[#0d8d78] transition"
              >
                Devenir professeur
              </Link>
            )}

            {user ? (
              <div className="pt-3 border-t border-slate-200/20 flex flex-col gap-2">
                <Link
                  href={dashboardUrl}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full text-center py-2.5 rounded-2xl bg-[#0d8d78] text-white font-bold text-xs shadow-md"
                >
                  <IconUser className="h-4 w-4" />
                  <span>Mon Espace ({user.firstName})</span>
                </Link>
                <Link
                  href="/dashboard/messages"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-2xl bg-[#e5f7f2] text-[#0d8d78] font-bold text-xs border border-[#0d8d78]/20"
                >
                  💬 Messagerie / Discussions
                </Link>
                <Link
                  href="/dashboard/notifications"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-2xl border border-slate-200 font-bold text-xs"
                >
                  🔔 Centre de Notifications
                </Link>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-2xl border border-slate-300 font-bold text-xs"
                >
                  Paramètres du compte
                </Link>
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
              </div>
            ) : (
              <div className="pt-3 border-t border-slate-200/20 flex flex-col gap-2">
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
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
