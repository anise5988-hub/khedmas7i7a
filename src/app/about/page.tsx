import type { Metadata } from "next";
import { AboutPageClient } from "./about-client";

export const metadata: Metadata = {
  title: "À propos | ProfySpace.tn",
  description: "ProfySpace.tn est la marketplace tunisienne de cours particuliers, connectant élèves et professeurs vérifiés partout en Tunisie.",
};

export default function AboutPage() {
  return <AboutPageClient />;
}
