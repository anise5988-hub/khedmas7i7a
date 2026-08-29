"use client";

import { type ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
};

export function Card({ children, className = "", hover = false, padding = "md" }: CardProps) {
  const paddingStyles = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      className={`
        rounded-3xl border border-slate-200 bg-white shadow-sm
        transition-all duration-300
        ${hover ? "hover:-translate-y-1 hover:shadow-xl hover:border-[#72d6bf]/30" : ""}
        ${paddingStyles[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
