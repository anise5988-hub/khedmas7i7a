import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { z } from "zod";

const replySchema = z.object({
  teacherReply: z.string().trim().min(1).max(1000),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = replySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Veuillez écrire une réponse valide." }, { status: 400 });
  }

  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const review = await prisma.review.findUnique({ where: { id }, select: { teacherId: true } });
  if (!review) {
    return NextResponse.json({ error: "Avis introuvable." }, { status: 404 });
  }

  const isOwner = user.teacher?.id === review.teacherId || user.role === "ADMIN";
  if (!isOwner) {
    return NextResponse.json({ error: "Vous ne pouvez répondre qu'à vos propres avis." }, { status: 403 });
  }

  const updated = await prisma.review.update({
    where: { id },
    data: { teacherReply: parsed.data.teacherReply, repliedAt: new Date() },
  });

  return NextResponse.json({ success: true, teacherReply: updated.teacherReply, repliedAt: updated.repliedAt });
}
