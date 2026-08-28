import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { notifyUser } from "@/lib/server/notification-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user?.teacher) {
    return NextResponse.json({ error: "Réservé aux enseignants." }, { status: 403 });
  }

  const { id: homeworkId } = await params;
  const homework = await prisma.homework.findUnique({
    where: { id: homeworkId },
    include: { submission: true },
  });
  if (!homework || homework.teacherId !== user.teacher.id) {
    return NextResponse.json({ error: "Devoir introuvable." }, { status: 404 });
  }
  if (!homework.submission) {
    return NextResponse.json({ error: "Aucune soumission à corriger pour ce devoir." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const feedback = String(body?.feedback || "").trim();
  if (!feedback) {
    return NextResponse.json({ error: "Le commentaire de correction est requis." }, { status: 400 });
  }

  const submission = await prisma.homeworkSubmission.update({
    where: { homeworkId },
    data: { feedback, gradedAt: new Date() },
  });

  await notifyUser({
    userId: homework.studentId,
    type: "NEW_MESSAGE",
    title: "Devoir corrigé",
    message: `${user.firstName} ${user.lastName} a corrigé votre devoir "${homework.title}".`,
    emailSubject: "Votre devoir a été corrigé sur Profy",
    link: "/dashboard/homework",
    dedupeKey: `homework:${homeworkId}:graded:${submission.gradedAt!.getTime()}`,
  });

  return NextResponse.json({ success: true, submission });
}
