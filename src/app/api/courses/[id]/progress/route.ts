import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id: courseId } = await params;
  try {
    const { lessonId } = await request.json();
    if (!lessonId) {
      return NextResponse.json({ error: "lessonId requis" }, { status: 400 });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { sections: true } });
    const sections = (Array.isArray(course?.sections) ? course.sections : []) as Array<{ lessons?: Array<{ id: string }> }>;
    const totalLessons = sections.reduce((count, section) => count + (section.lessons?.length || 0), 0);
    const existing = await prisma.courseProgress.findUnique({
      where: { courseId_studentId: { courseId, studentId: user.id } },
    });
    const completed = Array.isArray(existing?.completedLessonIds) ? existing.completedLessonIds as string[] : [];
    const completedLessonIds = completed.includes(String(lessonId)) ? completed : [...completed, String(lessonId)];
    const progress = await prisma.courseProgress.upsert({
      where: { courseId_studentId: { courseId, studentId: user.id } },
      update: { completedLessonIds, lastLessonId: String(lessonId), percentage: totalLessons ? Math.min(100, Math.round((completedLessonIds.length / totalLessons) * 100)) : 0 },
      create: { courseId, studentId: user.id, completedLessonIds, lastLessonId: String(lessonId), percentage: totalLessons ? Math.min(100, Math.round((completedLessonIds.length / totalLessons) * 100)) : 0 },
    });
    return NextResponse.json({ success: true, progress });
  } catch {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
}
