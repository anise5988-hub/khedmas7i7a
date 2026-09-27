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

/**
 * Sondage différentiel pour la messagerie.
 *
 * L'ancienne boucle rechargeait, toutes les 2 secondes, l'intégralité de
 * l'historique de toutes les conversations de l'utilisateur pour n'en
afficher qu'une : coût réseau et travail de rendu qui grandissent avec
 * l'ancienneté du compte, cause directe de saccades sur mobile d'entrée de
 * gamme.
 *
 * Ici :
 *   - un seul appel renvoie la liste des conversations (sans leurs messages)
 *     plus l'historique complet de la SEULE conversation ouverte ;
 *   - tout ce qui n'a pas bougé depuis `since` est renvoyé sans message,
 *     donc rien à re-rendre côté client.
 */
export type ConversationSummary = {
  id: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  teacherSlug?: string;
  lastMessageAt: Date;
  messageCount: number;
};

const HISTORY_LIMIT = 80;

async function getConversationSummaries(userId: string): Promise<ConversationSummary[]> {
  const convs = await prisma.conversation.findMany({
    where: { OR: [{ studentId: userId }, { teacherId: userId }] },
    select: {
      id: true,
      studentId: true,
      teacherId: true,
      lastMessageAt: true,
      student: { select: { firstName: true, lastName: true } },
      teacherUser: { select: { firstName: true, lastName: true, teacher: { select: { slug: true } } } },
      _count: { select: { messages: true } },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  return convs.map((c) => ({
    id: c.id,
    studentId: c.studentId,
    studentName: `${c.student.firstName} ${c.student.lastName}`.trim(),
    teacherId: c.teacherId,
    teacherName: `Prof. ${c.teacherUser.firstName} ${c.teacherUser.lastName}`.trim(),
    teacherSlug: c.teacherUser.teacher?.slug,
    lastMessageAt: c.lastMessageAt,
    messageCount: c._count.messages,
  }));
}

/**
 * Renvoie l'historique borné d'une conversation. On garde les 80 derniers
 * messages : au-delà, la fenêtre affichée de toute façon et le poids du
 * transfert n'ont plus de rapport avec ce que l'utilisateur peut voir.
 * L'ordre chronologique est rétabli après coup pour l'affichage.
 */
export async function getConversationMessages(
  conversationId: string,
  limit = HISTORY_LIMIT,
): Promise<{ messages: ChatMessage[]; truncated: boolean }> {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { studentId: true },
  });
  if (!conv) return { messages: [], truncated: false };

  const [rows, total] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { offer: true },
    }),
    prisma.chatMessage.count({ where: { conversationId } }),
  ]);

  const hydrated = await hydrateMessages(conv.studentId, rows.reverse());
  return { messages: hydrated, truncated: total > limit };
}

async function hydrateMessages(
  studentId: string,
  rows: Array<{
    id: string;
    conversationId: string;
    senderId: string;
    text: string;
    createdAt: Date;
    offer: {
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
    } | null;
  }>,
): Promise<ChatMessage[]> {
  if (rows.length === 0) return [];

  const senderIds = [...new Set(rows.map((r) => r.senderId))];
  const senders = await prisma.user.findMany({
    where: { id: { in: senderIds } },
    select: { id: true, firstName: true, lastName: true, teacher: { select: { id: true } } },
  });

  const nameById = new Map<string, string>();
  for (const s of senders) {
    const isTeacher = Boolean(s.teacher);
    const full = `${s.firstName} ${s.lastName}`.trim();
    nameById.set(s.id, isTeacher ? `Prof. ${full}` : full);
  }

  return rows.map((m) => ({
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    senderName: nameById.get(m.senderId) || "Utilisateur",
    senderRole: m.senderId === studentId ? "STUDENT" : "TEACHER",
    text: m.text,
    createdAt: m.createdAt,
    offer: m.offer
      ? hydrateOffer(
          m.offer,
          nameById.get(m.offer.studentId) || "",
          nameById.get(m.offer.teacherId) || "",
        )
      : null,
  }));
}

/**
 * Paquet de sondage : résumés de toutes les conversations + historique de
 * celle qui est ouverte, en une seule requête HTTP.
 */
export async function getChatPollPayload(params: {
  userId: string;
  activeConversationId?: string | null;
  since?: Date | null;
}) {
  const summaries = await getConversationSummaries(params.userId);
  const activeId =
    params.activeConversationId && summaries.some((s) => s.id === params.activeConversationId)
      ? params.activeConversationId
      : summaries[0]?.id ?? null;

  let messages: ChatMessage[] = [];
  let truncated = false;
  let messagesChanged = true;

  if (activeId) {
    const activeSummary = summaries.find((s) => s.id === activeId)!;
    // Rien de neuf dans le fil ouvert : on évite complètement la requête
    // d'historique, c'est le cas de loin le plus fréquent en sondage.
    const hasNewer = !params.since || activeSummary.lastMessageAt > params.since;
    if (hasNewer) {
      const result = await getConversationMessages(activeId);
      messages = result.messages;
      truncated = result.truncated;
    } else {
      messagesChanged = false;
    }
  }

  return { summaries, activeId, messages, truncated, messagesChanged };
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
