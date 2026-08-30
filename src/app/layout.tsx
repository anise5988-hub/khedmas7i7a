import type { Metadata } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import "./globals.css";
import { ChatWidget } from "@/components/chat-widget";
import { AiTeacherFinder } from "@/components/ai-teacher-finder";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://profyspace.online";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ProfySpace.tn | Trouve le professeur qui te correspond",
    template: "%s | ProfySpace.tn",
  },
  description: "La marketplace tunisienne moderne pour trouver, réserver et apprendre avec les meilleurs professeurs particuliers, du primaire au Baccalauréat.",
  keywords: ["cours particuliers Tunisie", "professeur particulier", "Baccalauréat Tunisien", "soutien scolaire", "cours en ligne Tunisie", "classe virtuelle", "ProfySpace"],
  openGraph: {
    type: "website",
    locale: "fr_TN",
    url: siteUrl,
    siteName: "ProfySpace.tn",
    title: "ProfySpace.tn | Trouve le professeur qui te correspond",
    description: "La marketplace tunisienne moderne pour trouver, réserver et apprendre avec les meilleurs professeurs particuliers.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ProfySpace.tn | Trouve le professeur qui te correspond",
    description: "La marketplace tunisienne moderne pour trouver, réserver et apprendre avec les meilleurs professeurs particuliers.",
  },
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${manrope.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <AiTeacherFinder />
        <ChatWidget />
      </body>
    </html>
  );
}
