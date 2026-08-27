import type { Metadata } from "next";
import { prisma } from "@/lib/server/prisma";
import { TeacherProfileClient } from "./teacher-profile-client";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  try {
    const teacher = await prisma.teacherProfile.findUnique({
      where: { slug },
      include: {
        user: { select: { firstName: true, lastName: true } },
        subjects: { select: { subject: true }, take: 3 },
      },
    });

    if (!teacher) {
      return { title: "Professeur introuvable | ProfySpace.tn" };
    }

    const name = `${teacher.user.firstName} ${teacher.user.lastName}`.trim();
    const subjectList = teacher.subjects.map((s) => s.subject).join(", ");
    const title = subjectList
      ? `${name} — Cours de ${subjectList} | ProfySpace.tn`
      : `${name} — Professeur particulier | ProfySpace.tn`;
    const description =
      teacher.bio?.slice(0, 155) ||
      `Réservez une séance avec ${name}, professeur particulier vérifié${subjectList ? ` pour ${subjectList}` : ""} en Tunisie, à partir de ${(teacher.hourlyRateMillimes / 1000).toFixed(0)} DT/h.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "profile",
        images: teacher.avatarUrl ? [teacher.avatarUrl] : undefined,
      },
    };
  } catch {
    return { title: "Profil professeur | ProfySpace.tn" };
  }
}

export default async function TeacherProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TeacherProfileClient slug={slug} />;
}
