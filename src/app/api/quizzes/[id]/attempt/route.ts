import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id: quizId } = await params;
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { sortOrder: "asc" } }, course: true },
  });
  if (!quiz) {
    return NextResponse.json({ error: "Quiz introuvable." }, { status: 404 });
  }

  const isOwner = quiz.course.teacherId === user.teacher?.id;
  let hasAccess = isOwner || quiz.course.priceTnd === 0;
  if (!hasAccess) {
    const access = await prisma.courseAccess.findUnique({
      where: { courseId_studentId: { courseId: quiz.courseId, studentId: user.id } },
    });
    hasAccess = !!access;
  }
  if (!hasAccess) {
    return NextResponse.json({ error: "Vous devez avoir accès à ce cours pour passer ce quiz." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const rawAnswers: unknown[] = Array.isArray(body?.answers) ? body.answers : [];
  if (rawAnswers.length !== quiz.questions.length) {
    return NextResponse.json({ error: "Réponses invalides : nombre de réponses incorrect." }, { status: 400 });
  }
  const answers: number[] = rawAnswers.map((a) => (typeof a === "number" ? a : -1));

  // Score is always computed server-side from the stored correct answers —
  // the client never gets to claim its own score.
  let score = 0;
  const results = quiz.questions.map((question, index) => {
    const selected = answers[index];
    const isCorrect = selected === question.correctIndex;
    if (isCorrect) score += 1;
    return { questionId: question.id, selected, correctIndex: question.correctIndex, isCorrect };
  });

  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId,
      studentId: user.id,
      answers,
      score,
      totalQuestions: quiz.questions.length,
    },
  });

  return NextResponse.json({
    success: true,
    attempt: { id: attempt.id, score, totalQuestions: quiz.questions.length, submittedAt: attempt.submittedAt },
    results,
  });
}
