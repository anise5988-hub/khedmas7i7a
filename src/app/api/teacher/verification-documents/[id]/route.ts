import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { deleteVerificationDocument } from "@/lib/server/verification-storage";

export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user?.teacher) {
    return NextResponse.json({ error: "Réservé aux enseignants." }, { status: 403 });
  }

  const { id } = await params;
  const document = await prisma.teacherVerificationDocument.findUnique({ where: { id } });

  if (!document || document.teacherId !== user.teacher.id) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  }

  await prisma.teacherVerificationDocument.delete({ where: { id } });
  await deleteVerificationDocument(document.storagePath);

  return NextResponse.json({ success: true });
}
