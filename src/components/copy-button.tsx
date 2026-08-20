"use client";

import { useState } from "react";
import { IconCopy, IconCheck } from "./icons";

export function CopyButton({
  text,
  label = "Copier",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copier dans le presse-papier"
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition duration-200 active:scale-95 ${
        copied
          ? "bg-emerald-500 text-white shadow-sm"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200"
      } ${className}`}
    >
      {copied ? (
        <>
          <IconCheck className="h-3.5 w-3.5" />
          <span>Copié !</span>
        </>
      ) : (
        <>
          <IconCopy className="h-3.5 w-3.5 text-slate-500" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
