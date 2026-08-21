export type Lesson = {
  id: string;
  title: string;
  durationMinutes: number;
  videoUrl?: string;
  description?: string;
  resources?: { name: string; url: string }[];
  isFreePreview?: boolean;
};

export type CourseSection = {
  id: string;
  title: string;
  lessons: Lesson[];
};

export type CourseVisibility = "PUBLIC" | "LOCKED" | "PRIVATE" | "DRAFT";

export type Course = {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherSlug: string;
  teacherAvatarUrl?: string;
  title: string;
  description: string;
  subject: string;
  level: string;
  language: string;
  priceTnd: number;
  amountMillimes: number;
  visibility: CourseVisibility;
  thumbnailUrl: string;
  durationMinutes: number;
  totalLessons: number;
  rating: number;
  reviewCount: number;
  studentCount: number;
  sections: CourseSection[];
  createdAt: string;
  updatedAt: string;
};

export type CourseAccess = {
  id: string;
  courseId: string;
  studentId: string;
  purchasedAt: string;
  amountPaidTnd: number;
};

export type CourseProgress = {
  courseId: string;
  studentId: string;
  completedLessonIds: string[];
  lastLessonId?: string;
  percentage: number;
};

const SEED_COURSES: Course[] = [
  {
    id: "course_pack_bac_math_2026",
    teacherId: "user_teacher_mehdi_ben_amor",
    teacherName: "Prof. Mehdi Ben Amor",
    teacherSlug: "mehdi-ben-amor",
    teacherAvatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    title: "Pack Révision Complète Bac Mathématiques 2026 - Analyse & Nombres Complexes",
    description: "Un pack d'excellence regroupant 8 vidéos de cours complets, résumés théoriques et résolutions détaillées d'épreuves de Baccalauréat tunisien (Continuité, Dérivabilité, Primitives, Intégrales, Nombres Complexes & Isométries).",
    subject: "Mathématiques",
    level: "4ème Année Secondaire (Bac)",
    language: "Français / Arabe",
    priceTnd: 45,
    amountMillimes: 45000,
    visibility: "LOCKED",
    thumbnailUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&auto=format&fit=crop&q=80",
    durationMinutes: 330,
    totalLessons: 8,
    rating: 4.9,
    reviewCount: 28,
    studentCount: 142,
    sections: [
      {
        id: "sec_math_1",
        title: "Module 1 : Analyse & Fonctions (Continuité & Dérivabilité)",
        lessons: [
          {
            id: "les_math_1",
            title: "1. Continuité et Théorème des Valeurs Intermédiaires (TVI)",
            durationMinutes: 35,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            description: "Rappels de cours, astuces pour les fonctions composées et exemples d'application.",
            isFreePreview: true,
            resources: [{ name: "Fiche_Resume_TVI_Bac.pdf", url: "#" }],
          },
          {
            id: "les_math_2",
            title: "2. Dérivabilité & Inégalités des Accroissements Finis",
            durationMinutes: 40,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            description: "Étude complète des variations, branches infinies et points d'inflexion.",
            isFreePreview: false,
          },
          {
            id: "les_math_3",
            title: "3. Fonctions Réciproques et Applications Trigonométriques",
            durationMinutes: 30,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: false,
          },
        ],
      },
      {
        id: "sec_math_2",
        title: "Module 2 : Nombres Complexes & Géométrie du Plan",
        lessons: [
          {
            id: "les_math_4",
            title: "4. Formes Algébrique, Trigonométrique et Exponentielle",
            durationMinutes: 45,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            description: "Formule de Moivre, racines n-ièmes et linéarisation trigonométrique.",
            isFreePreview: true,
          },
          {
            id: "les_math_5",
            title: "5. Transformations du Plan : Homothéties, Rotations et Similitudes",
            durationMinutes: 50,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: false,
          },
          {
            id: "les_math_6",
            title: "6. Résolution d'Équations Complexes & Problèmes de Concours",
            durationMinutes: 40,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: false,
          },
        ],
      },
      {
        id: "sec_math_3",
        title: "Module 3 : Primitives, Calcul Intégral & Sujets Bac Corrigés",
        lessons: [
          {
            id: "les_math_7",
            title: "7. Techniques d'Intégration par Parties & Calculs d'Aires",
            durationMinutes: 35,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: false,
          },
          {
            id: "les_math_8",
            title: "8. Examen Blanc Corrigé Pas à Pas Type Bac Tunisien",
            durationMinutes: 55,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: false,
            resources: [{ name: "Sujet_Corrige_Bac_Maths_2025.pdf", url: "#" }],
          },
        ],
      },
    ],
    createdAt: new Date("2026-01-10T10:00:00Z").toISOString(),
    updatedAt: new Date("2026-02-01T12:00:00Z").toISOString(),
  },
  {
    id: "course_pack_bac_physique_2026",
    teacherId: "user_teacher_sonia_gharbi",
    teacherName: "Dr. Sonia Gharbi",
    teacherSlug: "sonia-gharbi",
    teacherAvatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
    title: "Pack Ultime Bac Physique-Chimie : Électricité, Ondes & Acides/Bases",
    description: "Le pack référence pour maîtriser la physique-chimie au Bac (Sciences Expérimentales, Maths & Technique). Circuits RC/RL/RLC, résonance, oscillations mécaniques, réactions acide-base et dosages pH-métriques.",
    subject: "Physique-Chimie",
    level: "4ème Année Secondaire (Bac)",
    language: "Français",
    priceTnd: 40,
    amountMillimes: 40000,
    visibility: "LOCKED",
    thumbnailUrl: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80",
    durationMinutes: 270,
    totalLessons: 7,
    rating: 5.0,
    reviewCount: 34,
    studentCount: 195,
    sections: [
      {
        id: "sec_phy_1",
        title: "Module 1 : Électricité - Circuits RC, RL et RLC",
        lessons: [
          {
            id: "les_phy_1",
            title: "1. Réponse d'un Dipôle RC à un Échelon de Tension",
            durationMinutes: 30,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: true,
            description: "Équations différentielles de charge/décharge et bilan énergétique.",
          },
          {
            id: "les_phy_2",
            title: "2. Établissement du Courant dans une Bobine (Dipôle RL)",
            durationMinutes: 35,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: false,
          },
          {
            id: "les_phy_3",
            title: "3. Oscillations Électriques Libres et Forcées (RLC & Résonance)",
            durationMinutes: 45,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: false,
          },
        ],
      },
      {
        id: "sec_phy_2",
        title: "Module 2 : Ondes Mécaniques & Optique Ondulatoire",
        lessons: [
          {
            id: "les_phy_4",
            title: "4. Propagation d'une Onde le Long d'une Corde & Milieux Dispersifs",
            durationMinutes: 35,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: false,
          },
          {
            id: "les_phy_5",
            title: "5. Phénomène de Diffraction & Interférences Lumineuses",
            durationMinutes: 40,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: false,
          },
        ],
      },
      {
        id: "sec_phy_3",
        title: "Module 3 : Chimie - Équilibres Chimiques & Dosages Acide-Base",
        lessons: [
          {
            id: "les_phy_6",
            title: "6. pH des Solutions Aqueuses, pKa et Constante d'Équilibre",
            durationMinutes: 40,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: true,
          },
          {
            id: "les_phy_7",
            title: "7. Dosages et Titrages Acide Fort / Base Forte et Solutions Tampons",
            durationMinutes: 45,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: false,
          },
        ],
      },
    ],
    createdAt: new Date("2026-01-12T11:00:00Z").toISOString(),
    updatedAt: new Date("2026-02-04T15:00:00Z").toISOString(),
  },
  {
    id: "course_pack_bac_info_algo_2026",
    teacherId: "user_teacher_youssef_trabelsi",
    teacherName: "Ing. Youssef Trabelsi",
    teacherSlug: "youssef-trabelsi",
    teacherAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    title: "Pack Masterclass Algorithmique & Programmation Python - Bac Informatique",
    description: "Un pack pratique et complet pour valider haut la main l'épreuve pratique et théorique d'algorithmique et de programmation du Baccalauréat. Fonctions, récursivité, tris, manipulation de fichiers et annales corrigées.",
    subject: "Informatique",
    level: "4ème Année Secondaire (Bac)",
    language: "Français / Python",
    priceTnd: 35,
    amountMillimes: 35000,
    visibility: "LOCKED",
    thumbnailUrl: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&auto=format&fit=crop&q=80",
    durationMinutes: 240,
    totalLessons: 6,
    rating: 4.8,
    reviewCount: 19,
    studentCount: 110,
    sections: [
      {
        id: "sec_algo_1",
        title: "Module 1 : Sous-programmes & Récursivité en Python",
        lessons: [
          {
            id: "les_algo_1",
            title: "1. Décomposition Modulaire & Passage de Paramètres en Python",
            durationMinutes: 30,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: true,
          },
          {
            id: "les_algo_2",
            title: "2. Maîtriser la Récursivité & Exemples Classiques d'Examen",
            durationMinutes: 40,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: false,
          },
        ],
      },
      {
        id: "sec_algo_2",
        title: "Module 2 : Tris, Recherche & Algorithmes Arithmétiques",
        lessons: [
          {
            id: "les_algo_3",
            title: "3. Tri par Sélection, Insertion, Bulles et Tri Fusion",
            durationMinutes: 45,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: false,
          },
          {
            id: "les_algo_4",
            title: "4. Algorithmes sur les Nombres Premiers & PGCD / PPCM",
            durationMinutes: 35,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: false,
          },
        ],
      },
      {
        id: "sec_algo_3",
        title: "Module 3 : Fichiers Textes, Enregistrements & Sujets Types",
        lessons: [
          {
            id: "les_algo_5",
            title: "5. Manipulation Avancée de Fichiers et Enregistrements",
            durationMinutes: 40,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: false,
          },
          {
            id: "les_algo_6",
            title: "6. Devoir de Synthèse Complet Corrigé en Direct",
            durationMinutes: 50,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: false,
          },
        ],
      },
    ],
    createdAt: new Date("2026-01-15T14:00:00Z").toISOString(),
    updatedAt: new Date("2026-02-08T16:00:00Z").toISOString(),
  },
  {
    id: "course_francais_bac_gratuit",
    teacherId: "user_teacher_leila_mansouri",
    teacherName: "Prof. Leila Mansouri",
    teacherSlug: "leila-mansouri",
    teacherAvatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80",
    title: "Cours Gratuit : Méthodologie Complète de l'Essai Littéraire au Bac",
    description: "Formation 100% offerte par Prof. Leila Mansouri pour apprendre à structurer une problématique, élaborer un plan dialectique en 3 parties et rédiger une argumentation convaincante avec exemples littéraires.",
    subject: "Français",
    level: "4ème Année Secondaire (Bac)",
    language: "Français",
    priceTnd: 0,
    amountMillimes: 0,
    visibility: "PUBLIC",
    thumbnailUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=80",
    durationMinutes: 90,
    totalLessons: 3,
    rating: 4.9,
    reviewCount: 52,
    studentCount: 420,
    sections: [
      {
        id: "sec_fr_1",
        title: "Module 1 : Analyse du Sujet & Problématisation",
        lessons: [
          {
            id: "les_fr_1",
            title: "1. Décortiquer le Libellé et Éviter le Hors-Sujet",
            durationMinutes: 25,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: true,
          },
          {
            id: "les_fr_2",
            title: "2. Bâtir une Introduction et une Conclusion Imparables",
            durationMinutes: 30,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: true,
          },
        ],
      },
      {
        id: "sec_fr_2",
        title: "Module 2 : Rédaction & Argumentation",
        lessons: [
          {
            id: "les_fr_3",
            title: "3. Connecteurs Logiques & Exemples Littéraires Clés",
            durationMinutes: 35,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: true,
          },
        ],
      },
    ],
    createdAt: new Date("2026-01-05T09:00:00Z").toISOString(),
    updatedAt: new Date("2026-01-20T10:00:00Z").toISOString(),
  },
  {
    id: "course_pack_9eme_maths",
    teacherId: "user_teacher_mehdi_ben_amor",
    teacherName: "Prof. Mehdi Ben Amor",
    teacherSlug: "mehdi-ben-amor",
    teacherAvatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    title: "Pack Révision Intensive Concours 9ème Année : Mathématiques",
    description: "Préparation complète à l'épreuve de mathématiques du concours national de fin d'études de l'enseignement de base (9ème pilote). Géométrie, calcul littéral, racines carrées et théorèmes de Thalès/Pythagore.",
    subject: "Mathématiques",
    level: "9ème Année de Base",
    language: "Français / Arabe",
    priceTnd: 25,
    amountMillimes: 25000,
    visibility: "LOCKED",
    thumbnailUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80",
    durationMinutes: 150,
    totalLessons: 4,
    rating: 4.9,
    reviewCount: 22,
    studentCount: 88,
    sections: [
      {
        id: "sec_9m_1",
        title: "Module 1 : Algèbre & Calcul Numérique",
        lessons: [
          {
            id: "les_9m_1",
            title: "1. Calcul dans R, Racines Carrées & Puissances",
            durationMinutes: 30,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: true,
          },
          {
            id: "les_9m_2",
            title: "2. Équations et Inéquations du Premier Degré",
            durationMinutes: 35,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: false,
          },
        ],
      },
      {
        id: "sec_9m_2",
        title: "Module 2 : Géométrie & Trigonométrie",
        lessons: [
          {
            id: "les_9m_3",
            title: "3. Théorème de Thalès et Trigonométrie dans le Triangle Rectangle",
            durationMinutes: 40,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: false,
          },
          {
            id: "les_9m_4",
            title: "4. Sujets de Concours 9ème Corrigés en Vidéo",
            durationMinutes: 45,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: false,
          },
        ],
      },
    ],
    createdAt: new Date("2026-01-22T08:00:00Z").toISOString(),
    updatedAt: new Date("2026-02-10T11:00:00Z").toISOString(),
  },
  {
    id: "course_pack_eco_gestion_bac",
    teacherId: "user_teacher_mohamed_karray",
    teacherName: "Prof. Mohamed Karray",
    teacherSlug: "mohamed-karray",
    teacherAvatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80",
    title: "Pack Révision Économie & Comptabilité Financière - Bac Éco-Gestion",
    description: "Un condensé ultra-efficace pour maîtriser la croissance économique, l'inflation, le chômage, l'analyse financière et la gestion prévisionnelle pour les candidats au Bac Éco-Gestion.",
    subject: "Économie / Gestion",
    level: "4ème Année Secondaire (Bac)",
    language: "Français",
    priceTnd: 30,
    amountMillimes: 30000,
    visibility: "LOCKED",
    thumbnailUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&auto=format&fit=crop&q=80",
    durationMinutes: 155,
    totalLessons: 4,
    rating: 4.7,
    reviewCount: 21,
    studentCount: 76,
    sections: [
      {
        id: "sec_eco_1",
        title: "Module 1 : Macroéconomie & Mondialisation",
        lessons: [
          {
            id: "les_eco_1",
            title: "1. Croissance Économique, PIB et Politiques de Relance",
            durationMinutes: 35,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: true,
          },
          {
            id: "les_eco_2",
            title: "2. Échanges Internationaux & Taux de Change",
            durationMinutes: 35,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: false,
          },
        ],
      },
      {
        id: "sec_eco_2",
        title: "Module 2 : Gestion Financière & Analyse de Bilan",
        lessons: [
          {
            id: "les_eco_3",
            title: "3. Bilan Fonctionnel, Fonds de Roulement (FR) & BFR",
            durationMinutes: 45,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: false,
          },
          {
            id: "les_eco_4",
            title: "4. Soldes Intermédiaires de Gestion & Ratios de Rentabilité",
            durationMinutes: 40,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isFreePreview: false,
          },
        ],
      },
    ],
    createdAt: new Date("2026-01-28T10:00:00Z").toISOString(),
    updatedAt: new Date("2026-02-14T14:00:00Z").toISOString(),
  },
];

