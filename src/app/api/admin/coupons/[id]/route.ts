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
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Données requises manquantes." }, { status: 400 });

  try {
    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        ...(typeof body.active === "boolean" ? { active: body.active } : {}),
        ...(typeof body.maxUses === "number" || body.maxUses === null ? { maxUses: body.maxUses } : {}),
        ...(body.expiresAt !== undefined ? { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null } : {}),
      },
    });

    await logAdminAction({ actor: user, action: "COUPON_UPDATED", targetType: "Coupon", targetId: coupon.id, metadata: body });

    return NextResponse.json({ coupon });
  } catch (error) {
    console.error("Failed to update coupon", error);
    return NextResponse.json({ error: "Impossible de modifier le coupon." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const { id } = await params;
  try {
    await prisma.coupon.delete({ where: { id } });
    await logAdminAction({ actor: user, action: "COUPON_DELETED", targetType: "Coupon", targetId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete coupon", error);
    return NextResponse.json({ error: "Impossible de supprimer le coupon." }, { status: 500 });
  }
}
