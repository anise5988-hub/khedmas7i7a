import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const profile = await prisma.teacherProfile.findUnique({
      where: { slug },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        subjects: { select: { subject: true } },
        availabilities: true,
        reviews: {
          include: {
            student: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Professeur introuvable." }, { status: 404 });
    }

    const avgRating =
      profile.reviews.length > 0
        ? Number((profile.reviews.reduce((acc, r) => acc + r.rating, 0) / profile.reviews.length).toFixed(1))
        : 5.0;

    return NextResponse.json({
      id: profile.id,
      slug: profile.slug,
      avatarUrl: profile.avatarUrl,
      name: `${profile.user.firstName} ${profile.user.lastName}`.trim(),
      initials: `${profile.user.firstName?.[0] ?? ""}${profile.user.lastName?.[0] ?? ""}`.toUpperCase(),
      title: profile.title ?? "Professeur particulier",
      bio: profile.bio ?? "Aucune biographie fournie.",
      experienceYears: profile.experienceYears,
      hourlyRateMillimes: profile.hourlyRateMillimes,
      rateTnd: profile.hourlyRateMillimes / 1000,
      governorate: profile.governorate ?? "Tunis",
      city: profile.city ?? "",
      online: profile.online,
      inPerson: profile.inPerson,
      verificationStatus: profile.verificationStatus,
      subjects: profile.subjects.map((s) => s.subject),
      availabilities: profile.availabilities,
      rating: avgRating,
      reviewsCount: profile.reviews.length,
      reviews: profile.reviews.map((r) => ({
        id: r.id,
        studentName: `${r.student.firstName} ${r.student.lastName?.[0] ?? ""}.`,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error("Teacher fetch by slug failed", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
