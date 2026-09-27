import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getOrCreateConversation, getUserConversations } from "@/lib/server/chat-repository";
import { getBookingConversationId } from "@/lib/server/booking-communication";
import { presenceStore } from "@/lib/server/chat-store";
import { prisma } from "@/lib/server/prisma";
import { fallbackStore } from "@/lib/server/fallback-store";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  presenceStore.touchUser(user.id);

  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get("teacherId");
  const bookingId = searchParams.get("bookingId");

  // "Discuter de cette séance" opens the thread attached to a booking. The
  // booking is resolved server-side and the caller must be one of its two
  // participants, so a guessed bookingId exposes nothing.
  if (bookingId) {
    const { conversationId, side } = await getBookingConversationId(user.id, bookingId);
    if (!conversationId || !side) {
      return NextResponse.json({ error: "Réservation introuvable ou non autorisée." }, { status: 404 });
    }
    const allList = await getUserConversations(user.id);
    const activeConversation = allList.find((c) => c.id === conversationId) || null;
    return NextResponse.json({ conversations: allList, activeConversation, booking: side.booking });
  }

  if (teacherId) {
    let teacherUserId = teacherId;

    try {
      // 1. Try finding by TeacherProfile ID first
      const teacherProfile = await prisma.teacherProfile.findFirst({
        where: { OR: [{ id: teacherId }, { userId: teacherId }] },
        include: { user: true },
      });

      if (teacherProfile && teacherProfile.user) {
        teacherUserId = teacherProfile.user.id;
      } else {
        // 2. Try finding by User ID
        const teacherUser = await prisma.user.findUnique({ where: { id: teacherId } });
        if (teacherUser) {
          teacherUserId = teacherUser.id;
        } else {
          // 3. Try Fallback Store
          const fbUser = fallbackStore.getUserById(teacherId);
          if (fbUser) teacherUserId = fbUser.id;
        }
      }
    } catch {}

    if (teacherUserId === user.id) {
      return NextResponse.json({ error: "Vous ne pouvez pas démarrer une conversation avec vous-même." }, { status: 400 });
    }

    const conv = await getOrCreateConversation({
      studentId: user.role === "TEACHER" ? teacherUserId : user.id,
      teacherId: user.role === "TEACHER" ? user.id : teacherUserId,
    });

    const allList = await getUserConversations(user.id);
    return NextResponse.json({ conversations: allList, activeConversation: conv });
  }

  const list = await getUserConversations(user.id);
  return NextResponse.json({ conversations: list });
}
