import type { Metadata } from "next";
import { CoursesCatalogPageClient } from "./courses-client";

export const metadata: Metadata = {
  title: "Cours & Packs de révision | ProfySpace.tn",
  description: "Cours vidéo et packs de révision pour le programme tunisien, du collège au Baccalauréat, créés par des enseignants vérifiés.",
};

export default function CoursesPage() {
  return <CoursesCatalogPageClient />;
}
