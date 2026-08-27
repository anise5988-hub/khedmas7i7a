import type { Metadata } from "next";
import { FaqPageClient } from "./faq-client";

export const metadata: Metadata = {
  title: "Foire aux questions | ProfySpace.tn",
  description: "Réponses aux questions fréquentes sur la réservation, la classe virtuelle, les paiements en Tunisie et l'inscription des professeurs sur ProfySpace.tn.",
};

export default function FaqPage() {
  return <FaqPageClient />;
}
