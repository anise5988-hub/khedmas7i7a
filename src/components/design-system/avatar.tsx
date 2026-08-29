/* eslint-disable @next/next/no-img-element */
"use client";

type AvatarProps = {
  src?: string | null;
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  online?: boolean;
  className?: string;
};

export function Avatar({
  src,
  name,
  size = "md",
  online,
  className = "",
}: AvatarProps) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  const sizeStyles = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-14 w-14 text-base",
    xl: "h-20 w-20 text-2xl",
  }[size];

  const badgeSizeStyles = {
    xs: "h-2 w-2",
    sm: "h-2.5 w-2.5",
    md: "h-3 w-3",
    lg: "h-3.5 w-3.5",
    xl: "h-4 w-4",
  }[size];

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div
        className={`
          flex items-center justify-center rounded-2xl font-bold
          overflow-hidden border border-slate-200/60
          bg-gradient-to-br from-[#d9f1e9] to-[#bce8dc] text-[#0d8d78]
          ${sizeStyles}
        `}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      {online !== undefined && (
        <span
          className={`
            absolute bottom-0 right-0 rounded-full ring-2 ring-white
            ${online ? "bg-emerald-500" : "bg-slate-400"}
            ${badgeSizeStyles}
          `}
        />
      )}
    </div>
  );
}
