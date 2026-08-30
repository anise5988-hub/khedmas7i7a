import type { Metadata } from "next";
import { SupportPageClient } from "./support-client";

export const metadata: Metadata = {
  title: "Centre d'aide",
  description: "Besoin d'aide ? Ouvrez un ticket et notre équipe ProfySpace.tn vous répond avec un suivi clair.",
};

export default function SupportPage() {
  return <SupportPageClient />;
}
