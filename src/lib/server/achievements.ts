import { prisma } from "@/lib/server/prisma";

export type Achievement = {
  slug: string;
  title: string;
  description: string;
  earned: boolean;
};

/**
 * Badges are computed live from existing Booking/Review data on every
 * request rather than persisted — this is a v1 gamification layer with
 * zero schema footprint, so it ships without any migration risk. If we
 * later want earned-date history, that's a deliberate follow-up, not an
 * accident of this design.
 */
export async function getStudentAchievements(studentUserId: string): Promise<Achievement[]> {
  const [completedBookingCount, reviewCount] = await Promise.all([
    prisma.booking.count({ where: { studentId: studentUserId, status: "COMPLETED" } }),
    prisma.review.count({ where: { studentId: studentUserId } }),
  ]);

  return [
    {
      slug: "premiere-reservation",
      title: "Première réservation",
      description: "Compléter votre première séance de cours.",
      earned: completedBookingCount >= 1,
    },
    {
      slug: "eleve-assidu",
      title: "Élève assidu",
      description: "Compléter 5 séances de cours.",
      earned: completedBookingCount >= 5,
    },
    {
      slug: "habitue-profyspace",
      title: "Habitué de ProfySpace",
      description: "Compléter 10 séances de cours.",
      earned: completedBookingCount >= 10,
    },
    {
      slug: "critique-engage",
      title: "Critique engagé(e)",
      description: "Publier 3 avis sur vos professeurs.",
      earned: reviewCount >= 3,
    },
  ];
}

export async function getTeacherAchievements(teacherProfileId: string, teacherUserCreatedAt: Date): Promise<Achievement[]> {
  const [completedBookings, reviewStats, manualGrants] = await Promise.all([
    prisma.booking.findMany({
      where: { teacherId: teacherProfileId, status: "COMPLETED" },
      select: { studentId: true },
    }),
    prisma.review.aggregate({
      where: { teacherId: teacherProfileId },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.teacherManualBadge.findMany({
      where: { teacherProfileId },
      select: { slug: true },
    }),
  ]);
  const manualSlugs = new Set(manualGrants.map((g) => g.slug));

  const completedBookingCount = completedBookings.length;
  const distinctStudentCount = new Set(completedBookings.map((b) => b.studentId)).size;
  const avgRating = reviewStats._avg.rating ?? 0;
  const reviewCount = reviewStats._count.rating;
  const accountAgeMonths = (Date.now() - teacherUserCreatedAt.getTime()) / (1000 * 60 * 60 * 24 * 30);

  return [
    {
      slug: "premier-cours-donne",
      title: "Premier cours donné",
      description: "Compléter votre première séance en tant que professeur.",
      earned: completedBookingCount >= 1 || manualSlugs.has("premier-cours-donne"),
    },
    {
      slug: "professeur-populaire",
      title: "Professeur populaire",
      description: "Enseigner à 10 élèves différents.",
      earned: distinctStudentCount >= 10 || manualSlugs.has("professeur-populaire"),
    },
    {
      slug: "excellence-pedagogique",
      title: "Excellence pédagogique",
      description: "Maintenir une note moyenne de 4.8+ sur au moins 5 avis.",
      earned: (avgRating >= 4.8 && reviewCount >= 5) || manualSlugs.has("excellence-pedagogique"),
    },
    {
      slug: "veteran-profyspace",
      title: "Vétéran ProfySpace",
      description: "Faire partie de ProfySpace depuis 6 mois ou plus.",
      earned: accountAgeMonths >= 6 || manualSlugs.has("veteran-profyspace"),
    },
  ];
}
