import type { Metadata } from "next";
import { prisma } from "@/lib/server/prisma";
import { CourseDetailClient } from "./course-detail-client";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;

  try {
    const course = await prisma.course.findUnique({
      where: { id },
      include: { teacher: { include: { user: { select: { firstName: true, lastName: true } } } } },
    });

    if (!course) {
      return { title: "Cours introuvable | ProfySpace.tn" };
    }

    const teacherName = `${course.teacher.user.firstName} ${course.teacher.user.lastName}`.trim();
    const title = `${course.title} — ${course.subject} | ProfySpace.tn`;
    const description = course.description?.slice(0, 155) || `Cours de ${course.subject} par ${teacherName}, niveau ${course.level}, sur ProfySpace.tn.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        images: course.thumbnailUrl ? [course.thumbnailUrl] : undefined,
      },
    };
  } catch {
    return { title: "Cours | ProfySpace.tn" };
  }
}

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CourseDetailClient id={id} />;
}
