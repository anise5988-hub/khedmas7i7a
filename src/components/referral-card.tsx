"use client";

import { useState } from "react";
import { IconGift, IconCopy, IconCheck } from "@/components/icons";

export function ReferralCard({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false);

  const referralLink = typeof window !== "undefined" ? `${window.location.origin}/register?ref=${userId}` : "";

  function copyLink() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-3xl border border-[#72d6bf]/30 bg-[#e5f7f2] p-6 sm:p-8 shadow-sm dark:border-[#72d6bf]/20 dark:bg-[#72d6bf]/10">
      <div className="flex items-center gap-3 border-b border-[#0d8d78]/10 pb-3 dark:border-[#72d6bf]/10">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0d8d78] text-white">
          <IconGift className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#11233f] dark:text-white">Parrainez un ami</h2>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Recevez 10 DT chacun dès que votre filleul complète sa première séance.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          readOnly
          value={referralLink}
          className="flex-1 rounded-xl border border-[#0d8d78]/20 bg-white p-3 text-xs text-[#11233f] outline-none dark:border-[#72d6bf]/20 dark:bg-[#0f1d32] dark:text-white"
        />
        <button
          type="button"
          onClick={copyLink}
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0d8d78] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#0b7866]"
        >
          {copied ? <IconCheck className="h-4 w-4" /> : <IconCopy className="h-4 w-4" />}
          {copied ? "Copié !" : "Copier le lien"}
        </button>
      </div>
    </div>
  );
}
