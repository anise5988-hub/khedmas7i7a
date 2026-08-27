import type { Metadata } from "next";
import { TeachersPageClient } from "./teachers-client";

export const metadata: Metadata = {
  title: "Trouver un professeur particulier | ProfySpace.tn",
  description: "Parcours des centaines de professeurs particuliers vérifiés en Tunisie. Filtre par matière, niveau, section du Bac, gouvernorat, prix et disponibilité.",
};

export default function TeachersPage() {
  return <TeachersPageClient />;
}
