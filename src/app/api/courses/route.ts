import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { coursesStore, Course, CourseSection } from "@/lib/server/courses-store";
import { notifyUser } from "@/lib/server/notification-service";

function mapDbCourseToResponse(dbCourse: {
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subject = searchParams.get("subject") || undefined;
  const level = searchParams.get("level") || undefined;
  const search = searchParams.get("search") || undefined;
  const teacherId = searchParams.get("teacherId") || undefined;
  const user = await getCurrentUser(request);

  try {
    // If querying by teacherId (e.g. for teacher dashboard or teacher profile)
    if (teacherId) {
      const isOwnerTeacher = Boolean(
        user && (user.id === teacherId || user.teacher?.id === teacherId || user.role === "ADMIN")
      );

      const dbCourses = await prisma.course.findMany({
        where: {
          OR: [
            { teacherId },
            { teacher: { userId: teacherId } },
            { teacher: { id: teacherId } },
          ],
          ...(isOwnerTeacher ? {} : { visibility: { in: ["PUBLIC", "LOCKED"] } }),
          ...(subject ? { subject: { contains: subject, mode: "insensitive" } } : {}),
          ...(level ? { level: { contains: level, mode: "insensitive" } } : {}),
        },
        include: {
          teacher: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const courses = dbCourses.map(mapDbCourseToResponse);
      return NextResponse.json({ courses });
    }

    // Public catalog & Homepage query: show all published courses for everyone
    const dbCourses = await prisma.course.findMany({
      where: {
        visibility: { in: ["PUBLIC", "LOCKED"] },
        ...(subject ? { subject: { contains: subject, mode: "insensitive" } } : {}),
        ...(level ? { level: { contains: level, mode: "insensitive" } } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { subject: { contains: search, mode: "insensitive" } },
                { teacher: { user: { firstName: { contains: search, mode: "insensitive" } } } },
                { teacher: { user: { lastName: { contains: search, mode: "insensitive" } } } },
              ],
            }
          : {}),
      },
      include: {
        teacher: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const courses = dbCourses.map(mapDbCourseToResponse);
    return NextResponse.json({ courses });
  } catch (error) {
    console.warn("DB Courses query fallback to memory", error);
    const isOwnerTeacher = Boolean(
      user && teacherId && (user.id === teacherId || user.teacher?.id === teacherId || user.role === "ADMIN")
    );
    const fallbackCourses = coursesStore.getAllCourses({
      subject,
      level,
      search,
      teacherId,
      visibility: isOwnerTeacher ? "ALL" : undefined,
    });
    return NextResponse.json({ courses: fallbackCourses });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN" && !user.teacher)) {
    return NextResponse.json({ error: "Réservé aux enseignants" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, description, subject, level, language, priceTnd, visibility, thumbnailUrl, sections } = body;

    if (![title, description, subject, level].every((value) => typeof value === "string" && value.trim())) {
      return NextResponse.json({ error: "Le titre, la description, la matière et le niveau sont obligatoires." }, { status: 400 });
    }

    const price = Number(priceTnd);
    if (!Number.isFinite(price) || price < 0 || price > 10000) {
      return NextResponse.json({ error: "Le tarif doit être compris entre 0 et 10 000 DT." }, { status: 400 });
    }

    const allowedVisibility = ["PUBLIC", "LOCKED", "PRIVATE", "DRAFT"];
    if (visibility && !allowedVisibility.includes(visibility)) {
      return NextResponse.json({ error: "Visibilité de cours invalide." }, { status: 400 });
    }

    if (!Array.isArray(sections) || sections.length === 0 || !sections.every((section) =>
      section && typeof section.title === "string" && section.title.trim() && Array.isArray(section.lessons) &&
      section.lessons.length > 0 && section.lessons.every((lesson: { title?: unknown; durationMinutes?: unknown; videoUrl?: unknown }) =>
        typeof lesson.title === "string" && lesson.title.trim() && Number.isInteger(Number(lesson.durationMinutes)) &&
        Number(lesson.durationMinutes) >= 1 && typeof lesson.videoUrl === "string" && lesson.videoUrl.trim()
      )
    )) {
      return NextResponse.json({ error: "Ajoutez au moins un module et une leçon vidéo valide." }, { status: 400 });
    }

    // Ensure teacher profile exists in DB
    let teacherProfile = user.teacher;
    if (!teacherProfile) {
      teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: user.id },
        include: { subjects: true, availabilities: true },
      });
    }

    if (!teacherProfile) {
      const slug = `${user.firstName}-${user.lastName}-${Date.now()}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      teacherProfile = await prisma.teacherProfile.create({
        data: {
          userId: user.id,
          slug,
          hourlyRateMillimes: 25000,
          experienceYears: 1,
          verificationStatus: "APPROVED",
          online: true,
        },
        include: { subjects: true, availabilities: true },
      });
    }

    // Format sections and lessons with unique IDs
    const formattedSections = (sections as CourseSection[]).map((sec, sIdx) => {
      const secId = sec.id || `sec_${Date.now()}_${sIdx}`;
      const formattedLessons = (sec.lessons || []).map((les, lIdx) => ({
        ...les,
        id: les.id || `les_${Date.now()}_${sIdx}_${lIdx}`,
        durationMinutes: Number(les.durationMinutes) || 30,
        isFreePreview: Boolean(les.isFreePreview),
      }));
      return {
        ...sec,
        id: secId,
        lessons: formattedLessons,
      };
    });

    const chosenVisibility = visibility || (price === 0 ? "PUBLIC" : "LOCKED");
    const defaultThumb = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80";

    const createdDbCourse = await prisma.course.create({
      data: {
        teacherId: teacherProfile.id,
        title: title.trim(),
        description: description.trim(),
        subject: subject.trim(),
        level: level.trim(),
        language: language?.trim() || "Français",
        priceTnd: price,
        amountMillimes: Math.round(price * 1000),
        visibility: chosenVisibility,
        thumbnailUrl: thumbnailUrl?.trim() || defaultThumb,
        sections: formattedSections,
        rating: 5.0,
        reviewCount: 0,
        studentCount: 0,
      },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    const mappedCourse = mapDbCourseToResponse(createdDbCourse);

    // Sync in memory store
    coursesStore.createCourse({
      ...mappedCourse,
      teacherId: teacherProfile.id,
    });

    await notifyUser({
      userId: user.id,
      type: "COURSE_PUBLISHED",
      title: "Cours publié avec succès ! ",
      message: `Votre cours "${title}" (${price > 0 ? `${price} DT` : "Gratuit"}) a été publié et est accessible sur la plateforme.`,
      emailSubject: `Votre cours "${title}" est en ligne sur Profy`,
      link: `/courses/${createdDbCourse.id}`,
      dedupeKey: `course_published:${createdDbCourse.id}`,
    });

    return NextResponse.json({ success: true, course: mappedCourse }, { status: 201 });
  } catch (err) {
    console.error("Course creation failed", err);
    return NextResponse.json({ error: "Impossible de créer le cours dans la base de données." }, { status: 500 });
  }
}
