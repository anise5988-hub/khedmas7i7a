import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { chatStore, CustomOffer } from "@/lib/server/chat-store";
import { notifyUser } from "@/lib/server/notification-service";

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

    await notifyUser({
      userId: conv.studentId,
      type: "NEW_MESSAGE",
      title: "Nouvelle offre de cours reçue",
      message: `${user.firstName} ${user.lastName} vous a envoyé une offre de cours pour ${amountTnd} DT.`,
      link: `/dashboard/messages?conversationId=${conv.id}`,
      emailSubject: "Vous avez reçu une nouvelle offre sur Profy",
      dedupeKey: `offer:${offerObj.id}`,
    });
  } else if (body.text && body.text.trim()) {
    const recipientId = user.id === conv.studentId ? conv.teacherId : conv.studentId;
    const previewText = body.text.trim().length > 80 ? body.text.trim().substring(0, 80) + "..." : body.text.trim();

    await notifyUser({
      userId: recipientId,
      type: "NEW_MESSAGE",
      title: "Nouveau message",
      message: `Vous avez un nouveau message de ${user.firstName} ${user.lastName}.`,
      emailMessage: `Message de ${user.firstName} ${user.lastName} : ${previewText}`,
      emailSubject: "Vous avez un nouveau message sur Profy",
      link: `/dashboard/messages?conversationId=${conv.id}`,
      dedupeKey: `message:${body.conversationId}:${user.id}:${Date.now()}`,
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
