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
