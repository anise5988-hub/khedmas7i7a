import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { fallbackStore } from "@/lib/server/fallback-store";
import { getPublicPortfolio } from "@/lib/server/portfolio";
import { sortLevelSlugs } from "@/lib/domain/catalog";

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
        levels: { select: { levelSlug: true } },
        availabilities: true,
        reviews: {
          include: {
            student: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // Not yet approved by an admin: this public page must keep returning 404,
    // never a 403 — a distinct status would leak the existence of pending or
    // rejected applications to anyone who guesses a slug. The owner previews
    // their own profile through the teacher dashboard, not this route.
    if (profile && profile.verificationStatus !== "APPROVED") {
      return NextResponse.json({ error: "Professeur introuvable." }, { status: 404 });
    }

    if (profile) {
      const avgRating =
        profile.reviews.length > 0
          ? Number((profile.reviews.reduce((acc, r) => acc + r.rating, 0) / profile.reviews.length).toFixed(1))
          : 5.0;

      const portfolio =
        profile.verificationStatus === "APPROVED" ? await getPublicPortfolio(profile.id) : [];

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
        levels: sortLevelSlugs(profile.levels.map((l) => l.levelSlug)),
        availabilities: profile.availabilities,
        rating: avgRating,
        reviewsCount: profile.reviews.length,
        portfolio: portfolio.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          type: item.type,
          subject: item.subject,
          level: item.level,
          mediaUrl: item.mediaUrl,
          thumbnailUrl: item.thumbnailUrl,
          externalUrl: item.externalUrl,
          createdAt: item.createdAt,
        })),
        reviews: profile.reviews.map((r) => ({
          id: r.id,
          studentName: `${r.student.firstName} ${r.student.lastName?.[0] ?? ""}.`,
          rating: r.rating,
          comment: r.comment,
          photoUrl: r.photoUrl,
          teacherReply: r.teacherReply,
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
      return NextResponse.json({ error: "Professeur introuvable." }, { status: 404 });
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
      levels: sortLevelSlugs(t.levels ?? []),
      availabilities: t.availabilities,
      rating: t.rating ?? 5.0,
      reviewsCount: t.reviewsCount ?? (t.reviews?.length || 0),
      portfolio: [],
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
