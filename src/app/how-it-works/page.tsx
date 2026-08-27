import type { Metadata } from "next";
import { HowItWorksPageClient } from "./how-it-works-client";

export const metadata: Metadata = {
  title: "Comment ça marche | ProfySpace.tn",
  description: "Découvre en 3 étapes comment réserver une séance avec un professeur particulier vérifié sur ProfySpace.tn.",
};

export default function HowItWorksPage() {
  return <HowItWorksPageClient />;
}
