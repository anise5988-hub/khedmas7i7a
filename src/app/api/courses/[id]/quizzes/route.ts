import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id: courseId } = await params;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    return NextResponse.json({ error: "Cours introuvable." }, { status: 404 });
  }

  const isOwner = course.teacherId === user.teacher?.id;
  let hasAccess = isOwner || course.priceTnd === 0;
  if (!hasAccess) {
    const access = await prisma.courseAccess.findUnique({ where: { courseId_studentId: { courseId, studentId: user.id } } });
    hasAccess = !!access;
  }
  if (!hasAccess) {
    return NextResponse.json({ error: "Vous devez avoir accès à ce cours pour voir ses quiz." }, { status: 403 });
  }

  const quizzes = await prisma.quiz.findMany({
    where: { courseId },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
      attempts: { where: { studentId: user.id }, orderBy: { submittedAt: "desc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    quizzes: quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      // correctIndex is never sent before a quiz is submitted.
      questions: q.questions.map((question) => ({ id: question.id, text: question.text, options: question.options })),
      attempts: q.attempts.map((a) => ({ id: a.id, score: a.score, totalQuestions: a.totalQuestions, submittedAt: a.submittedAt })),
    })),
  });
}
