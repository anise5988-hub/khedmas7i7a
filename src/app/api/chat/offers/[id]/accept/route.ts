import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getOfferById } from "@/lib/server/chat-repository";
import { prisma } from "@/lib/server/prisma";
import { notifyUser } from "@/lib/server/notification-service";
import { creditTeacherEarning } from "@/lib/server/earnings";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id: offerId } = await params;
  const existingOffer = await getOfferById(offerId);
  if (!existingOffer) {
    return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
  }
  if (existingOffer.studentId !== user.id) {
    return NextResponse.json({ error: "Vous n'êtes pas autorisé à accepter cette offre." }, { status: 403 });
  }
  if (existingOffer.status !== "PENDING") {
    return NextResponse.json({ error: "Cette offre a déjà été traitée." }, { status: 409 });
  }
  if (existingOffer.teacherId === user.id) {
    return NextResponse.json({ error: "Vous ne pouvez pas réserver une séance avec vous-même." }, { status: 400 });
  }

  // A suspended/rejected teacher must not be able to get paid just
  // because the offer flow doesn't share the same status check as direct
  // booking — verify before touching the offer or the student's wallet.
  const teacherProfile = await prisma.teacherProfile.findFirst({
    where: { OR: [{ id: existingOffer.teacherId }, { userId: existingOffer.teacherId }] },
  });
  if (!teacherProfile || teacherProfile.verificationStatus !== "APPROVED") {
    return NextResponse.json({
      error: "Ce professeur n'est plus disponible pour accepter des réservations.",
    }, { status: 409 });
  }

  const requiredMillimes = existingOffer.amountMillimes;

  // The offer-status flip, wallet debit, booking creation and earnings
  // credit all live in one transaction — either all of it lands or none
  // of it does. The conditional updateMany calls (status must still be
  // PENDING; balance must still cover the amount) close the race where
  // two concurrent accepts, or an accept racing a balance change, could
  // otherwise double-book or overdraft.
  const offerStart = new Date(existingOffer.startsAt);
  const offerEnd = new Date(offerStart.getTime() + existingOffer.durationMinutes * 60_000);
  // Longest bookable session is 120min (see bookingRequestSchema) — any
  // existing booking starting before that can't possibly still be
  // running by offerStart, so it's a safe lower bound for the candidate scan.
  const MAX_DURATION_MS = 120 * 60_000;

  try {
    await prisma.$transaction(
      async (tx) => {
        const offerUpdate = await tx.chatOffer.updateMany({
          where: { id: offerId, status: "PENDING" },
          data: { status: "ACCEPTED" },
        });
        if (offerUpdate.count !== 1) {
          throw new Error("OFFER_ALREADY_HANDLED");
        }

        const candidates = await tx.booking.findMany({
          where: {
            teacherId: teacherProfile.id,
            status: "CONFIRMED",
            startsAt: { lt: offerEnd, gte: new Date(offerStart.getTime() - MAX_DURATION_MS) },
          },
          select: { startsAt: true, durationMinutes: true },
        });
        const hasOverlap = candidates.some((b) => {
          const existingEnd = new Date(b.startsAt.getTime() + b.durationMinutes * 60_000);
          return b.startsAt < offerEnd && existingEnd > offerStart;
        });
        if (hasOverlap) {
          throw new Error("SLOT_CONFLICT");
        }

        const deduction = await tx.wallet.updateMany({
          where: { userId: user.id, availableMillimes: { gte: requiredMillimes } },
          data: { availableMillimes: { decrement: requiredMillimes } },
        });
        if (deduction.count !== 1) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        const updatedWallet = await tx.wallet.findUnique({ where: { userId: user.id } });
        if (!updatedWallet) throw new Error("WALLET_NOT_FOUND");

        await tx.walletTransaction.create({
          data: {
            walletId: updatedWallet.id,
            type: "BOOKING_PAYMENT",
            amountMillimes: -requiredMillimes,
            reference: `OFFER-${offerId}`,
          },
        });

        await tx.booking.create({
          data: {
            studentId: user.id,
            teacherId: teacherProfile.id,
            startsAt: new Date(existingOffer.startsAt),
            durationMinutes: existingOffer.durationMinutes,
            amountMillimes: existingOffer.amountMillimes,
            status: "CONFIRMED",
          },
        });

        await creditTeacherEarning(tx, {
          teacherUserId: teacherProfile.userId,
          grossAmountMillimes: requiredMillimes,
          reference: `EARN-OFFER-${offerId}`,
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (dbErr) {
    const reason = dbErr instanceof Error ? dbErr.message : "";

    if (reason === "OFFER_ALREADY_HANDLED") {
      return NextResponse.json({ error: "Cette offre a déjà été traitée." }, { status: 409 });
    }
    if (reason === "SLOT_CONFLICT") {
      return NextResponse.json({
        error: "Ce créneau vient d'être réservé par un autre élève. Veuillez proposer un autre horaire.",
      }, { status: 409 });
    }
    if (reason === "INSUFFICIENT_BALANCE") {
      const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
      const currentAvailable = wallet?.availableMillimes ?? 0;
      return NextResponse.json({
        error: `Solde insuffisant dans votre portefeuille (${(currentAvailable / 1000).toFixed(1)} DT disponibles). Veuillez recharger au moins ${existingOffer.amountTnd} DT.`,
        insufficientBalance: true,
      }, { status: 400 });
    }
    // Serializable isolation surfaces real concurrent conflicts as a
    // Prisma write-conflict error (P2034) rather than our own check —
    // treat it the same way rather than a generic 502.
    if (typeof dbErr === "object" && dbErr !== null && "code" in dbErr && dbErr.code === "P2034") {
      return NextResponse.json({
        error: "Ce créneau vient d'être réservé par un autre élève. Veuillez réessayer.",
      }, { status: 409 });
    }

    console.error("Offer acceptance payment failed", dbErr);
    return NextResponse.json({
      error: "Le paiement n'a pas pu être confirmé. Aucune séance n'a été réservée.",
    }, { status: 502 });
  }

  const offer = await getOfferById(offerId);

  await Promise.all([
    notifyUser({
      userId: existingOffer.teacherId,
      type: "OFFER_ACCEPTED",
      title: "Offre acceptée & Cours réservé ! ",
      message: `${user.firstName} ${user.lastName} a accepté votre offre pour "${existingOffer.subject}" (${existingOffer.amountTnd} DT).`,
      emailSubject: `Votre offre de cours "${existingOffer.subject}" a été acceptée`,
      link: "/teacher/dashboard/bookings",
      dedupeKey: `offer_accept_teacher:${offerId}`,
    }),
    notifyUser({
      userId: user.id,
      type: "BOOKING_CONFIRMED",
      title: "Réservation confirmée ! ",
      message: `Votre séance pour "${existingOffer.subject}" avec ${existingOffer.teacherName} est confirmée.`,
      emailSubject: `Votre réservation pour "${existingOffer.subject}" est confirmée`,
      link: "/dashboard/bookings",
      dedupeKey: `offer_accept_student:${offerId}`,
    }),
  ]);

  return NextResponse.json({
    success: true,
    message: "Offre acceptée et séance réservée avec succès !",
    offer,
  });
}
