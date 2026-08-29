/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "@/components/icons";

export function ThemeToggle({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("profyspace_theme") as "light" | "dark" | null;
    if (saved) {
      setTheme(saved);
      if (saved === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      // Default to dark mode as preferred
      setTheme("dark");
      document.documentElement.classList.add("dark");
      localStorage.setItem("profyspace_theme", "dark");
    }

    // Listen for theme changes from other components/windows
    function handleStorage(e: StorageEvent) {
      if (e.key === "profyspace_theme" && (e.newValue === "light" || e.newValue === "dark")) {
        setTheme(e.newValue);
        if (e.newValue === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("profyspace_theme", nextTheme);

    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Dispatch custom event for immediate reactivity
    window.dispatchEvent(new CustomEvent("profyspace-theme-change", { detail: { theme: nextTheme } }));
  }

  if (!mounted) {
    return (
      <div className={`h-8 w-14 rounded-full bg-white/10 animate-pulse ${className}`} />
    );
  }

  const isDark = theme === "dark";

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
        title={isDark ? "Mode Sombre actif (Cliquer pour Mode Clair)" : "Mode Clair actif (Cliquer pour Mode Sombre)"}
        className={`relative flex h-8 w-8 items-center justify-center rounded-xl transition duration-300 active:scale-90 ${
          isDark
            ? "bg-white/10 text-amber-300 hover:bg-white/20 border border-white/20 shadow-xs"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300/80 shadow-xs"
        } ${className}`}
      >
        {isDark ? <IconMoon className="h-4 w-4" /> : <IconSun className="h-4 w-4 text-amber-500" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Désactiver mode sombre" : "Activer mode sombre"}
      title={isDark ? "Mode Sombre activé (Cliquer pour passer en blanc/clair)" : "Mode Clair activé (Cliquer pour passer en sombre)"}
      className={`group relative flex items-center gap-1.5 rounded-full p-1 transition-all duration-300 select-none shadow-xs border ${
        isDark
          ? "bg-[#101b2d] border-white/20 hover:border-[#72d6bf]/50 shadow-black/20"
          : "bg-slate-100 border-slate-300 hover:border-slate-400 shadow-slate-200"
      } ${className}`}
    >
      {/* Sliding Pill Thumb */}
      <div
        className={`flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-extrabold transition-all duration-300 ${
          isDark
            ? "bg-[#0d8d78] text-white shadow-xs"
            : "bg-white text-slate-800 shadow-xs"
        }`}
      >
        {isDark ? (
          <>
            <IconMoon className="h-3.5 w-3.5 text-[#72d6bf]" />
            <span className="hidden sm:inline">Nuit</span>
          </>
        ) : (
          <>
            <IconSun className="h-3.5 w-3.5 text-amber-500" />
            <span className="hidden sm:inline">Jour</span>
          </>
        )}
      </div>

      {/* Inactive Icon Hint on the other side */}
      <div className="px-1.5 text-slate-400 group-hover:text-slate-200 transition">
        {isDark ? (
          <IconSun className="h-3.5 w-3.5 text-slate-400 group-hover:text-amber-300 transition" />
        ) : (
          <IconMoon className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition" />
        )}
      </div>
    </button>
  );
}
