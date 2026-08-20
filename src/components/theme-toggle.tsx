"use client";

import { useEffect, useState } from "react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const saved = localStorage.getItem("profyspace_theme") as "light" | "dark" | null;
    if (saved) return saved;
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    return "light";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("profyspace_theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === "light" ? "Passer en mode sombre" : "Passer en mode clair"}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition duration-200 border ${
        theme === "dark"
          ? "bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700 shadow-sm"
          : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 shadow-sm"
      } ${className}`}
    >
      <span>{theme === "dark" ? "🌙" : "☀️"}</span>
      <span className="hidden sm:inline">{theme === "dark" ? "Nuit" : "Jour"}</span>
    </button>
  );
}
