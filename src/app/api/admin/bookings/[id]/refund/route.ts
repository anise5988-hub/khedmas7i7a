import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { logAdminAction } from "@/lib/server/audit-log";
import { notifyUser } from "@/lib/server/notification-service";

export const runtime = "nodejs";

/**
 * POST /api/admin/bookings/[id]/refund — admin only.
 *
 * Refunds a paid reservation in full:
 *  - the student's wallet gets the gross amount back (REFUND);
 *  - if the teacher was already credited for it (booking accepted or
 *    completed), that net earning is reversed out of their wallet so the
 *    platform doesn't pay the same lesson twice.
 *
 * Everything runs in one transaction. The Payment status flip is the guard:
 * a second click finds it already REFUNDED and changes nothing.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentUser(request);
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const { id: bookingId } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { teacher: { select: { userId: true } }, payment: true },
  });
  if (!booking) return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
  if (!booking.payment || booking.payment.status !== "PAID") {
    return NextResponse.json({ error: "Cette réservation n'a pas de paiement remboursable." }, { status: 409 });
  }

  const wasCredited = booking.status === "CONFIRMED" || booking.status === "COMPLETED";
  if (!["PENDING", "CONFIRMED", "COMPLETED"].includes(booking.status)) {
    return NextResponse.json({ error: "Cette réservation ne peut pas être remboursée." }, { status: 409 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const flip = await tx.payment.updateMany({
        where: { id: booking.payment!.id, status: "PAID" },
        data: { status: "REFUNDED" },
      });
      if (flip.count !== 1) throw new Error("ALREADY_REFUNDED");

      await tx.booking.updateMany({
        where: { id: bookingId, status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] } },
        data: { status: "CANCELLED" },
      });

      const studentWallet = await tx.wallet.upsert({
        where: { userId: booking.studentId },
        update: { availableMillimes: { increment: booking.amountMillimes } },
        create: { userId: booking.studentId, availableMillimes: booking.amountMillimes, pendingMillimes: 0 },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: studentWallet.id,
          type: "REFUND",
          amountMillimes: booking.amountMillimes,
          reference: `REFUND-BOOK-${booking.id}`,
        },
      });

      if (wasCredited) {
        const earning = await tx.walletTransaction.findUnique({
          where: { reference: `EARN-BOOK-${booking.id}` },
        });
        const netEarned = earning?.amountMillimes ?? 0;
        if (netEarned > 0) {
          const teacherWallet = await tx.wallet.findUnique({ where: { userId: booking.teacher.userId } });
          const debited = teacherWallet
            ? await tx.wallet.updateMany({
                where: { id: teacherWallet.id, availableMillimes: { gte: netEarned } },
                data: { availableMillimes: { decrement: netEarned } },
              })
            : null;
          if (!debited || debited.count !== 1) throw new Error("TEACHER_BALANCE_TOO_LOW");

          await tx.walletTransaction.create({
            data: {
              walletId: teacherWallet!.id,
              type: "TEACHER_EARNING_REVERSAL",
              amountMillimes: -netEarned,
              reference: `REVERSE-EARN-BOOK-${booking.id}`,
            },
          });
        }
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_REFUNDED") {
      return NextResponse.json({ error: "Cette réservation a déjà été remboursée." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "TEACHER_BALANCE_TOO_LOW") {
      return NextResponse.json(
        { error: "Le solde du professeur ne couvre plus ce montant (déjà retiré). Remboursement annulé." },
        { status: 409 },
      );
    }
    console.error("Admin booking refund failed", error);
    return NextResponse.json({ error: "Impossible de rembourser cette réservation." }, { status: 500 });
  }

  await logAdminAction({
    actor: admin,
    action: "BOOKING_REFUNDED",
    targetType: "Booking",
    targetId: booking.id,
    metadata: { amountMillimes: booking.amountMillimes, reversedTeacherEarning: wasCredited },
  });

  await notifyUser({
    userId: booking.studentId,
    type: "BOOKING_CANCELLED",
    title: "Réservation remboursée",
    message: "Votre réservation a été remboursée. Le montant a été recrédité à votre portefeuille.",
    emailSubject: "Remboursement de votre réservation Profy",
    link: "/dashboard/wallet",
    dedupeKey: `booking_refunded:${booking.id}`,
  });

  return NextResponse.json({ success: true, message: "Réservation remboursée." });
}
