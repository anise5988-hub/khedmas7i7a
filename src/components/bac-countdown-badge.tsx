"use client";

import { useState } from "react";
import { IconClock } from "@/components/icons";

// Update this once the Ministère de l'Éducation announces the next
// Session Principale du Baccalauréat. Deliberately kept at month
// precision (not a specific day) since the exact date isn't confirmed —
// showing a fabricated exact day as fact would be misleading.
const BAC_SESSION_MONTH = new Date("2027-06-01T00:00:00+01:00");
const BAC_SESSION_YEAR = BAC_SESSION_MONTH.getFullYear();

function weeksUntil(target: Date): number {
  const diffMs = target.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 7)));
}

export function BacCountdownBadge() {
  const [weeks] = useState(() => weeksUntil(BAC_SESSION_MONTH));

  if (weeks === 0) {
    return (
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#72d6bf]/15 border border-[#72d6bf]/30 px-3 py-1.5 text-[11px] font-bold text-[#72d6bf]">
        Bonne chance à tous les candidats du Bac {BAC_SESSION_YEAR} !
      </div>
    );
  }

  return (
    <div className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#72d6bf]/15 border border-[#72d6bf]/30 px-3 py-1.5 text-[11px] font-bold text-[#72d6bf]">
      <IconClock className="h-3.5 w-3.5" />
      ≈ {weeks} semaines avant la session de Juin {BAC_SESSION_YEAR}
    </div>
  );
}
