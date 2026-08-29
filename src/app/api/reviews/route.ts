import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { notifyUser } from "@/lib/server/notification-service";
import { z } from "zod";

const createReviewSchema = z.object({
  teacherId: z.string().min(1).optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(5).max(1000),
});

export async function GET() {
  try {
    const reviews = await prisma.review.findMany({
      include: {
        student: { select: { firstName: true, lastName: true } },
        teacher: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            subjects: { select: { subject: true }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json({ reviews: reviews.map((review) => ({ id: review.id, name: `${review.student.firstName} ${review.student.lastName?.[0] ?? ""}.`, role: `Élève en cours de ${review.teacher?.subjects[0]?.subject || "cours particulier"}`, teacherName: `${review.teacher.user.firstName} ${review.teacher.user.lastName}`, rating: review.rating, text: review.comment || "", createdAt: review.createdAt })) });
  } catch (error) {
    console.warn("Reviews fetch failed", error);
    return NextResponse.json({ reviews: [] });
  }
}

export async function POST(request: Request) {
  const parsed = createReviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Veuillez choisir une note et écrire un commentaire valide." }, { status: 400 });
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Connectez-vous pour publier un avis." }, { status: 401 });
  }
  if (user.role !== "STUDENT") {
    return NextResponse.json({ error: "Seuls les élèves peuvent publier un avis." }, { status: 403 });
  }
  try {
    // "Évaluations certifiées après chaque séance" only means something if
    // a review actually requires a completed lesson with that teacher —
    // without this, any student could rate any (or, with no teacherId at
    // all, a completely arbitrary) approved teacher they never studied with.
    const completedBookings = await prisma.booking.findMany({
      where: { studentId: user.id, status: "COMPLETED" },
      select: { teacherId: true },
      orderBy: { startsAt: "desc" },
    });
    if (completedBookings.length === 0) {
      return NextResponse.json(
        { error: "Vous devez avoir terminé une séance avec un professeur pour laisser un avis." },
        { status: 403 },
      );
    }

    const completedTeacherIds = new Set(completedBookings.map((b) => b.teacherId));
    const targetTeacherId = parsed.data.teacherId ?? completedBookings[0].teacherId;

    if (!completedTeacherIds.has(targetTeacherId)) {
      return NextResponse.json(
        { error: "Vous devez avoir terminé une séance avec ce professeur pour lui laisser un avis." },
        { status: 403 },
      );
    }

    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: targetTeacherId },
      select: { id: true, userId: true, slug: true },
    });
    if (!teacher) return NextResponse.json({ error: "Professeur introuvable." }, { status: 404 });
    const review = await prisma.review.create({ data: { studentId: user.id, teacherId: teacher.id, rating: parsed.data.rating, comment: parsed.data.comment } });
    await notifyUser({ userId: teacher.userId, type: "NEW_REVIEW", title: "Nouvel avis reçu ", message: `Nouvel avis ${parsed.data.rating}/5 reçu.`, emailSubject: "Nouvel avis reçu", link: `/teachers/${teacher.slug}`, dedupeKey: `review:${review.id}` }).catch((notificationError) => {
      console.warn("Review notification failed", notificationError);
    });
    return NextResponse.json({ success: true, reviewId: review.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Impossible d'enregistrer votre avis." }, { status: 500 });
  }
}
