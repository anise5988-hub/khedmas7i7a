import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { chatStore } from "@/lib/server/chat-store";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get("teacherId");

  if (teacherId) {
    let teacherName = "Enseignant";
    let teacherSlug = "teacher";

    try {
      const teacherUser = await prisma.user.findUnique({
        where: { id: teacherId },
        include: { teacher: true },
      });
      if (teacherUser) {
        teacherName = `${teacherUser.firstName} ${teacherUser.lastName}`;
        teacherSlug = teacherUser.teacher?.slug || "teacher";
      }
    } catch {}

    const conv = chatStore.getOrCreateConversation({
      studentId: user.role === "TEACHER" ? teacherId : user.id,
      studentName: user.role === "TEACHER" ? teacherName : `${user.firstName} ${user.lastName}`,
      teacherId: user.role === "TEACHER" ? user.id : teacherId,
      teacherName: user.role === "TEACHER" ? `${user.firstName} ${user.lastName}` : teacherName,
      teacherSlug,
    });

    return NextResponse.json({ conversations: [conv], activeConversation: conv });
  }

  const list = chatStore.getUserConversations(user.id);
  return NextResponse.json({ conversations: list });
}