const globalCoursesStore = globalThis as unknown as {
  __profy_courses?: Course[];
  __profy_access?: CourseAccess[];
  __profy_progress?: Map<string, CourseProgress>;
};

if (!globalCoursesStore.__profy_courses || globalCoursesStore.__profy_courses.length === 0) {
  globalCoursesStore.__profy_courses = [...SEED_COURSES];
}
if (!globalCoursesStore.__profy_access) {
  globalCoursesStore.__profy_access = [];
}
if (!globalCoursesStore.__profy_progress) {
  globalCoursesStore.__profy_progress = new Map();
}

export const coursesStore = {
  getAllCourses(filters?: {
    subject?: string;
    level?: string;
    search?: string;
    teacherId?: string;
    visibility?: CourseVisibility | "ALL";
  }): Course[] {
    let courses = [...globalCoursesStore.__profy_courses!];

    if (filters?.teacherId) {
      const targetId = filters.teacherId;
      courses = courses.filter((c) => c.teacherId === targetId || c.teacherId === `teach_${targetId}` || c.teacherId.includes(targetId));
    } else if (filters?.visibility && filters.visibility !== "ALL") {
      courses = courses.filter((c) => c.visibility === filters.visibility);
    } else if (filters?.visibility === "ALL") {
      // return all
    } else {
      // By default for public directory, return all published courses (PUBLIC, LOCKED, and anything not DRAFT)
      courses = courses.filter((c) => c.visibility !== "DRAFT");
    }
    if (filters?.subject) {
      courses = courses.filter((c) => c.subject.toLowerCase().includes(filters.subject!.toLowerCase()));
    }
    if (filters?.level) {
      courses = courses.filter((c) => c.level.toLowerCase().includes(filters.level!.toLowerCase()));
    }
    if (filters?.search) {
      const query = filters.search.toLowerCase();
      courses = courses.filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query) ||
          c.teacherName.toLowerCase().includes(query) ||
          c.subject.toLowerCase().includes(query)
      );
    }

    return courses;
  },

  getCourseById(id: string): Course | null {
    return globalCoursesStore.__profy_courses!.find((c) => c.id === id) || null;
  },

  createCourse(data: Omit<Course, "id" | "createdAt" | "updatedAt" | "totalLessons" | "durationMinutes">): Course {
    const id = `course_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let totalLessons = 0;
    let durationMinutes = 0;

    const formattedSections = (data.sections || []).map((sec, sIdx) => {
      const secId = sec.id || `sec_${Date.now()}_${sIdx}`;
      const formattedLessons = (sec.lessons || []).map((les, lIdx) => {
        totalLessons += 1;
        durationMinutes += les.durationMinutes || 0;
        return {
          ...les,
          id: les.id || `les_${Date.now()}_${sIdx}_${lIdx}`,
        };
      });
      return {
        ...sec,
        id: secId,
        lessons: formattedLessons,
      };
    });

    const newCourse: Course = {
      ...data,
      id,
      sections: formattedSections,
      totalLessons,
      durationMinutes,
      rating: 5.0,
      reviewCount: 0,
      studentCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    globalCoursesStore.__profy_courses!.unshift(newCourse);
    return newCourse;
  },

  updateCourse(id: string, updates: Partial<Course>): Course | null {
    const index = globalCoursesStore.__profy_courses!.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const existing = globalCoursesStore.__profy_courses![index];
    const updated: Course = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (updates.sections) {
      let totalLessons = 0;
      let durationMinutes = 0;
      updated.sections.forEach((sec) => {
        sec.lessons.forEach((les) => {
          totalLessons += 1;
          durationMinutes += les.durationMinutes || 0;
        });
      });
      updated.totalLessons = totalLessons;
      updated.durationMinutes = durationMinutes;
    }

    globalCoursesStore.__profy_courses![index] = updated;
    return updated;
  },

  deleteCourse(id: string): boolean {
    const initialLength = globalCoursesStore.__profy_courses!.length;
    globalCoursesStore.__profy_courses = globalCoursesStore.__profy_courses!.filter((c) => c.id !== id);
    return globalCoursesStore.__profy_courses.length < initialLength;
  },

  hasAccess(courseId: string, studentId: string): boolean {
    const course = this.getCourseById(courseId);
    if (!course) return false;
    if (course.visibility === "PUBLIC" || course.priceTnd === 0) return true;
    return globalCoursesStore.__profy_access!.some((access) => access.courseId === courseId && access.studentId === studentId);
  },

  grantAccess(courseId: string, studentId: string, amountPaidTnd: number): CourseAccess {
    const existing = globalCoursesStore.__profy_access!.find(
      (a) => a.courseId === courseId && a.studentId === studentId
    );
    if (existing) return existing;

    const access: CourseAccess = {
      id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      courseId,
      studentId,
      purchasedAt: new Date().toISOString(),
      amountPaidTnd,
    };

    globalCoursesStore.__profy_access!.push(access);

    // increment student count
    const course = this.getCourseById(courseId);
    if (course) {
      this.updateCourse(courseId, { studentCount: course.studentCount + 1 });
    }

    return access;
  },

  getStudentPurchasedCourses(studentId: string): { course: Course; access: CourseAccess }[] {
    const accesses = globalCoursesStore.__profy_access!.filter((a) => a.studentId === studentId);
    const result: { course: Course; access: CourseAccess }[] = [];

    accesses.forEach((a) => {
      const course = this.getCourseById(a.courseId);
      if (course) {
        result.push({ course, access: a });
      }
    });

    return result;
  },

  getProgress(courseId: string, studentId: string): CourseProgress {
    const key = `${courseId}:${studentId}`;
    let prog = globalCoursesStore.__profy_progress!.get(key);
    if (!prog) {
      prog = { courseId, studentId, completedLessonIds: [], percentage: 0 };
    }
    return prog;
  },

  markLessonComplete(courseId: string, studentId: string, lessonId: string): CourseProgress {
    const key = `${courseId}:${studentId}`;
    const course = this.getCourseById(courseId);
    let prog = this.getProgress(courseId, studentId);

    if (!prog.completedLessonIds.includes(lessonId)) {
      const updatedList = [...prog.completedLessonIds, lessonId];
      const totalLessons = course?.totalLessons || 1;
      const percentage = Math.min(100, Math.round((updatedList.length / totalLessons) * 100));

      prog = {
        ...prog,
        completedLessonIds: updatedList,
        lastLessonId: lessonId,
        percentage,
      };
      globalCoursesStore.__profy_progress!.set(key, prog);
    }

    return prog;
  },
};
