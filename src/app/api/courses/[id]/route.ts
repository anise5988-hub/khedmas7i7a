import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { coursesStore, Course, CourseSection } from "@/lib/server/courses-store";

function mapDbCourse(dbCourse: {
  id: string;
  teacherId: string;
  title: string;
  description: string;
  subject: string;
  level: string;
  language: string;
  priceTnd: number;
  amountMillimes: number;
  visibility: string;
  thumbnailUrl: string | null;
  sections: unknown;
  rating: number;
  reviewCount: number;
  studentCount: number;
  createdAt: Date;
  updatedAt: Date;
  teacher?: {
    userId: string;
    slug: string;
    avatarUrl?: string | null;
    user?: {
      firstName: string;
      lastName: string;
    } | null;
  } | null;
}): Course {
  const sections = (Array.isArray(dbCourse.sections) ? dbCourse.sections : []) as CourseSection[];
  let totalLessons = 0;
  let durationMinutes = 0;

  sections.forEach((sec) => {
    if (Array.isArray(sec.lessons)) {
      sec.lessons.forEach((les) => {
        totalLessons += 1;
        durationMinutes += Number(les.durationMinutes) || 0;
      });
    }
  });

  const teacherFirstName = dbCourse.teacher?.user?.firstName || "Enseignant";
  const teacherLastName = dbCourse.teacher?.user?.lastName || "";
  const teacherName = `${teacherFirstName} ${teacherLastName}`.trim();
  const teacherSlug = dbCourse.teacher?.slug || `${teacherFirstName}-${teacherLastName}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return {
    id: dbCourse.id,
    teacherId: dbCourse.teacherId,
    teacherName,
    teacherSlug,
    teacherAvatarUrl: dbCourse.teacher?.avatarUrl || undefined,
    title: dbCourse.title,
    description: dbCourse.description,
    subject: dbCourse.subject,
    level: dbCourse.level,
    language: dbCourse.language || "Français",
    priceTnd: dbCourse.priceTnd,
    amountMillimes: dbCourse.amountMillimes,
    visibility: (dbCourse.visibility as Course["visibility"]) || "LOCKED",
    thumbnailUrl: dbCourse.thumbnailUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80",
    durationMinutes,
    totalLessons,
    rating: dbCourse.rating || 5.0,
    reviewCount: dbCourse.reviewCount || 0,
    studentCount: dbCourse.studentCount || 0,
    sections,
    createdAt: dbCourse.createdAt instanceof Date ? dbCourse.createdAt.toISOString() : String(dbCourse.createdAt),
    updatedAt: dbCourse.updatedAt instanceof Date ? dbCourse.updatedAt.toISOString() : String(dbCourse.updatedAt),
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser(request);

  let course: Course | null = null;
  let teacherUserId: string | null = null;

  try {
    const dbCourse = await prisma.course.findUnique({
      where: { id },
      include: {
        teacher: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (dbCourse) {
      course = mapDbCourse(dbCourse);
      teacherUserId = dbCourse.teacher?.userId || null;
    }
  } catch (error) {
    console.warn("DB course lookup failed", error);
  }

  if (!course) {
    course = coursesStore.getCourseById(id);
  }

  if (!course) {
    return NextResponse.json({ error: "Cours introuvable" }, { status: 404 });
  }

  const isTeacher = Boolean(
    user && (
      user.id === course.teacherId ||
      user.id === teacherUserId ||
      user.teacher?.id === course.teacherId ||
      user.role === "ADMIN"
    )
  );

  let hasAccess = isTeacher || course.priceTnd === 0 || course.visibility === "PUBLIC";

  if (!hasAccess && user) {
    try {
      const access = await prisma.courseAccess.findUnique({
        where: { courseId_studentId: { courseId: id, studentId: user.id } },
      });
      if (access) hasAccess = true;
    } catch {}

    if (!hasAccess) {
      hasAccess = coursesStore.hasAccess(id, user.id);
    }
  }

  // Filter content if user does not have full access
  const sanitizedCourse = {
    ...course,
    sections: course.sections.map((sec) => ({
      ...sec,
      lessons: sec.lessons.map((les) => {
        if (hasAccess || les.isFreePreview) {
          return les;
        }
        // Protect locked video content
        return {
          id: les.id,
          title: les.title,
          durationMinutes: les.durationMinutes,
          isFreePreview: false,
          description: "🔒 Contenu réservé. Débloquez ce cours pour accéder à la leçon complète.",
          videoUrl: undefined,
          resources: undefined,
        };
      }),
    })),
  };

  let progress = null;
  if (user) {
    try {
      const dbProgress = await prisma.courseProgress.findUnique({
        where: { courseId_studentId: { courseId: id, studentId: user.id } },
      });
      if (dbProgress) {
        progress = {
          courseId: id,
          studentId: user.id,
          completedLessonIds: Array.isArray(dbProgress.completedLessonIds) ? dbProgress.completedLessonIds : [],
          lastLessonId: dbProgress.lastLessonId || undefined,
          percentage: dbProgress.percentage || 0,
        };
      }
    } catch {}

    if (!progress) {
      progress = coursesStore.getProgress(id, user.id);
    }
  }

  return NextResponse.json({
    course: sanitizedCourse,
    hasAccess,
    isTeacher,
    progress,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser(request);

  let dbCourse = null;
  try {
    dbCourse = await prisma.course.findUnique({
      where: { id },
      include: { teacher: true },
    });
  } catch {}

  const fallbackCourse = !dbCourse ? coursesStore.getCourseById(id) : null;
  if (!dbCourse && !fallbackCourse) {
    return NextResponse.json({ error: "Cours introuvable" }, { status: 404 });
  }

  const teacherUserId = dbCourse?.teacher?.userId || fallbackCourse?.teacherId;
  const teacherProfileId = dbCourse?.teacherId || fallbackCourse?.teacherId;

  const isOwner = Boolean(
    user && (
      user.id === teacherUserId ||
      user.teacher?.id === teacherProfileId ||
      user.role === "ADMIN"
    )
  );

  if (!isOwner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const allowedFields = ["title", "description", "subject", "level", "language", "priceTnd", "visibility", "thumbnailUrl", "sections"];
    const updates = Object.fromEntries(Object.entries(body).filter(([key]) => allowedFields.includes(key)));

    if ("priceTnd" in updates && (!Number.isFinite(Number(updates.priceTnd)) || Number(updates.priceTnd) < 0)) {
      return NextResponse.json({ error: "Tarif invalide" }, { status: 400 });
    }
    if ("visibility" in updates && !["PUBLIC", "LOCKED", "PRIVATE", "DRAFT"].includes(String(updates.visibility))) {
      return NextResponse.json({ error: "Visibilité invalide" }, { status: 400 });
    }

    if ("priceTnd" in updates) {
      updates.amountMillimes = Math.round(Number(updates.priceTnd) * 1000);
    }

    let updatedCourse: Course | null = null;
    if (dbCourse) {
      const updatedDb = await prisma.course.update({
        where: { id },
        data: updates,
        include: {
          teacher: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });
      updatedCourse = mapDbCourse(updatedDb);
    }

    // Sync memory
    const memoryUpdated = coursesStore.updateCourse(id, updates);
    if (!updatedCourse) updatedCourse = memoryUpdated;

    return NextResponse.json({ success: true, course: updatedCourse });
  } catch (err) {
    console.error("Course update failed", err);
    return NextResponse.json({ error: "Erreur de mise à jour" }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser(request);

  let dbCourse = null;
  try {
    dbCourse = await prisma.course.findUnique({
      where: { id },
      include: { teacher: true },
    });
  } catch {}

  const fallbackCourse = !dbCourse ? coursesStore.getCourseById(id) : null;
  if (!dbCourse && !fallbackCourse) {
    return NextResponse.json({ error: "Cours introuvable" }, { status: 404 });
  }

  const teacherUserId = dbCourse?.teacher?.userId || fallbackCourse?.teacherId;
  const teacherProfileId = dbCourse?.teacherId || fallbackCourse?.teacherId;

  const isOwner = Boolean(
    user && (
      user.id === teacherUserId ||
      user.teacher?.id === teacherProfileId ||
      user.role === "ADMIN"
    )
  );

  if (!isOwner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    if (dbCourse) {
      await prisma.course.delete({ where: { id } });
    }
  } catch (err) {
    console.warn("DB course delete error", err);
  }

  coursesStore.deleteCourse(id);
  return NextResponse.json({ success: true, message: "Cours supprimé" });
}
