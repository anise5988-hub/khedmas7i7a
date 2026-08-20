import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { notifyUser } from "@/lib/server/notification-service";
import { z } from "zod";

const createReviewSchema = z.object({
  teacherId: z.string().min(1).optional(),
  studentName: z.string().trim().min(2).max(80).optional(),
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

    return NextResponse.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        name: `${r.student.firstName} ${r.student.lastName?.[0] ?? ""}.`,
        role: `Élève en cours de ${r.teacher?.subjects[0]?.subject || "cours particulier"}`,
        teacherName: `${r.teacher.user.firstName} ${r.teacher.user.lastName}`,
        rating: r.rating,
        text: r.comment || "",
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error("Reviews fetch failed", error);
    return NextResponse.json({ reviews: [] });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createReviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Veuillez choisir une note (1 à 5) et écrire un commentaire d'au moins 5 caractères." },
      { status: 400 },
    );
  }

  const user = await getCurrentUser(request);

  try {
    // Find teacher or pick first approved teacher
    let teacherId = parsed.data.teacherId;
    if (!teacherId) {
      const firstTeacher = await prisma.teacherProfile.findFirst({
        where: { verificationStatus: "APPROVED" },
        select: { id: true },
      });
      teacherId = firstTeacher?.id;
    }

    if (!teacherId) {
      const anyTeacher = await prisma.teacherProfile.findFirst({ select: { id: true } });
      teacherId = anyTeacher?.id;
    }

    if (!teacherId) {
      return NextResponse.json({ error: "Aucun professeur disponible pour ce commentaire." }, { status: 404 });
    }

    // Determine student ID
    let studentId = user?.id;
    if (!studentId) {
      // Find or create public student user
      const publicUser = await prisma.user.upsert({
        where: { email: "eleve.satisfait@profyspace.tn" },
        update: {
          firstName: parsed.data.studentName?.split(" ")[0] || "Élève",
          lastName: parsed.data.studentName?.split(" ")[1] || "ProfySpace",
        },
        create: {
          firstName: parsed.data.studentName?.split(" ")[0] || "Élève",
          lastName: parsed.data.studentName?.split(" ")[1] || "ProfySpace",
          email: "eleve.satisfait@profyspace.tn",
          passwordHash: "publicGuestReview2026!",
          role: "STUDENT",
        },
      });
      studentId = publicUser.id;
    }

    const review = await prisma.review.create({
      data: {
        studentId,
        teacherId,
        rating: parsed.data.rating,
        comment: parsed.data.comment,
      },
      include: {
        teacher: { select: { userId: true, slug: true } },
      },
    });

    if (review.teacher?.userId) {
      await notifyUser({
        userId: review.teacher.userId,
        type: "NEW_REVIEW",
        title: "Nouvel avis reçu ⭐",
        message: `Un élève vous a attribué une note de ${parsed.data.rating}/5 : "${parsed.data.comment.substring(0, 80)}..."`,
        emailSubject: "Vous avez reçu un nouvel avis sur Profy",
        link: `/teachers/${review.teacher.slug}`,
        dedupeKey: `review:${review.id}`,
      });
    }

    return NextResponse.json(
      {
        success: true,
        reviewId: review.id,
        message: "Merci ! Votre avis a été enregistré et publié avec succès sur ProfySpace.tn.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Review creation failed", error);
    return NextResponse.json({ error: "Impossible d'enregistrer votre avis." }, { status: 500 });
  }
}
