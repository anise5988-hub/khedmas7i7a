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


const globalCoursesStore = globalThis as unknown as {
  __profy_courses?: Course[];
  __profy_access?: CourseAccess[];
  __profy_progress?: Map<string, CourseProgress>;
};

if (!globalCoursesStore.__profy_courses) {
  globalCoursesStore.__profy_courses = [];
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
    visibility?: CourseVisibility;
  }): Course[] {
    let courses = [...globalCoursesStore.__profy_courses!];

    if (filters?.teacherId) {
      courses = courses.filter((c) => c.teacherId === filters.teacherId || c.teacherId === `teach_${filters.teacherId}`);
    } else if (filters?.visibility) {
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
