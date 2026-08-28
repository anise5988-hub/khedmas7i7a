import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { notifyUser } from "@/lib/server/notification-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id: homeworkId } = await params;
  const homework = await prisma.homework.findUnique({
    where: { id: homeworkId },
    include: { teacher: { select: { userId: true } } },
  });
  if (!homework) {
    return NextResponse.json({ error: "Devoir introuvable." }, { status: 404 });
  }
  if (homework.studentId !== user.id) {
    return NextResponse.json({ error: "Ce devoir ne vous est pas assigné." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const fileUrl = body?.fileUrl ? String(body.fileUrl) : null;
  const comment = body?.comment ? String(body.comment).trim() : null;

  if (!fileUrl && !comment) {
    return NextResponse.json({ error: "Ajoutez un fichier ou un commentaire pour soumettre votre devoir." }, { status: 400 });
  }

  const submission = await prisma.homeworkSubmission.upsert({
    where: { homeworkId },
    update: { fileUrl, fileName: body?.fileName ? String(body.fileName) : null, comment, submittedAt: new Date(), feedback: null, gradedAt: null },
    create: { homeworkId, fileUrl, fileName: body?.fileName ? String(body.fileName) : null, comment },
  });

  await notifyUser({
    userId: homework.teacher.userId,
    type: "NEW_MESSAGE",
    title: "Devoir soumis",
    message: `${user.firstName} ${user.lastName} a soumis le devoir "${homework.title}".`,
    emailSubject: "Un élève a soumis un devoir sur Profy",
    link: "/teacher/dashboard/homework",
    dedupeKey: `homework:${homeworkId}:submitted:${submission.submittedAt.getTime()}`,
  });

  return NextResponse.json({ success: true, submission });
}
