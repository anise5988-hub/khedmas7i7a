import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { coursesStore, CourseSection, Course } from "@/lib/server/courses-store";

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
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ courses: [] });

  try {
    const accesses = await prisma.courseAccess.findMany({
      where: { studentId: user.id },
      include: {
        course: {
          include: {
            teacher: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
      orderBy: { purchasedAt: "desc" },
    });

    const publicDbCourses = await prisma.course.findMany({
      where: {
        OR: [{ visibility: "PUBLIC" }, { priceTnd: 0 }],
      },
      include: {
        teacher: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    const purchasedIds = new Set(accesses.map((a) => a.courseId));

    const result = [
      ...accesses.map((a) => ({
        course: mapDbCourse(a.course),
        access: {
          id: a.id,
          courseId: a.courseId,
          studentId: a.studentId,
          purchasedAt: a.purchasedAt.toISOString(),
          amountPaidTnd: a.amountPaidTnd,
        },
      })),
      ...publicDbCourses
        .filter((c) => !purchasedIds.has(c.id))
        .map((c) => {
          const mapped = mapDbCourse(c);
          return {
            course: mapped,
            access: {
              id: `free_${c.id}`,
              courseId: c.id,
              studentId: user.id,
              purchasedAt: c.createdAt.toISOString(),
              amountPaidTnd: 0,
            },
          };
        }),
    ];

    return NextResponse.json({ courses: result });
  } catch (error) {
    console.warn("DB My learning courses fetch error, using fallback", error);
    const purchased = coursesStore.getStudentPurchasedCourses(user.id);
    const publicCourses = coursesStore.getAllCourses({ visibility: "PUBLIC" });
    const purchasedIds = new Set(purchased.map((entry) => entry.course.id));
    return NextResponse.json({
      courses: [
        ...purchased.map((entry) => ({ course: entry.course, access: entry.access })),
        ...publicCourses
          .filter((course) => !purchasedIds.has(course.id))
          .map((course) => ({
            course,
            access: {
              id: `free_${course.id}`,
              courseId: course.id,
              studentId: user.id,
              purchasedAt: course.createdAt,
              amountPaidTnd: 0,
            },
          })),
      ],
    });
  }
}