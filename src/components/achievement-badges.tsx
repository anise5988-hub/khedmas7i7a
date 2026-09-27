"use client";

import { useEffect, useState } from "react";
import { IconStar, IconCheckCircle } from "@/components/icons";

type Achievement = {
  slug: string;
  title: string;
  description: string;
  earned: boolean;
};

export function AchievementBadges({ endpoint }: { endpoint: "/api/dashboard/achievements" | "/api/teacher/dashboard/achievements" }) {
  const [achievements, setAchievements] = useState<Achievement[] | null>(null);

  useEffect(() => {
    fetch(endpoint)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data?.achievements)) setAchievements(data.achievements);
      })
      .catch(() => {});
  }, [endpoint]);

  if (!achievements) return null;

  const earnedCount = achievements.filter((a) => a.earned).length;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[.05] sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Vos badges</p>
          <h3 className="mt-1 text-base font-bold text-[#11233f] dark:text-white">
            {earnedCount} / {achievements.length} débloqués
          </h3>
        </div>
        <IconStar className="h-6 w-6 fill-amber-400 text-amber-400" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {achievements.map((a) => (
          <div
            key={a.slug}
            className={`flex items-start gap-3 rounded-2xl border p-3.5 transition ${
              a.earned
                ? "border-[#72d6bf]/40 bg-[#e5f7f2] dark:bg-[#72d6bf]/15 dark:border-[#72d6bf]/30"
                : "border-slate-100 bg-slate-50 opacity-60 dark:bg-white/[.03] dark:border-white/10"
            }`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                a.earned
                  ? "bg-[#0d8d78] text-white"
                  : "bg-slate-200 text-slate-400 dark:bg-white/10 dark:text-slate-500"
              }`}
            >
              <IconCheckCircle className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-bold ${a.earned ? "text-[#0d8d78] dark:text-[#72d6bf]" : "text-slate-500 dark:text-slate-400"}`}>
                {a.title}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{a.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
