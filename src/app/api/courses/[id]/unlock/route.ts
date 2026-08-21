import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { coursesStore } from "@/lib/server/courses-store";
import { prisma } from "@/lib/server/prisma";
import { notifyUser } from "@/lib/server/notification-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Veuillez vous connecter pour débloquer ce cours" }, { status: 401 });
  }

  const { id: courseId } = await params;
  let course = coursesStore.getCourseById(courseId);
  try {
    const dbCourse = await prisma.course.findUnique({ where: { id: courseId } });
    if (dbCourse && course) {
      course = { ...course, ...dbCourse, visibility: dbCourse.visibility as typeof course.visibility, thumbnailUrl: dbCourse.thumbnailUrl || course.thumbnailUrl, createdAt: dbCourse.createdAt.toISOString(), updatedAt: dbCourse.updatedAt.toISOString(), sections: Array.isArray(dbCourse.sections) ? dbCourse.sections as typeof course.sections : course.sections };
    }
  } catch {}

  if (!course) {
    return NextResponse.json({ error: "Cours introuvable" }, { status: 404 });
  }

  let alreadyHasAccess = false;
  try {
    const access = await prisma.courseAccess.findUnique({
      where: { courseId_studentId: { courseId, studentId: user.id } },
    });
    alreadyHasAccess = Boolean(access);
  } catch {
    alreadyHasAccess = coursesStore.hasAccess(courseId, user.id);
  }
  if (alreadyHasAccess) {
    return NextResponse.json({ success: true, message: "Vous possédez déjà l'accès à ce cours", alreadyOwned: true });
  }

  const requiredMillimes = course.amountMillimes;

  // Free course access
  if (requiredMillimes === 0 || course.priceTnd === 0) {
    await prisma.courseAccess.upsert({ where: { courseId_studentId: { courseId, studentId: user.id } }, update: {}, create: { courseId, studentId: user.id, amountPaidTnd: 0 } }).catch(() => coursesStore.grantAccess(courseId, user.id, 0));
    return NextResponse.json({ success: true, message: "Cours débloqué gratuitement !" });
  }

  // Check student wallet balance
  let studentWallet = null;
  try {
    studentWallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });
  } catch {}

  const availableMillimes = studentWallet ? studentWallet.availableMillimes : 0;

  if (availableMillimes < requiredMillimes) {
    return NextResponse.json(
      {
        error: `Solde insuffisant dans votre portefeuille (${(availableMillimes / 1000).toFixed(1)} DT disponibles). Veuillez recharger au moins ${course.priceTnd} DT.`,
        insufficientBalance: true,
        requiredTnd: course.priceTnd,
        currentTnd: availableMillimes / 1000,
      },
      { status: 400 }
    );
  }

  // Payment and access must be fail-closed: never grant access when the wallet
  // transaction did not complete successfully.
  try {
    await prisma.$transaction(async (tx) => {
      const deduction = await tx.wallet.updateMany({
        where: { userId: user.id, availableMillimes: { gte: requiredMillimes } },
        data: { availableMillimes: { decrement: requiredMillimes } },
      });

      if (deduction.count !== 1) {
        throw new Error("WALLET_BALANCE_CHANGED");
      }

      const updatedWallet = await tx.wallet.findUnique({ where: { userId: user.id } });
      if (!updatedWallet) throw new Error("WALLET_NOT_FOUND");

      await tx.walletTransaction.create({
        data: {
          walletId: updatedWallet.id,
          type: "BOOKING_PAYMENT",
          amountMillimes: -requiredMillimes,
          reference: `Achat Cours: ${course.title} (${Date.now()})`,
        },
      });
    });
  } catch (dbErr) {
    console.error("Course payment failed:", dbErr);
    return NextResponse.json({ error: "Le paiement n'a pas pu être confirmé. Aucun accès n'a été accordé." }, { status: 502 });
  }

  // Grant course access
  await prisma.courseAccess.upsert({ where: { courseId_studentId: { courseId, studentId: user.id } }, update: {}, create: { courseId, studentId: user.id, amountPaidTnd: course.priceTnd } }).catch(() => coursesStore.grantAccess(courseId, user.id, course.priceTnd));

  // Send notifications & emails to teacher and student
  await Promise.all([
    notifyUser({
      userId: course.teacherId,
      type: "COURSE_PURCHASED",
      title: "Nouvelle inscription à votre cours ! 🎉",
      message: `${user.firstName} ${user.lastName} vient d'acheter votre cours "${course.title}" (${course.priceTnd} DT).`,
      emailSubject: `Nouvel élève inscrit à votre cours "${course.title}"`,
      link: "/teacher/dashboard/courses",
      dedupeKey: `course_purchase:${course.id}:${user.id}:${Date.now()}`,
    }),
    notifyUser({
      userId: user.id,
      type: "COURSE_UNLOCKED",
      title: "Cours débloqué avec succès ! 🔓",
      message: `Vous avez désormais un accès illimité au cours "${course.title}". Bon apprentissage !`,
      emailSubject: `Votre cours "${course.title}" est maintenant disponible`,
      link: `/courses/${course.id}`,
      dedupeKey: `course_unlocked:${course.id}:${user.id}:${Date.now()}`,
    }),
  ]);

  return NextResponse.json({
    success: true,
    message: "Félicitations ! Le cours est débloqué.",
    courseId: course.id,
  });
}
