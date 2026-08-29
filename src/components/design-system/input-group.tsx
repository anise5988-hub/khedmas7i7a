"use client";

import { type ReactNode } from "react";

type InputProps = {
  label?: string;
  error?: string;
  hint?: string;
  children?: ReactNode;
  className?: string;
};

export function InputGroup({ label, error, hint, children, className = "" }: InputProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {label}
        </label>
      )}
      {children}
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
