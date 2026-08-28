import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getConversationById, sendMessage } from "@/lib/server/chat-repository";
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

  const conv = await getConversationById(body.conversationId);
  if (!conv) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }
  if (user.id !== conv.studentId && user.id !== conv.teacherId) {
    return NextResponse.json({ error: "Vous ne faites pas partie de cette conversation." }, { status: 403 });
  }

  let offerParams: {
    teacherId: string;
    studentId: string;
    subject: string;
    startsAt: Date;
    durationMinutes: number;
    amountMillimes: number;
  } | null = null;
  let offerAmountTnd = 0;
  let offerSubject = "";

  if (body.offer && user.role === "TEACHER") {
    offerAmountTnd = Number(body.offer.amountTnd) || 0;
    offerSubject = String(body.offer.subject || "Cours particulier").trim();
    offerParams = {
      teacherId: user.id,
      studentId: conv.studentId,
      subject: offerSubject,
      startsAt: new Date(body.offer.startsAt || Date.now()),
      durationMinutes: Number(body.offer.durationMinutes) || 60,
      amountMillimes: Math.round(offerAmountTnd * 1000),
    };
  }

  const text = body.text || (offerParams ? `Propose une offre de cours : ${offerSubject} à ${offerAmountTnd} DT` : "");
  if (!text.trim()) {
    return NextResponse.json({ error: "Message vide." }, { status: 400 });
  }

  const msg = await sendMessage({
    conversationId: body.conversationId,
    senderId: user.id,
    text,
    offer: offerParams,
  });

  if (!msg) {
    return NextResponse.json({ error: "Impossible d'envoyer le message." }, { status: 500 });
  }

  if (msg.offer) {
    await notifyUser({
      userId: conv.studentId,
      type: "NEW_MESSAGE",
      title: "Nouvelle offre de cours reçue",
      message: `${user.firstName} ${user.lastName} vous a envoyé une offre de cours pour ${offerAmountTnd} DT.`,
      link: `/dashboard/messages?conversationId=${conv.id}`,
      emailSubject: "Vous avez reçu une nouvelle offre sur Profy",
      dedupeKey: `offer:${msg.offer.id}`,
    });
  } else {
    const recipientId = user.id === conv.studentId ? conv.teacherId : conv.studentId;
    const previewText = text.trim().length > 80 ? text.trim().substring(0, 80) + "..." : text.trim();

    await notifyUser({
      userId: recipientId,
      type: "NEW_MESSAGE",
      title: "Nouveau message",
      message: `Vous avez un nouveau message de ${user.firstName} ${user.lastName}.`,
      emailMessage: `Message de ${user.firstName} ${user.lastName} : ${previewText}`,
      emailSubject: "Vous avez un nouveau message sur Profy",
      link: `/dashboard/messages?conversationId=${conv.id}`,
      dedupeKey: `message:${msg.id}`,
    });
  }

  return NextResponse.json({ success: true, message: msg });
}
