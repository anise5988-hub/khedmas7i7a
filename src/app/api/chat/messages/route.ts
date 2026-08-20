import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { chatStore, CustomOffer } from "@/lib/server/chat-store";
import { notificationsStore } from "@/lib/server/notifications-store";

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.conversationId) {
    return NextResponse.json({ error: "Conversation ID requis" }, { status: 400 });
  }

  const conv = chatStore.getConversationById(body.conversationId);
  if (!conv) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  let offerObj: CustomOffer | null = null;

  if (body.offer && user.role === "TEACHER") {
    const amountTnd = Number(body.offer.amountTnd) || 0;
    offerObj = {
      id: `offer_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId: body.conversationId,
      teacherId: user.id,
      teacherName: `${user.firstName} ${user.lastName}`,
      studentId: conv.studentId,
      studentName: conv.studentName,
      subject: String(body.offer.subject || "Cours particulier").trim(),
      startsAt: String(body.offer.startsAt || new Date().toISOString()),
      durationMinutes: Number(body.offer.durationMinutes) || 60,
      amountTnd,
      amountMillimes: Math.round(amountTnd * 1000),
      status: "PENDING",
      createdAt: new Date(),
    };

    notificationsStore.addNotification({
      userId: conv.studentId,
      title: "Nouvelle offre de cours reçue ! 📩",
      message: `${user.firstName} ${user.lastName} vous a envoyé une offre de cours pour ${amountTnd} DT. Consultez votre conversation pour l'accepter.`,
      type: "INFO",
      link: `/dashboard/messages?conversationId=${conv.id}`,
    });
  }

  const msg = chatStore.sendMessage({
    conversationId: body.conversationId,
    senderId: user.id,
    senderName: `${user.firstName} ${user.lastName}`,
    senderRole: user.role === "TEACHER" ? "TEACHER" : "STUDENT",
    text: body.text || (offerObj ? `Propose une offre de cours : ${offerObj.subject} à ${offerObj.amountTnd} DT` : ""),
    offer: offerObj,
  });

  return NextResponse.json({ success: true, message: msg });
}
