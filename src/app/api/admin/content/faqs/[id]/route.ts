import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Données requises manquantes." }, { status: 400 });

  try {
    const faq = await prisma.faqItem.update({
      where: { id },
      data: {
        ...(typeof body.question === "string" ? { question: body.question.trim() } : {}),
        ...(typeof body.answer === "string" ? { answer: body.answer.trim() } : {}),
        ...(typeof body.sortOrder === "number" ? { sortOrder: body.sortOrder } : {}),
        ...(typeof body.active === "boolean" ? { active: body.active } : {}),
      },
    });
    return NextResponse.json({ faq });
  } catch (error) {
    console.error("Failed to update FAQ", error);
    return NextResponse.json({ error: "Impossible de modifier la question." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const { id } = await params;
  try {
    await prisma.faqItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete FAQ", error);
    return NextResponse.json({ error: "Impossible de supprimer la question." }, { status: 500 });
  }
}
