import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { coursesStore } from "@/lib/server/courses-store";
import { prisma } from "@/lib/server/prisma";
import { notificationsStore } from "@/lib/server/notifications-store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Veuillez vous connecter pour débloquer ce cours" }, { status: 401 });
  }

  const { id: courseId } = await params;
  const course = coursesStore.getCourseById(courseId);

  if (!course) {
    return NextResponse.json({ error: "Cours introuvable" }, { status: 404 });
  }

  if (coursesStore.hasAccess(courseId, user.id)) {
    return NextResponse.json({ success: true, message: "Vous possédez déjà l'accès à ce cours", alreadyOwned: true });
  }

  const requiredMillimes = course.amountMillimes;

  // Free course access
  if (requiredMillimes === 0 || course.priceTnd === 0) {
    coursesStore.grantAccess(courseId, user.id, 0);
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

  // Deduct from student wallet
  try {
    await prisma.wallet.update({
      where: { userId: user.id },
      data: {
        availableMillimes: { decrement: requiredMillimes },
        transactions: {
          create: {
            type: "BOOKING_PAYMENT",
            amountMillimes: -requiredMillimes,
            reference: `Achat Cours: ${course.title} (${Date.now()})`,
          },
        },
      },
    });
  } catch (dbErr) {
    console.warn("Wallet deduction DB warning:", dbErr);
  }

  // Grant course access
  coursesStore.grantAccess(courseId, user.id, course.priceTnd);

  // Send notifications to teacher and student
  notificationsStore.addNotification({
    userId: course.teacherId,
    title: "Nouveau membre inscrit à votre cours ! 🎉",
    message: `${user.firstName} ${user.lastName} vient de débloquer votre cours "${course.title}" (${course.priceTnd} DT).`,
    type: "SUCCESS",
    link: "/teacher/dashboard/courses",
  });

  notificationsStore.addNotification({
    userId: user.id,
    title: "Cours débloqué avec succès ! 🔓",
    message: `Vous avez désormais un accès illimité au cours "${course.title}". Bon apprentissage !`,
    type: "SUCCESS",
    link: `/courses/${course.id}`,
  });

  return NextResponse.json({
    success: true,
    message: "Félicitations ! Le cours est débloqué.",
    courseId: course.id,
  });
}
