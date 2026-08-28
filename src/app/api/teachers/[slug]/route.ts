import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { fallbackStore } from "@/lib/server/fallback-store";
import { getCurrentUser } from "@/lib/server/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  try {
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

    // Not yet approved by an admin: invisible to the public, same as a
    // profile that doesn't exist — except to the teacher previewing their
    // own pending profile, or an admin reviewing it.
    if (profile && profile.verificationStatus !== "APPROVED") {
      const viewer = await getCurrentUser(request);
      const canPreview = viewer && (viewer.id === profile.userId || viewer.role === "ADMIN");
      if (!canPreview) {
        return NextResponse.json({ error: "Professeur introuvable." }, { status: 404 });
      }
    }

    if (profile) {
      const avgRating =
        profile.reviews.length > 0
          ? Number((profile.reviews.reduce((acc, r) => acc + r.rating, 0) / profile.reviews.length).toFixed(1))
          : 5.0;

      return NextResponse.json({
        id: profile.id,
        userId: profile.userId,
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
    }
  } catch (error) {
    console.warn("Prisma teacher fetch by slug failed, checking fallback store", error);
  }

  // Fallback store lookup
  const user = fallbackStore.getTeacherBySlug(slug);
  if (user && user.teacher) {
    const t = user.teacher;

    if (t.verificationStatus !== "APPROVED") {
      const viewer = await getCurrentUser(request);
      const canPreview = viewer && (viewer.id === t.userId || viewer.role === "ADMIN");
      if (!canPreview) {
        return NextResponse.json({ error: "Professeur introuvable." }, { status: 404 });
      }
    }

    const name = `${user.firstName} ${user.lastName}`.trim();
    const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();

    return NextResponse.json({
      id: t.id,
      userId: t.userId,
      slug: t.slug,
      avatarUrl: t.avatarUrl,
      name,
      initials,
      title: t.title ?? "Professeur particulier",
      bio: t.bio ?? "Aucune biographie fournie.",
      experienceYears: t.experienceYears,
      hourlyRateMillimes: t.hourlyRateMillimes,
      rateTnd: t.hourlyRateMillimes / 1000,
      governorate: t.governorate ?? "Tunis",
      city: t.city ?? "",
      online: t.online,
      inPerson: t.inPerson,
      verificationStatus: t.verificationStatus,
      subjects: t.subjects || ["Mathématiques"],
      availabilities: t.availabilities,
      rating: t.rating ?? 5.0,
      reviewsCount: t.reviewsCount ?? (t.reviews?.length || 0),
      reviews: t.reviews?.map((r) => ({
        id: r.id,
        studentName: r.studentName,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
      })) || [],
    });
  }

  return NextResponse.json({ error: "Professeur introuvable." }, { status: 404 });
}
