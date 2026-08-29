"use client";

import { type ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  href?: string;
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  type = "button",
  onClick,
  href,
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-[#0d8d78] text-white hover:bg-[#0a7a68] focus-visible:ring-[#0d8d78] shadow-sm",
    secondary:
      "bg-[#72d6bf] text-[#101b2d] hover:bg-[#5ec4ad] focus-visible:ring-[#72d6bf]",
    outline:
      "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400",
    ghost:
      "text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400",
    danger:
      "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500",
  };

  const sizes = {
    sm: "px-3 py-2 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-base",
  };

  const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`;

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
