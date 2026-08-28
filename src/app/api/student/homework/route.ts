import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const homework = await prisma.homework.findMany({
    where: { studentId: user.id },
    include: {
      teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
      submission: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    homework: homework.map((h) => ({
      id: h.id,
      title: h.title,
      description: h.description,
      fileUrl: h.fileUrl,
      fileName: h.fileName,
      deadline: h.deadline,
      createdAt: h.createdAt,
      teacherName: `${h.teacher.user.firstName} ${h.teacher.user.lastName}`.trim(),
      submission: h.submission,
    })),
  });
}
