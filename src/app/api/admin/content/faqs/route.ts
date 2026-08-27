import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const faqs = await prisma.faqItem.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ faqs });
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  const answer = typeof body?.answer === "string" ? body.answer.trim() : "";
  if (!question || !answer) {
    return NextResponse.json({ error: "Question et réponse obligatoires." }, { status: 400 });
  }

  try {
    const count = await prisma.faqItem.count();
    const faq = await prisma.faqItem.create({
      data: {
        question,
        answer,
        sortOrder: Number.isFinite(body?.sortOrder) ? Number(body.sortOrder) : count,
        active: typeof body?.active === "boolean" ? body.active : true,
      },
    });
    return NextResponse.json({ faq }, { status: 201 });
  } catch (error) {
    console.error("Failed to create FAQ", error);
    return NextResponse.json({ error: "Impossible de créer la question." }, { status: 500 });
  }
}
