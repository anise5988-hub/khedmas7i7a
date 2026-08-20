export type OfferStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export type CustomOffer = {
  id: string;
  conversationId: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  subject: string;
  startsAt: string; // ISO string
  durationMinutes: number;
  amountTnd: number;
  amountMillimes: number;
  status: OfferStatus;
  createdAt: Date;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: "STUDENT" | "TEACHER" | "ADMIN";
  text: string;
  createdAt: Date;
  offer?: CustomOffer | null;
};

export type Conversation = {
  id: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  teacherSlug?: string;
  lastMessageAt: Date;
  messages: ChatMessage[];
};

const globalStore = globalThis as unknown as {
  __profyspace_conversations?: Map<string, Conversation>;
};

if (!globalStore.__profyspace_conversations) {
  globalStore.__profyspace_conversations = new Map();
}

export const chatStore = {
  getOrCreateConversation(params: {
    studentId: string;
    studentName: string;
    teacherId: string;
    teacherName: string;
    teacherSlug?: string;
  }): Conversation {
    const key = `conv_${params.studentId}_${params.teacherId}`;
    let conv = globalStore.__profyspace_conversations!.get(key);

    if (!conv) {
      conv = {
        id: key,
        studentId: params.studentId,
        studentName: params.studentName,
        teacherId: params.teacherId,
        teacherName: params.teacherName,
        teacherSlug: params.teacherSlug,
        lastMessageAt: new Date(),
        messages: [
          {
            id: `msg_welcome_${Date.now()}`,
            conversationId: key,
            senderId: "system",
            senderName: "ProfySpace",
            senderRole: "ADMIN",
            text: `Conversation ouverte entre ${params.studentName} et Professeur ${params.teacherName}. Échangez librement et convenez d'une offre de cours.`,
            createdAt: new Date(),
          },
        ],
      };
      globalStore.__profyspace_conversations!.set(key, conv);
    }

    return conv;
  },

  getUserConversations(userId: string): Conversation[] {
    const list: Conversation[] = [];
    globalStore.__profyspace_conversations!.forEach((conv) => {
      if (conv.studentId === userId || conv.teacherId === userId) {
        list.push(conv);
      }
    });

    return list.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  },

  getConversationById(conversationId: string): Conversation | null {
    return globalStore.__profyspace_conversations!.get(conversationId) || null;
  },

  sendMessage(params: {
    conversationId: string;
    senderId: string;
    senderName: string;
    senderRole: "STUDENT" | "TEACHER" | "ADMIN";
    text: string;
    offer?: CustomOffer | null;
  }): ChatMessage | null {
    const conv = globalStore.__profyspace_conversations!.get(params.conversationId);
    if (!conv) return null;

    const msg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId: params.conversationId,
      senderId: params.senderId,
      senderName: params.senderName,
      senderRole: params.senderRole,
      text: params.text,
      createdAt: new Date(),
      offer: params.offer || null,
    };

    conv.messages.push(msg);
    conv.lastMessageAt = new Date();
    return msg;
  },

  updateOfferStatus(offerId: string, newStatus: OfferStatus): { success: boolean; offer?: CustomOffer } {
    let foundOffer: CustomOffer | null = null;

    globalStore.__profyspace_conversations!.forEach((conv) => {
      conv.messages.forEach((msg) => {
        if (msg.offer && msg.offer.id === offerId) {
          msg.offer.status = newStatus;
          foundOffer = msg.offer;
        }
      });
    });

    if (foundOffer) {
      return { success: true, offer: foundOffer };
    }
    return { success: false };
  },
};
