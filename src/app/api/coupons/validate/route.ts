import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { validateCoupon } from "@/lib/server/coupons";

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code : "";
  const context = typeof body?.context === "string" ? body.context : "WALLET_DEPOSIT";
  const amountMillimes = Number(body?.amountMillimes);

  if (!code || !Number.isFinite(amountMillimes) || amountMillimes <= 0) {
    return NextResponse.json({ error: "Code ou montant invalide." }, { status: 400 });
  }

  const result = await validateCoupon({ code, userId: user.id, context, amountMillimes });
  if (!result.ok) {
    return NextResponse.json({ valid: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    valid: true,
    discountMillimes: result.discountMillimes,
    discountTnd: result.discountMillimes / 1000,
  });
}
