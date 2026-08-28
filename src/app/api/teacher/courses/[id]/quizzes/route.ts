import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

type QuestionInput = { text: string; options: string[]; correctIndex: number };

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user?.teacher) {
    return NextResponse.json({ error: "Réservé aux enseignants." }, { status: 403 });
  }

  const { id: courseId } = await params;
  const course = await prisma.course.findFirst({ where: { id: courseId, teacherId: user.teacher.id } });
  if (!course) {
    return NextResponse.json({ error: "Cours introuvable." }, { status: 404 });
  }

  const quizzes = await prisma.quiz.findMany({
    where: { courseId },
    include: { questions: { orderBy: { sortOrder: "asc" } }, attempts: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    quizzes: quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      createdAt: q.createdAt,
      questionCount: q.questions.length,
      questions: q.questions.map((question) => ({
        id: question.id,
        text: question.text,
        options: question.options,
        correctIndex: question.correctIndex,
      })),
      attemptCount: q.attempts.length,
      averageScore:
        q.attempts.length > 0
          ? Math.round((q.attempts.reduce((sum, a) => sum + a.score / a.totalQuestions, 0) / q.attempts.length) * 100)
          : null,
    })),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user?.teacher) {
    return NextResponse.json({ error: "Réservé aux enseignants." }, { status: 403 });
  }

  const { id: courseId } = await params;
  const course = await prisma.course.findFirst({ where: { id: courseId, teacherId: user.teacher.id } });
  if (!course) {
    return NextResponse.json({ error: "Cours introuvable." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const title = String(body?.title || "").trim();
  const questions: QuestionInput[] = Array.isArray(body?.questions) ? body.questions : [];

  if (!title || questions.length === 0) {
    return NextResponse.json({ error: "Titre et au moins une question sont requis." }, { status: 400 });
  }

  for (const q of questions) {
    if (!q.text?.trim() || !Array.isArray(q.options) || q.options.length < 2 || q.options.some((o) => !o?.trim())) {
      return NextResponse.json({ error: "Chaque question doit avoir un énoncé et au moins 2 options non vides." }, { status: 400 });
    }
    if (typeof q.correctIndex !== "number" || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
      return NextResponse.json({ error: "Chaque question doit indiquer une réponse correcte valide." }, { status: 400 });
    }
  }

  const quiz = await prisma.quiz.create({
    data: {
      courseId,
      title,
      questions: {
        create: questions.map((q, index) => ({
          text: q.text.trim(),
          options: q.options.map((o) => o.trim()),
          correctIndex: q.correctIndex,
          sortOrder: index,
        })),
      },
    },
    include: { questions: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json({ success: true, quiz }, { status: 201 });
}
