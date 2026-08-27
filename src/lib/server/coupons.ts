import { prisma } from "@/lib/server/prisma";
import type { Coupon } from "@prisma/client";

export type CouponValidationResult =
  | { ok: true; coupon: Coupon; discountMillimes: number }
  | { ok: false; error: string };

/**
 * Validates a coupon code against a user + context (e.g. a wallet
 * recharge) and computes the discount/bonus in millimes. Does not mutate
 * anything — callers apply the result themselves inside their own
 * transaction once the underlying action actually completes.
 */
export async function validateCoupon(params: {
  code: string;
  userId: string;
  context: string;
  amountMillimes: number;
}): Promise<CouponValidationResult> {
  const coupon = await prisma.coupon.findUnique({ where: { code: params.code.trim().toUpperCase() } });

  if (!coupon || !coupon.active) {
    return { ok: false, error: "Code promo invalide." };
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { ok: false, error: "Ce code promo a expiré." };
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, error: "Ce code promo a atteint sa limite d'utilisation." };
  }
  if (coupon.minAmountMillimes !== null && params.amountMillimes < coupon.minAmountMillimes) {
    return { ok: false, error: `Montant minimum de ${(coupon.minAmountMillimes / 1000).toFixed(0)} DT requis pour ce code.` };
  }

  const alreadyRedeemed = await prisma.couponRedemption.findUnique({
    where: { couponId_userId_context: { couponId: coupon.id, userId: params.userId, context: params.context } },
  });
  if (alreadyRedeemed) {
    return { ok: false, error: "Vous avez déjà utilisé ce code promo." };
  }

  const discountMillimes =
    coupon.discountType === "PERCENT"
      ? Math.round((params.amountMillimes * coupon.discountValue) / 100)
      : Math.min(coupon.discountValue, params.amountMillimes);

  return { ok: true, coupon, discountMillimes };
}
