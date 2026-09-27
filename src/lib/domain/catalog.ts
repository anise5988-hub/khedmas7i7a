export type EducationCycle = "PRIMARY" | "BASIC" | "SECONDARY" | "UNIVERSITY" | "PROFESSIONAL";

export type CatalogItem = {
  slug: string;
  name: string;
  cycle: EducationCycle;
};

export const educationLevels: CatalogItem[] = [
  ...["1ère année", "2ème année", "3ème année", "4ème année", "5ème année", "6ème année"].map((year, index) => ({ slug: `primaire-${index + 1}`, name: `${year} primaire`, cycle: "PRIMARY" as const })),
  ...[7, 8, 9].map((year) => ({ slug: `base-${year}`, name: `${year}ème année de base (Collège)`, cycle: "BASIC" as const })),
  ...[1, 2, 3].map((year) => ({ slug: `secondaire-${year}`, name: `${year}ème année secondaire`, cycle: "SECONDARY" as const })),
  { slug: "bac", name: "Baccalauréat (Bac)", cycle: "SECONDARY" },
  { slug: "universite", name: "Enseignement Supérieur (Université)", cycle: "UNIVERSITY" },
  { slug: "formation-professionnelle", name: "Formation Professionnelle", cycle: "PROFESSIONAL" },
];

export const academicSections = [
  "Mathématiques",
  "Sciences expérimentales",
  "Économie et Gestion",
  "Sciences de l'informatique",
  "Sciences techniques",
  "Lettres",
  "Sport",
] as const;

export const subjects = [
  "العربية",
  "الفرنسية",
  "الرياضيات",
  "الإيقاظ العلمي",
  "التربية الإسلامية",
  "التربية المدنية",
  "التربية التكنولوجية",
  "التربية البدنية",
  "التربية الفنية",
  "التربية الموسيقية",
  "Français",
  "English",
  "Mathématiques",
  "Physique",
  "Sciences physiques",
  "SVT",
  "Informatique",
  "Algorithmique",
  "Programmation",
  "Technologie",
  "Histoire",
  "Géographie",
  "Philosophie",
  "Économie",
  "Gestion",
  "Comptabilité",
  "Éducation islamique",
  "Éducation civique",
  "Éducation artistique",
  "Éducation musicale",
  "Éducation physique",
] as const;

export const governorates = [
  "Tunis", "Ariana", "Ben Arous", "Manouba", "Nabeul", "Bizerte", "Béja", "Jendouba", "Le Kef", "Siliana", "Kairouan", "Kasserine", "Sidi Bouzid", "Sousse", "Monastir", "Mahdia", "Sfax", "Gabès", "Medenine", "Tataouine", "Gafsa", "Tozeur", "Kebili", "Zaghouan",
] as const;
/**
 * Display metadata for a cycle. Kept next to educationLevels so any surface
 * that groups levels (teacher profile, directory) labels cycles identically.
 */
export const levelCycleLabels: Record<EducationCycle, string> = {
  PRIMARY: "Primaire",
  BASIC: "Collège",
  SECONDARY: "Secondaire",
  UNIVERSITY: "Supérieur",
  PROFESSIONAL: "Formation professionnelle",
};

const levelBySlug = new Map(educationLevels.map((l) => [l.slug, l]));

/**
 * Human-readable label for a level slug. Returns null for an unknown slug so
 * callers can drop it rather than printing a raw slug like "secondaire-2" to
 * the public.
 */
export function levelLabel(slug: string): string | null {
  return levelBySlug.get(slug)?.name ?? null;
}

/**
 * Sorts level slugs for display: by cycle in official school order, then by
 * the catalogue's own order within that cycle (1ère → 6ème, etc.).
 * Unknown slugs are ignored.
 */
export function sortLevelSlugs(slugs: string[]): string[] {
  const cycleOrder: EducationCycle[] = ["PRIMARY", "BASIC", "SECONDARY", "UNIVERSITY", "PROFESSIONAL"];
  const rank = new Map(educationLevels.map((l, index) => [l.slug, index]));
  return [...new Set(slugs)]
    .filter((slug) => levelBySlug.has(slug))
    .sort((a, b) => {
      const cycleA = cycleOrder.indexOf(levelBySlug.get(a)!.cycle);
      const cycleB = cycleOrder.indexOf(levelBySlug.get(b)!.cycle);
      if (cycleA !== cycleB) return cycleA - cycleB;
      return rank.get(a)! - rank.get(b)!;
    });
}

/**
 * Groups level slugs by cycle for display, preserving the official order of
 * both the cycles and the levels inside each one.
 */
export function groupLevelSlugsByCycle(slugs: string[]): { cycle: EducationCycle; label: string; levels: CatalogItem[] }[] {
  const sorted = sortLevelSlugs(slugs);
  const groups: { cycle: EducationCycle; label: string; levels: CatalogItem[] }[] = [];
  for (const slug of sorted) {
    const item = levelBySlug.get(slug)!;
    const existing = groups.find((g) => g.cycle === item.cycle);
    if (existing) {
      existing.levels.push(item);
    } else {
      groups.push({ cycle: item.cycle, label: levelCycleLabels[item.cycle], levels: [item] });
    }
  }
  return groups;
}