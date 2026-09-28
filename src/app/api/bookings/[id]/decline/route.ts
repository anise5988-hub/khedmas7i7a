import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { notifyUser } from "@/lib/server/notification-service";

export const runtime = "nodejs";

/**
 * POST /api/bookings/[id]/decline — teacher-only.
 *
 * The student's payment was taken at request time but never reached the
 * teacher's wallet (see POST /api/bookings and /accept) — declining just
 * hands it straight back, nothing to claw back on the teacher's side. The
 * guarded updateMany makes a double-decline (or a decline racing an accept)
 * a no-op instead of a double refund.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

  const { id: bookingId } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { teacher: { select: { userId: true } }, payment: true },
  });
  if (!booking) return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
  if (booking.teacher.userId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Seul le professeur concerné peut refuser cette demande." }, { status: 403 });
  }
  if (booking.status !== "PENDING") {
    return NextResponse.json({ error: "Cette demande a déjà été traitée." }, { status: 409 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const flip = await tx.booking.updateMany({
        where: { id: bookingId, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      if (flip.count !== 1) throw new Error("ALREADY_HANDLED");

      const wallet = await tx.wallet.upsert({
        where: { userId: booking.studentId },
        update: { availableMillimes: { increment: booking.amountMillimes } },
        create: { userId: booking.studentId, availableMillimes: booking.amountMillimes, pendingMillimes: 0 },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "REFUND",
          amountMillimes: booking.amountMillimes,
          reference: `REFUND-BOOK-${booking.id}`,
        },
      });

      if (booking.payment) {
        await tx.payment.update({ where: { id: booking.payment.id }, data: { status: "REFUNDED" } });
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_HANDLED") {
      return NextResponse.json({ error: "Cette demande a déjà été traitée." }, { status: 409 });
    }
    console.error("Booking decline failed", error);
    return NextResponse.json({ error: "Impossible de refuser cette demande." }, { status: 500 });
  }

  await notifyUser({
    userId: booking.studentId,
    type: "BOOKING_CANCELLED",
    title: "Réservation refusée",
    message: "Le professeur n'a pas pu accepter votre demande de séance. Le montant a été recrédité à votre portefeuille.",
    emailSubject: "Mise à jour concernant votre réservation Profy",
    link: "/dashboard/wallet",
    dedupeKey: `booking_declined:${booking.id}`,
  });

  return NextResponse.json({ success: true, message: "Demande refusée et élève remboursé." });
}
