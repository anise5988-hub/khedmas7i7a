import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { logAdminAction } from "@/lib/server/audit-log";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.paymentMethod.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Méthode introuvable." }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name || name.length > 100) return NextResponse.json({ error: "Nom invalide." }, { status: 400 });
    data.name = name;
  }
  if (typeof body.recipientTitle === "string") {
    const recipientTitle = body.recipientTitle.trim();
    if (!recipientTitle || recipientTitle.length > 100) return NextResponse.json({ error: "Intitulé invalide." }, { status: 400 });
    data.recipientTitle = recipientTitle;
  }
  if (typeof body.recipientValue === "string") {
    data.recipientValue = body.recipientValue.trim() || null;
  }
  if (typeof body.instructions === "string") {
    const instructions = body.instructions.trim();
    if (!instructions || instructions.length > 1000) return NextResponse.json({ error: "Instructions invalides." }, { status: 400 });
    data.instructions = instructions;
  }
  if (typeof body.enabled === "boolean") {
    data.enabled = body.enabled;
  }
  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
    data.sortOrder = Math.trunc(body.sortOrder);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Aucun champ valide fourni." }, { status: 400 });
  }

  const updated = await prisma.paymentMethod.update({ where: { id }, data });
  await logAdminAction({ actor: user, action: "PAYMENT_METHOD_UPDATED", targetType: "PaymentMethod", targetId: id, metadata: data });

  return NextResponse.json({ method: updated });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.paymentMethod.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Méthode introuvable." }, { status: 404 });

  // Past deposits keep the method's name as a plain string (see
  // WalletDeposit.method), not a foreign key — deleting a method here never
  // touches or orphans historical records.
  await prisma.paymentMethod.delete({ where: { id } });
  await logAdminAction({ actor: user, action: "PAYMENT_METHOD_DELETED", targetType: "PaymentMethod", targetId: id, metadata: { name: existing.name } });

  return NextResponse.json({ success: true });
}
