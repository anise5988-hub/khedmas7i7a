import { prisma } from "@/lib/server/prisma";
import type { Prisma } from "@prisma/client";
import type { Conversation, ChatMessage, CustomOffer, OfferStatus } from "./chat-store";

const conversationInclude = {
  student: { select: { firstName: true, lastName: true } },
  teacherUser: { select: { firstName: true, lastName: true, teacher: { select: { slug: true } } } },
  messages: { orderBy: { createdAt: "asc" as const }, include: { offer: true } },
} satisfies Prisma.ConversationInclude;

type ConversationWithRelations = Prisma.ConversationGetPayload<{ include: typeof conversationInclude }>;
type OfferRow = {
  id: string;
  conversationId: string;
  teacherId: string;
  studentId: string;
  subject: string;
  startsAt: Date;
  durationMinutes: number;
  amountMillimes: number;
  status: OfferStatus;
  createdAt: Date;
};

function hydrateOffer(offer: OfferRow, studentName: string, teacherName: string): CustomOffer {
  return {
    id: offer.id,
    conversationId: offer.conversationId,
    teacherId: offer.teacherId,
    teacherName,
    studentId: offer.studentId,
    studentName,
    subject: offer.subject,
    startsAt: offer.startsAt.toISOString(),
    durationMinutes: offer.durationMinutes,
    amountTnd: offer.amountMillimes / 1000,
    amountMillimes: offer.amountMillimes,
    status: offer.status,
    createdAt: offer.createdAt,
  };
}

function hydrateConversation(conv: ConversationWithRelations): Conversation {
  const studentName = `${conv.student.firstName} ${conv.student.lastName}`.trim();
  const teacherName = `Prof. ${conv.teacherUser.firstName} ${conv.teacherUser.lastName}`.trim();

  const messages: ChatMessage[] = conv.messages.map((m) => ({
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    senderName: m.senderId === conv.studentId ? studentName : teacherName,
    senderRole: m.senderId === conv.studentId ? "STUDENT" : "TEACHER",
    text: m.text,
    createdAt: m.createdAt,
    offer: m.offer ? hydrateOffer(m.offer, studentName, teacherName) : null,
  }));

  return {
    id: conv.id,
    studentId: conv.studentId,
    studentName,
    teacherId: conv.teacherId,
    teacherName,
    teacherSlug: conv.teacherUser.teacher?.slug,
    lastMessageAt: conv.lastMessageAt,
    messages,
  };
}

export async function getOrCreateConversation(params: { studentId: string; teacherId: string }): Promise<Conversation> {
  const conv = await prisma.conversation.upsert({
    where: { studentId_teacherId: { studentId: params.studentId, teacherId: params.teacherId } },
    update: {},
    create: { studentId: params.studentId, teacherId: params.teacherId },
    include: conversationInclude,
  });
  return hydrateConversation(conv);
}

export async function getUserConversations(userId: string): Promise<Conversation[]> {
  const convs = await prisma.conversation.findMany({
    where: { OR: [{ studentId: userId }, { teacherId: userId }] },
    include: conversationInclude,
    orderBy: { lastMessageAt: "desc" },
  });
  return convs.map(hydrateConversation);
}

export async function getConversationById(id: string): Promise<Conversation | null> {
  const conv = await prisma.conversation.findUnique({ where: { id }, include: conversationInclude });
  return conv ? hydrateConversation(conv) : null;
}

export async function sendMessage(params: {
  conversationId: string;
  senderId: string;
  text: string;
  offer?: {
    teacherId: string;
    studentId: string;
    subject: string;
    startsAt: Date;
    durationMinutes: number;
    amountMillimes: number;
  } | null;
}): Promise<ChatMessage | null> {
  const messageId = await prisma.$transaction(async (tx) => {
    let offerId: string | null = null;
    if (params.offer) {
      const createdOffer = await tx.chatOffer.create({
        data: {
          conversationId: params.conversationId,
          teacherId: params.offer.teacherId,
          studentId: params.offer.studentId,
          subject: params.offer.subject,
          startsAt: params.offer.startsAt,
          durationMinutes: params.offer.durationMinutes,
          amountMillimes: params.offer.amountMillimes,
        },
      });
      offerId = createdOffer.id;
    }

    const message = await tx.chatMessage.create({
      data: { conversationId: params.conversationId, senderId: params.senderId, text: params.text, offerId },
    });

    await tx.conversation.update({ where: { id: params.conversationId }, data: { lastMessageAt: new Date() } });

    return message.id;
  });

  const conv = await getConversationById(params.conversationId);
  return conv?.messages.find((m) => m.id === messageId) || null;
}

export async function getOfferById(offerId: string): Promise<CustomOffer | null> {
  const offer = await prisma.chatOffer.findUnique({
    where: { id: offerId },
    include: {
      conversation: {
        include: {
          student: { select: { firstName: true, lastName: true } },
          teacherUser: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!offer) return null;

  const studentName = `${offer.conversation.student.firstName} ${offer.conversation.student.lastName}`.trim();
  const teacherName = `Prof. ${offer.conversation.teacherUser.firstName} ${offer.conversation.teacherUser.lastName}`.trim();
  return hydrateOffer(offer, studentName, teacherName);
}
