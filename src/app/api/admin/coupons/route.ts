import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { logAdminAction } from "@/lib/server/audit-log";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ coupons });
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  const discountType = body?.discountType === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENT";
  const discountValue = Number(body?.discountValue);

  if (!code) {
    return NextResponse.json({ error: "Code obligatoire." }, { status: 400 });
  }
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return NextResponse.json({ error: "Valeur de réduction invalide." }, { status: 400 });
  }
  if (discountType === "PERCENT" && discountValue > 100) {
    return NextResponse.json({ error: "Un pourcentage ne peut pas dépasser 100." }, { status: 400 });
  }

  try {
    const coupon = await prisma.coupon.create({
      data: {
        code,
        discountType,
        discountValue: Math.round(discountValue),
        maxUses: Number.isFinite(body?.maxUses) ? Number(body.maxUses) : null,
        minAmountMillimes: Number.isFinite(body?.minAmountMillimes) ? Number(body.minAmountMillimes) : null,
        expiresAt: body?.expiresAt ? new Date(body.expiresAt) : null,
        active: typeof body?.active === "boolean" ? body.active : true,
      },
    });

    await logAdminAction({ actor: user, action: "COUPON_CREATED", targetType: "Coupon", targetId: coupon.id, metadata: { code } });

    return NextResponse.json({ coupon }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Ce code existe déjà." }, { status: 409 });
    }
    console.error("Failed to create coupon", error);
    return NextResponse.json({ error: "Impossible de créer le coupon." }, { status: 500 });
  }
}
