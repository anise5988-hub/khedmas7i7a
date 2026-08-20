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


const initialCourses: Course[] = [
  {
    id: "course_math_bac_1",
    teacherId: "teach_salim",
    teacherName: "Prof. Salim Ben Ammar",
    teacherSlug: "salim-ben-ammar",
    teacherAvatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    title: "Pack Révision Intensive Bac Mathématiques - Analyse & Algèbre",
    description: "Un cours complet couvrant tout le programme d'Analyse (Limites, Continuité, Dérivabilité, Intégration) et d'Algèbre pour réussir l'épreuve du Baccalauréat Mathématiques avec mention.",
    subject: "Mathématiques",
    level: "3ème / 4ème Année Secondaire (Bac)",
    language: "Français / Arabe",
    priceTnd: 45,
    amountMillimes: 45000,
    visibility: "LOCKED",
    thumbnailUrl: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=80",
    durationMinutes: 360,
    totalLessons: 12,
    rating: 4.9,
    reviewCount: 38,
    studentCount: 142,
    sections: [
      {
        id: "sec_1",
        title: "Chapitre 1 : Limites et Continuité",
        lessons: [
          {
            id: "les_1_1",
            title: "Rappels et Définitions fondamentales",
            durationMinutes: 25,
            videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
            description: "Comprendre les limites à l'infini et la continuité en un point.",
            isFreePreview: true,
            resources: [{ name: "Fiche_Cours_Limites.pdf", url: "#" }],
          },
          {
            id: "les_1_2",
            title: "Théorème des Valeurs Intermédiaires (TVI)",
            durationMinutes: 30,
            videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
            description: "Applications pratiques et démonstrations type Bac.",
            isFreePreview: false,
            resources: [{ name: "Exercices_Corriges_TVI.pdf", url: "#" }],
          },
        ],
      },
      {
        id: "sec_2",
        title: "Chapitre 2 : Calcul Intégral & Logarithme",
        lessons: [
          {
            id: "les_2_1",
            title: "Fonction Logarithme Néperien (Ln)",
            durationMinutes: 40,
            videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
            description: "Propriétés, limites usuelles et dérivées.",
            isFreePreview: false,
            resources: [{ name: "Ln_Exercices_Bac.pdf", url: "#" }],
          },
          {
            id: "les_2_2",
            title: "Intégration par parties",
            durationMinutes: 35,
            videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
            description: "Méthode et astuces pour résoudre les intégrales complexes.",
            isFreePreview: false,
          },
        ],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "course_phys_bac_2",
    teacherId: "teach_amira",
    teacherName: "Mme. Amira Triki",
    teacherSlug: "amira-triki",
    teacherAvatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    title: "Physique - Électricité & Oscillations Forcées (RC, RL, RLC)",
    description: "Maîtrisez les circuits électriques RC, RL et RLC en séries avec résolutions détaillées des sujets de bac récents et courbes expérimentales.",
    subject: "Physique-Chimie",
    level: "Bac Scientifique / Technique",
    language: "Français",
    priceTnd: 35,
    amountMillimes: 35000,
    visibility: "LOCKED",
    thumbnailUrl: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=800&auto=format&fit=crop&q=80",
    durationMinutes: 280,
    totalLessons: 8,
    rating: 4.8,
    reviewCount: 24,
    studentCount: 98,
    sections: [
      {
        id: "sec_p1",
        title: "Module 1 : Circuit RC - Charge et Décharge",
        lessons: [
          {
            id: "les_p1_1",
            title: "Équation différentielle du condensateur",
            durationMinutes: 30,
            videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
            description: "Établissement et résolution de l'équation différentielle.",
            isFreePreview: true,
          },
          {
            id: "les_p1_2",
            title: "Analyse des constantes de temps (Tau)",
            durationMinutes: 25,
            videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
            description: "Méthodes graphiques pour déterminer Tau.",
            isFreePreview: false,
          },
        ],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "course_fr_orale_3",
    teacherId: "teach_khalil",
    teacherName: "Mr. Khalil Gharbi",
    teacherSlug: "khalil-gharbi",
    teacherAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    title: "Communication en Français des Affaires & Entretiens Pro",
    description: "Formation pratique pour s'exprimer avec aisance, réussir ses entretiens académiques ou professionnels et rédiger des e-mails parfaits.",
    subject: "Français / Communication",
    level: "Universitaire / Adultes",
    language: "Français",
    priceTnd: 0,
    amountMillimes: 0,
    visibility: "PUBLIC",
    thumbnailUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80",
    durationMinutes: 180,
    totalLessons: 6,
    rating: 4.9,
    reviewCount: 52,
    studentCount: 310,
    sections: [
      {
        id: "sec_f1",
        title: "Introduction aux fondamentaux",
        lessons: [
          {
            id: "les_f1_1",
            title: "Se présenter efficacement en 2 minutes",
            durationMinutes: 20,
            videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
            description: "Pitch personnel et vocabulaire d'impact.",
            isFreePreview: true,
          },
        ],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const globalCoursesStore = globalThis as unknown as {
  __profy_courses?: Course[];
  __profy_access?: CourseAccess[];
  __profy_progress?: Map<string, CourseProgress>;
};

if (!globalCoursesStore.__profy_courses) {
  globalCoursesStore.__profy_courses = [...initialCourses];
}
if (!globalCoursesStore.__profy_access) {
  globalCoursesStore.__profy_access = [
    {
      id: "acc_demo_1",
      courseId: "course_fr_orale_3",
      studentId: "demo_student",
      purchasedAt: new Date().toISOString(),
      amountPaidTnd: 0,
    },
  ];
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
    visibility?: CourseVisibility;
  }): Course[] {
    let courses = [...globalCoursesStore.__profy_courses!];

    if (filters?.teacherId) {
      courses = courses.filter((c) => c.teacherId === filters.teacherId);
    }
    if (filters?.visibility) {
      courses = courses.filter((c) => c.visibility === filters.visibility);
    } else {
      // By default for public directory, return PUBLIC and LOCKED (exclude DRAFT/PRIVATE unless specified)
      courses = courses.filter((c) => c.visibility === "PUBLIC" || c.visibility === "LOCKED");
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

    return globalCoursesStore.__profy_access!.some(
      (a) => a.courseId === courseId && a.studentId === studentId
    );
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
