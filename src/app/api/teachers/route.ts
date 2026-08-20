import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  try {
    const profiles = await prisma.teacherProfile.findMany({
      where: { verificationStatus: "APPROVED" },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        subjects: { select: { subject: true } },
        reviews: { select: { rating: true } },
        availabilities: true,
      },
      orderBy: { id: "desc" },
    });

    const teachers = profiles.map((profile) => {
      const initials = `${profile.user.firstName?.[0] ?? ""}${profile.user.lastName?.[0] ?? ""}`.toUpperCase();
      const name = `${profile.user.firstName} ${profile.user.lastName}`.trim();
      const avgRating =
        profile.reviews.length > 0
          ? Number((profile.reviews.reduce((acc, r) => acc + r.rating, 0) / profile.reviews.length).toFixed(1))
          : 5.0;

      return {
        id: profile.id,
        slug: profile.slug,
        avatarUrl: profile.avatarUrl,
        initials,
        name,
        title: profile.title ?? "Professeur particulier",
        bio: profile.bio ?? "",
        subjects: profile.subjects.map((s) => s.subject),
        subject: profile.subjects[0]?.subject ?? "Général",
        level: "Tous niveaux",
        city: profile.city ?? profile.governorate ?? "Tunisie",
        governorate: profile.governorate ?? "Tunis",
        rate: profile.hourlyRateMillimes / 1000,
        hourlyRateMillimes: profile.hourlyRateMillimes,
        rating: avgRating,
        reviewsCount: profile.reviews.length,
        experience: profile.experienceYears,
        online: profile.online,
        inPerson: profile.inPerson,
        availabilities: profile.availabilities,
      };
    });

    return NextResponse.json(teachers);
  } catch (error) {
    console.error("Teachers fetch failed", error);
    return NextResponse.json({ error: "Impossible de charger les professeurs." }, { status: 503 });
  }
}
