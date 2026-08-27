import type { Metadata } from "next";
import { ContactPageClient } from "./contact-client";

export const metadata: Metadata = {
  title: "Contact | ProfySpace.tn",
  description: "Contacte l'équipe ProfySpace.tn pour toute question sur les cours particuliers, les paiements ou ton compte.",
};

export default function ContactPage() {
  return <ContactPageClient />;
}
