import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { notifyUser } from "@/lib/server/notification-service";
import { creditTeacherEarning } from "@/lib/server/earnings";

export const runtime = "nodejs";

/**
 * POST /api/bookings/[id]/accept — teacher-only.
 *
 * A booking is created PENDING with the student's payment already taken
 * (see POST /api/bookings) but held against the booking, not yet in the
 * teacher's wallet. Accepting is the one moment that money moves: the
 * status flip and the earnings credit happen in the same transaction, and
 * the guarded updateMany makes a second accept (double-click, two tabs) a
 * no-op instead of a double credit.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

  const { id: bookingId } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      teacher: { select: { id: true, userId: true } },
      student: { select: { firstName: true, lastName: true } },
    },
  });
  if (!booking) return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
  if (booking.teacher.userId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Seul le professeur concerné peut accepter cette demande." }, { status: 403 });
  }
  if (booking.status !== "PENDING") {
    return NextResponse.json({ error: "Cette demande a déjà été traitée." }, { status: 409 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const flip = await tx.booking.updateMany({
        where: { id: bookingId, status: "PENDING" },
        data: { status: "CONFIRMED" },
      });
      if (flip.count !== 1) throw new Error("ALREADY_HANDLED");

      await creditTeacherEarning(tx, {
        teacherUserId: booking.teacher.userId,
        grossAmountMillimes: booking.amountMillimes,
        reference: `EARN-BOOK-${booking.id}`,
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_HANDLED") {
      return NextResponse.json({ error: "Cette demande a déjà été traitée." }, { status: 409 });
    }
    console.error("Booking accept failed", error);
    return NextResponse.json({ error: "Impossible d'accepter cette demande." }, { status: 500 });
  }

  await notifyUser({
    userId: booking.studentId,
    type: "BOOKING_CONFIRMED",
    title: "Réservation confirmée ! ",
    message: `Le professeur a accepté votre demande de séance. Rendez-vous à l'heure prévue.`,
    emailSubject: "Votre réservation Profy a été confirmée",
    link: "/dashboard/classes",
    dedupeKey: `booking_accepted:${booking.id}`,
  });

  return NextResponse.json({ success: true, message: "Demande acceptée. Le paiement a été crédité à votre compte." });
}
