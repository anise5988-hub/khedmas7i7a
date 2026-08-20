import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { chatStore } from "@/lib/server/chat-store";
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
  const updateRes = chatStore.updateOfferStatus(offerId, "REJECTED");

  if (!updateRes.success || !updateRes.offer) {
    return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
  }

  const offer = updateRes.offer;

  notificationsStore.addNotification({
    userId: offer.teacherId,
    title: "Offre refusée",
    message: `${user.firstName} ${user.lastName} n'a pas accepté l'offre pour "${offer.subject}". Vous pouvez lui proposer une autre date ou un autre tarif.`,
    type: "WARNING",
    link: `/dashboard/messages?conversationId=${offer.conversationId}`,
  });

  return NextResponse.json({
    success: true,
    message: "Offre refusée.",
    offer,
  });
}
