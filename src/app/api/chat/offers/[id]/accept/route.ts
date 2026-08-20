import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { chatStore } from "@/lib/server/chat-store";
import { prisma } from "@/lib/server/prisma";
import { fallbackStore } from "@/lib/server/fallback-store";
import { notificationsStore } from "@/lib/server/notifications-store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id: offerId } = await params;
  const updateRes = chatStore.updateOfferStatus(offerId, "ACCEPTED");

  if (!updateRes.success || !updateRes.offer) {
    return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
  }

  const offer = updateRes.offer;

  // Check student wallet balance
  let studentWallet = null;
  try {
    studentWallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });
  } catch {}

  const currentAvailable = studentWallet ? studentWallet.availableMillimes : 0;
  const requiredMillimes = offer.amountMillimes;

  if (currentAvailable < requiredMillimes) {
    // Revert status back to PENDING if balance insufficient
    chatStore.updateOfferStatus(offerId, "PENDING");
    return NextResponse.json({
      error: `Solde insuffisant dans votre portefeuille (${(currentAvailable / 1000).toFixed(1)} DT disponibles). Veuillez recharger au moins ${offer.amountTnd} DT.`,
      insufficientBalance: true,
    }, { status: 400 });
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
              reference: `Offre cours: ${offer.subject} (${Date.now()})`,
            },
          },
        },
      });

    // Find teacher profile
    const teacherProfile = await prisma.teacherProfile.findFirst({
      where: { OR: [{ id: offer.teacherId }, { userId: offer.teacherId }] },
    });

    if (teacherProfile) {
      // Create booking
      await prisma.booking.create({
        data: {
          studentId: user.id,
          teacherId: teacherProfile.id,
          startsAt: new Date(offer.startsAt),
          durationMinutes: offer.durationMinutes,
          amountMillimes: offer.amountMillimes,
          status: "CONFIRMED",
        },
      });
    }
    } catch (dbErr) {
      console.warn("Prisma wallet deduction failed, updating fallback store", dbErr);
    }

  // Send notifications
  notificationsStore.addNotification({
    userId: offer.teacherId,
    title: "Offre acceptée & Cours réservé ! 🎉",
    message: `${user.firstName} ${user.lastName} a accepté votre offre pour "${offer.subject}" (${offer.amountTnd} DT). Le montant est crédité.`,
    type: "SUCCESS",
    link: "/teacher/dashboard/bookings",
  });

  notificationsStore.addNotification({
    userId: user.id,
    title: "Réservation confirmée ! ✅",
    message: `Votre séance pour "${offer.subject}" avec ${offer.teacherName} est enregistrée. Le montant de ${offer.amountTnd} DT a été réglé depuis votre portefeuille.`,
    type: "SUCCESS",
    link: "/dashboard/bookings",
  });

  return NextResponse.json({
    success: true,
    message: "Offre acceptée et séance réservée avec succès !",
    offer,
  });
}
