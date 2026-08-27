import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { fallbackStore } from "@/lib/server/fallback-store";

export async function GET() {
  try {
    const profiles = await prisma.teacherProfile.findMany({
      where: {
        verificationStatus: { not: "REJECTED" },
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        subjects: { select: { subject: true } },
        levels: { select: { levelSlug: true } },
        reviews: { select: { rating: true } },
        availabilities: true,
      },
      orderBy: { id: "desc" },
    });

    if (profiles && profiles.length > 0) {
      const dbTeachers = profiles.map((profile) => {
        const initials = `${profile.user?.firstName?.[0] ?? "P"}${profile.user?.lastName?.[0] ?? "R"}`.toUpperCase();
        const name = `${profile.user?.firstName || "Enseignant"} ${profile.user?.lastName || "Profy"}`.trim();
        const avgRating =
          profile.reviews.length > 0
            ? Number((profile.reviews.reduce((acc, r) => acc + r.rating, 0) / profile.reviews.length).toFixed(1))
            : 5.0;

        const subjectsList = profile.subjects.length > 0
          ? profile.subjects.map((s) => s.subject)
          : ["Mathématiques", "Physique-Chimie"];

        return {
          id: profile.id,
          userId: profile.userId,
          slug: profile.slug,
          avatarUrl: profile.avatarUrl,
          initials,
          name,
          title: profile.title ?? "Professeur certifié",
          bio: profile.bio ?? "Enseignant qualifié et expérimenté pour cours particuliers et soutien scolaire en ligne ou présentiel.",
          subjects: subjectsList,
          subject: subjectsList[0] ?? "Mathématiques",
          levels: profile.levels.map((l) => l.levelSlug),
          city: profile.city ?? profile.governorate ?? "Tunis",
          governorate: profile.governorate ?? "Tunis",
          rate: (profile.hourlyRateMillimes || 25000) / 1000,
          hourlyRateMillimes: profile.hourlyRateMillimes || 25000,
          rating: avgRating,
          reviewsCount: profile.reviews.length,
          experience: profile.experienceYears || 2,
          online: profile.online,
          inPerson: profile.inPerson,
          availabilities: profile.availabilities,
          verificationStatus: profile.verificationStatus,
        };
      });

      return NextResponse.json(dbTeachers);
    }
  } catch (error) {
    console.warn("Prisma teachers fetch failed, querying fallback store", error);
  }

  // Only use in-memory teachers when the database is unavailable.
  const fallbackUsers = fallbackStore.getAllTeachers();
  const fallbackTeachers = fallbackUsers
    .filter((u) => u.teacher)
    .map((u) => {
      const t = u.teacher!;
      const initials = `${u.firstName?.[0] ?? "P"}${u.lastName?.[0] ?? "R"}`.toUpperCase();
      const name = `${u.firstName} ${u.lastName}`.trim();

      return {
        id: t.id,
        userId: u.id,
        slug: t.slug,
        avatarUrl: t.avatarUrl,
        initials,
        name,
        title: t.title ?? "Professeur particulier",
        bio: t.bio ?? "",
        subjects: t.subjects || ["Mathématiques"],
        subject: t.subjects?.[0] ?? "Général",
        levels: [] as string[],
        city: t.city ?? t.governorate ?? "Tunisie",
        governorate: t.governorate ?? "Tunis",
        rate: (t.hourlyRateMillimes || 25000) / 1000,
        hourlyRateMillimes: t.hourlyRateMillimes || 25000,
        rating: t.rating ?? 5.0,
        reviewsCount: t.reviewsCount ?? (t.reviews?.length || 0),
        experience: t.experienceYears,
        online: t.online,
        inPerson: t.inPerson,
        availabilities: t.availabilities,
        verificationStatus: t.verificationStatus,
      };
    });

  return NextResponse.json(fallbackTeachers);
}
