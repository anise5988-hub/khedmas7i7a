import type { DirectoryTeacher } from "@/lib/server/teachers-directory";
import { educationLevels, subjects as catalogSubjects } from "@/lib/domain/catalog";

export type MatchedTeacher = DirectoryTeacher & {
  matchScore: number;
  matchReasons: string[];
};

type ParsedIntent = {
  subjects: string[];
  levelCycle: "PRIMARY" | "BASIC" | "SECONDARY" | "UNIVERSITY" | "PROFESSIONAL" | null;
  wantsBac: boolean;
  budgetMax: number | null;
  mode: "online" | "in_person" | null;
  timeOfDay: "morning" | "afternoon" | "evening" | null;
  wantsWeekend: boolean;
  city: string | null;
};

const SUBJECT_ALIASES: Record<string, string[]> = {
  "Mathématiques": ["math", "maths", "mathématique", "mathematiques", "الرياضيات"],
  "Physique": ["physique"],
  "Sciences physiques": ["sciences physiques", "sc physique", "physique-chimie", "chimie"],
  "SVT": ["svt", "sciences naturelles", "biologie"],
  "Français": ["français", "francais", "الفرنسية"],
  "English": ["anglais", "english"],
  "Informatique": ["informatique", "info", "programmation", "coding", "développement", "developpement", "python", "java", "algorithmique"],
  "Philosophie": ["philosophie", "philo"],
  "Histoire": ["histoire"],
  "Géographie": ["géographie", "geographie", "géo", "geo"],
  "Économie": ["économie", "economie", "eco"],
  "Gestion": ["gestion"],
  "Comptabilité": ["comptabilité", "comptabilite", "compta"],
  "العربية": ["arabe", "العربية"],
};

