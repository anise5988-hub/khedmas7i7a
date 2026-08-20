import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { chatStore } from "@/lib/server/chat-store";
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
  const updateRes = chatStore.updateOfferStatus(offerId, "REJECTED");

  if (!updateRes.success || !updateRes.offer) {
    return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
  }

  const offer = updateRes.offer;

  await notifyUser({
    userId: offer.teacherId,
    type: "OFFER_REJECTED",
    title: "Offre non acceptée",
    message: `${user.firstName} ${user.lastName} n'a pas retenu l'offre pour "${offer.subject}". Vous pouvez lui proposer un autre créneau.`,
    emailSubject: `Mise à jour concernant votre offre pour "${offer.subject}"`,
    link: `/dashboard/messages?conversationId=${offer.conversationId}`,
    dedupeKey: `offer_reject:${offer.id}`,
  });

  return NextResponse.json({
    success: true,
    message: "Offre refusée.",
    offer,
  });
}
