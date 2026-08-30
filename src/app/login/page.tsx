import type { Metadata } from "next";
import { LoginPageClient } from "./login-client";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à votre espace élève ou professeur ProfySpace.tn.",
};

export default function LoginPage() {
  return <LoginPageClient />;
}
