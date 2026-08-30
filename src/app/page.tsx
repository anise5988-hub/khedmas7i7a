import type { Metadata } from "next";
import { HomePageClient } from "./home-client";

export const metadata: Metadata = {
  title: "ProfySpace.tn | Cours particuliers en ligne et présentiel en Tunisie",
  description:
    "Trouvez un professeur particulier certifié en Tunisie pour le primaire, le collège, le lycée et le Baccalauréat. Classe virtuelle HD, paiement D17 & Flouci, profils 100% vérifiés.",
};

export default function Home() {
  return <HomePageClient />;
}
