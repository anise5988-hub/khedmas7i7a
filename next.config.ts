import type { NextConfig } from "next";

function supabaseImageHostname(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").hostname || null;
  } catch {
    return null;
  }
}

const supabaseHostname = supabaseImageHostname();

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), display-capture=(self), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...(supabaseHostname
        ? [{ protocol: "https" as const, hostname: supabaseHostname, pathname: "/storage/v1/object/public/**" }]
        : []),
      { protocol: "https" as const, hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Les fichiers de /public (logos, illustrations, polices locales)
        // n'avaient aucune politique de cache : le navigateur les
        // revalideait à chaque navigation. Sur une connexion mobile lente,
        // c'est un aller-retour réseau évitable à chaque page.
        // immutable est sûr ici : ces fichiers portent un nom stable mais ne
        // changent qu'avec un déploiement, et on les sert avec un ETag.
        source: "/:path*.(png|jpg|jpeg|gif|webp|avif|svg|ico|woff|woff2|ttf)",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
