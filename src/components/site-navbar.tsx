/* eslint-disable @next/next/no-location-assign-relative-destination */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconUser, IconLogout } from "./icons";

type UserSession = {
  id: string;
  firstName: string;
  lastName: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
};

export function SiteNavbar({ dark = false }: { dark?: boolean }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  const dashboardUrl =
    user?.role === "TEACHER"
      ? "/teacher/dashboard"
      : user?.role === "ADMIN"
      ? "/admin"
      : "/dashboard";

  return (
    <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
      <Link href="/" className="font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-[-.06em]">
        <span className={dark ? "text-white" : "text-[#11233f]"}>profy</span>
        <span className={dark ? "text-[#72d6bf]" : "text-[#0d8d78]"}>.tn</span>
      </Link>

      <div className={`hidden items-center gap-8 text-sm font-semibold md:flex ${dark ? "text-slate-300" : "text-slate-600"}`}>
        <Link href="/teachers" className="hover:text-[#0d8d78] transition">
          Explorer les professeurs
        </Link>
        <Link href="/#how" className="hover:text-[#0d8d78] transition">
          Comment ça marche
        </Link>
        <Link href="/teacher/onboarding" className="hover:text-[#0d8d78] transition">
          Devenir professeur
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {!loading && user ? (
          <div className="flex items-center gap-3">
            <Link
              href={dashboardUrl}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-bold shadow-sm transition ${
                dark
                  ? "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                  : "bg-[#e5f7f2] text-[#0d8d78] hover:bg-[#d4f2e9] border border-[#0d8d78]/20"
              }`}
            >
              <IconUser className="h-4 w-4" />
              <span>{user.firstName} (Mon Espace)</span>
            </Link>

            <button
              onClick={handleLogout}
              title="Se déconnecter"
              className={`rounded-full p-2 text-xs transition ${
                dark
                  ? "bg-white/10 text-slate-300 hover:text-white hover:bg-white/20"
                  : "bg-slate-100 text-slate-600 hover:text-rose-600 hover:bg-rose-50"
              }`}
            >
              <IconLogout className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <Link
              href="/login"
              className={`text-xs sm:text-sm font-semibold transition ${
                dark ? "text-slate-300 hover:text-white" : "text-slate-700 hover:text-slate-900"
              }`}
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              className={`rounded-full px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold transition duration-300 shadow-md ${
                dark
                  ? "bg-[#72d6bf] text-[#11233f] hover:bg-[#5ec4ad]"
                  : "bg-[#0d8d78] text-white hover:bg-[#0b7866]"
              }`}
            >
              S’inscrire
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
