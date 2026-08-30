import type { Metadata } from "next";
import { RegisterPageClient } from "./register-client";

export const metadata: Metadata = {
  title: "Inscription",
  description: "Créez votre compte ProfySpace.tn pour réserver vos cours particuliers ou proposer vos enseignements.",
};

export default function RegisterPage() {
  return <RegisterPageClient />;
}
