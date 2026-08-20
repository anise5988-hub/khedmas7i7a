import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { chatStore, presenceStore } from "@/lib/server/chat-store";
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

  if (teacherId) {
    let teacherUserId = teacherId;
    let teacherName = "Professeur";
    let teacherSlug = "teacher";

    try {
      // 1. Try finding by TeacherProfile ID first
      const teacherProfile = await prisma.teacherProfile.findFirst({
        where: { OR: [{ id: teacherId }, { userId: teacherId }] },
        include: { user: true },
      });

      if (teacherProfile && teacherProfile.user) {
        teacherUserId = teacherProfile.user.id;
        teacherName = `Prof. ${teacherProfile.user.firstName} ${teacherProfile.user.lastName}`;
        teacherSlug = teacherProfile.slug;
      } else {
        // 2. Try finding by User ID
        const teacherUser = await prisma.user.findUnique({
          where: { id: teacherId },
          include: { teacher: true },
        });

        if (teacherUser) {
          teacherUserId = teacherUser.id;
          teacherName = `Prof. ${teacherUser.firstName} ${teacherUser.lastName}`;
          teacherSlug = teacherUser.teacher?.slug || "teacher";
        } else {
          // 3. Try Fallback Store
          const fbUser = fallbackStore.getUserById(teacherId);
          if (fbUser) {
            teacherUserId = fbUser.id;
            teacherName = `Prof. ${fbUser.firstName} ${fbUser.lastName}`;
          }
        }
      }
    } catch {}

    const conv = chatStore.getOrCreateConversation({
      studentId: user.role === "TEACHER" ? teacherUserId : user.id,
      studentName: user.role === "TEACHER" ? teacherName : `${user.firstName} ${user.lastName}`,
      teacherId: user.role === "TEACHER" ? user.id : teacherUserId,
      teacherName: user.role === "TEACHER" ? `Prof. ${user.firstName} ${user.lastName}` : teacherName,
      teacherSlug,
    });

    const allList = chatStore.getUserConversations(user.id);
    return NextResponse.json({ conversations: allList, activeConversation: conv });
  }

  const list = chatStore.getUserConversations(user.id);
  return NextResponse.json({ conversations: list });
}
