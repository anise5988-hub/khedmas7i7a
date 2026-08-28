// Client pages import these as types only (erased at build time), so this
// file staying importable from "use client" components is safe even though
// it lives under lib/server — no runtime code from here reaches the client.

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

// Ephemeral "was this user recently active" tracking — losing it on a
// server restart has no consequence (nothing user-facing currently reads
// isUserOnline), so it stays in-memory rather than in the database.
const userPresenceMap = new Map<string, Date>();

export const presenceStore = {
  touchUser(userId: string) {
    if (userId) {
      userPresenceMap.set(userId, new Date());
    }
  },

  isUserOnline(userId: string): { isOnline: boolean; statusText: string } {
    const lastActive = userPresenceMap.get(userId);
    if (!lastActive) {
      return { isOnline: false, statusText: "Hors ligne" };
    }
    const diffMin = Math.floor((Date.now() - lastActive.getTime()) / 60000);
    if (diffMin < 3) {
      return { isOnline: true, statusText: "En ligne" };
    } else if (diffMin < 60) {
      return { isOnline: false, statusText: `En ligne il y a ${diffMin} min` };
    } else {
      const diffHours = Math.floor(diffMin / 60);
      return { isOnline: false, statusText: `En ligne il y a ${diffHours}h` };
    }
  },
};
