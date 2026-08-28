import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getOfferById } from "@/lib/server/chat-repository";
import { prisma } from "@/lib/server/prisma";
import { notifyUser } from "@/lib/server/notification-service";

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
    return NextResponse.json({ error: "Vous n'êtes pas autorisé à refuser cette offre." }, { status: 403 });
  }
  if (existingOffer.status !== "PENDING") {
    return NextResponse.json({ error: "Cette offre a déjà été traitée." }, { status: 409 });
  }

  const updateResult = await prisma.chatOffer.updateMany({
    where: { id: offerId, status: "PENDING" },
    data: { status: "REJECTED" },
  });
  if (updateResult.count !== 1) {
    return NextResponse.json({ error: "Cette offre a déjà été traitée." }, { status: 409 });
  }

  const offer = await getOfferById(offerId);

  await notifyUser({
    userId: existingOffer.teacherId,
    type: "OFFER_REJECTED",
    title: "Offre non acceptée",
    message: `${user.firstName} ${user.lastName} n'a pas retenu l'offre pour "${existingOffer.subject}". Vous pouvez lui proposer un autre créneau.`,
    emailSubject: `Mise à jour concernant votre offre pour "${existingOffer.subject}"`,
    link: `/dashboard/messages?conversationId=${existingOffer.conversationId}`,
    dedupeKey: `offer_reject:${offerId}`,
  });

  return NextResponse.json({
    success: true,
    message: "Offre refusée.",
    offer,
  });
}