const CITY_HINTS = [
  "Tunis", "Ariana", "Ben Arous", "Manouba", "Nabeul", "Bizerte", "Béja", "Beja", "Jendouba",
  "Le Kef", "Kef", "Siliana", "Kairouan", "Kasserine", "Sidi Bouzid", "Sousse", "Monastir",
  "Mahdia", "Sfax", "Gabès", "Gabes", "Medenine", "Médenine", "Tataouine", "Gafsa", "Tozeur",
  "Kebili", "Zaghouan",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function parseQuery(rawQuery: string): ParsedIntent {
  const query = normalize(rawQuery);

  const matchedSubjects = new Set<string>();
  for (const [canonical, aliases] of Object.entries(SUBJECT_ALIASES)) {
    if (aliases.some((alias) => query.includes(normalize(alias)))) {
      matchedSubjects.add(canonical);
    }
  }
  for (const subject of catalogSubjects) {
    if (query.includes(normalize(subject))) matchedSubjects.add(subject);
  }

  let levelCycle: ParsedIntent["levelCycle"] = null;
  const wantsBac = /\bbac\b|baccalaureat|terminale/.test(query);
  if (wantsBac) levelCycle = "SECONDARY";
  else if (/primaire|ecole primaire|cp\b|ce1|ce2|cm1|cm2/.test(query)) levelCycle = "PRIMARY";
  else if (/college|7eme|8eme|9eme|base\b/.test(query)) levelCycle = "BASIC";
  else if (/secondaire|lycee|1ere secondaire|2eme secondaire|3eme secondaire/.test(query)) levelCycle = "SECONDARY";
  else if (/universite|fac\b|superieur|licence|master/.test(query)) levelCycle = "UNIVERSITY";
  else if (/professionnel|formation pro/.test(query)) levelCycle = "PROFESSIONAL";

  let budgetMax: number | null = null;
  const budgetMatch =
    query.match(/(\d{2,4})\s?(dt|dinars?|tnd)/) ||
    query.match(/(?:budget|max|maximum|jusqu.?a)\D{0,12}(\d{2,4})/);
  if (budgetMatch) budgetMax = Number(budgetMatch[1]);

  let mode: ParsedIntent["mode"] = null;
  const onlineHint = /en ligne|online|a distance|distanciel|visio|webcam|zoom|internet/.test(query);
  const inPersonHint = /presentiel|domicile|a la maison|face a face|sur place|chez (moi|nous|lui|elle)/.test(query);
  if (onlineHint && !inPersonHint) mode = "online";
  else if (inPersonHint && !onlineHint) mode = "in_person";

  let timeOfDay: ParsedIntent["timeOfDay"] = null;
  if (/soir|soiree|18h|19h|20h|21h/.test(query)) timeOfDay = "evening";
  else if (/matin|8h|9h|10h/.test(query)) timeOfDay = "morning";
  else if (/apres.midi|14h|15h|16h|17h/.test(query)) timeOfDay = "afternoon";

  const wantsWeekend = /week.?end|samedi|dimanche/.test(query);

  let city: string | null = null;
  for (const c of CITY_HINTS) {
    if (query.includes(normalize(c))) {
      city = c;
      break;
    }
  }

  return { subjects: Array.from(matchedSubjects), levelCycle, wantsBac, budgetMax, mode, timeOfDay, wantsWeekend, city };
}

function cycleOfLevelSlug(slug: string): ParsedIntent["levelCycle"] {
  if (slug === "bac") return "SECONDARY";
  const found = educationLevels.find((l) => l.slug === slug);
  return found ? found.cycle : null;
}

function timeOfDayBucket(startTime: string): "morning" | "afternoon" | "evening" {
  const hour = Number(startTime.split(":")[0]);
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function scoreTeacher(teacher: DirectoryTeacher, intent: ParsedIntent): { score: number; reasons: string[] } {
  let score = 40; // baseline: every approved teacher starts as a plausible option
  const reasons: string[] = [];

  if (intent.subjects.length > 0) {
    const teacherSubjectsNorm = teacher.subjects.map(normalize);
    const hit = intent.subjects.some((s) => teacherSubjectsNorm.includes(normalize(s)));
    if (hit) {
      score += 30;
      reasons.push(`Matière ${intent.subjects.join(", ")} ✓`);
    } else {
      score -= 20;
    }
  }

  if (intent.wantsBac) {
    if (teacher.levels.includes("bac")) {
      score += 15;
      reasons.push("Enseigne le Bac ✓");
    } else {
      score -= 8;
    }
  } else if (intent.levelCycle) {
    const teacherCycles = teacher.levels.map(cycleOfLevelSlug);
    if (teacherCycles.includes(intent.levelCycle) || teacher.levels.length === 0) {
      if (teacherCycles.includes(intent.levelCycle)) {
        score += 15;
        reasons.push("Niveau demandé ✓");
      }
    } else {
      score -= 8;
    }
  }

  if (intent.budgetMax !== null) {
    if (teacher.rate <= intent.budgetMax) {
      score += 15;
      reasons.push(`Budget respecté (${teacher.rate} DT/h) ✓`);
    } else if (teacher.rate <= intent.budgetMax * 1.2) {
      score += 4;
      reasons.push(`Légèrement au-dessus du budget (${teacher.rate} DT/h)`);
    } else {
      score -= 15;
    }
  }

  if (intent.mode === "online") {
    if (teacher.online) {
      score += 10;
      reasons.push("Disponible en ligne ✓");
    } else {
      score -= 10;
    }
  } else if (intent.mode === "in_person") {
    if (teacher.inPerson) {
      score += 10;
      reasons.push("Disponible en présentiel ✓");
    } else {
      score -= 10;
    }
  }

  if (intent.city) {
    if (normalize(teacher.city).includes(normalize(intent.city)) || normalize(teacher.governorate).includes(normalize(intent.city))) {
      score += 8;
      reasons.push(`Basé à ${teacher.city} ✓`);
    }
  }

  if (intent.timeOfDay || intent.wantsWeekend) {
    const slots = teacher.availabilities || [];
    const matchesTime = intent.timeOfDay ? slots.some((a) => timeOfDayBucket(a.startTime) === intent.timeOfDay) : false;
    const matchesWeekend = intent.wantsWeekend ? slots.some((a) => a.dayOfWeek === 5 || a.dayOfWeek === 6) : false;
    if (matchesTime || matchesWeekend) {
      score += 10;
      reasons.push("Créneaux compatibles avec votre disponibilité ✓");
    }
  }

  score += Math.min(teacher.rating, 5) * 1.5;
  score += Math.min(teacher.experience, 10) * 0.5;

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons };
}

export function matchTeachers(query: string, teachers: DirectoryTeacher[], limit = 6): MatchedTeacher[] {
  const intent = parseQuery(query);

  return teachers
    .map((teacher) => {
      const { score, reasons } = scoreTeacher(teacher, intent);
      return { ...teacher, matchScore: score, matchReasons: reasons };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}
