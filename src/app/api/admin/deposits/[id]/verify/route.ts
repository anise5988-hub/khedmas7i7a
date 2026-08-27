import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { PaymentStatus } from "@prisma/client";
import { notifyUser } from "@/lib/server/notification-service";
import { logAdminAction } from "@/lib/server/audit-log";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const status = body?.status as PaymentStatus;

  if (!status || !["PAID", "FAILED", "CANCELLED"].includes(status)) {
    return NextResponse.json({ error: "Statut de paiement invalide." }, { status: 400 });
  }

  try {
    const deposit = await prisma.walletDeposit.findUnique({
      where: { id },
      include: { wallet: { select: { userId: true } } },
    });
    if (!deposit) return NextResponse.json({ error: "Dépôt introuvable." }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.walletDeposit.update({
        where: { id },
        data: { status },
      });

      if (status === "PAID" && deposit.status !== "PAID") {
        // Re-validate the coupon fresh (not the request-time snapshot) —
        // it's the only point that's actually authoritative, since a user
        // could have multiple pending deposits queued on the same code and
        // only one may ever redeem it.
        let bonusMillimes = 0;
        if (deposit.couponCode) {
          const coupon = await tx.coupon.findUnique({ where: { code: deposit.couponCode } });
          const alreadyRedeemed = coupon
            ? await tx.couponRedemption.findUnique({
                where: { couponId_userId_context: { couponId: coupon.id, userId: deposit.wallet.userId, context: "WALLET_DEPOSIT" } },
              })
            : null;
          const stillValid =
            coupon &&
            coupon.active &&
            (!coupon.expiresAt || coupon.expiresAt >= new Date()) &&
            (coupon.maxUses === null || coupon.usedCount < coupon.maxUses) &&
            (coupon.minAmountMillimes === null || deposit.amountMillimes >= coupon.minAmountMillimes) &&
            !alreadyRedeemed;

          if (stillValid && coupon) {
            bonusMillimes =
              coupon.discountType === "PERCENT"
                ? Math.round((deposit.amountMillimes * coupon.discountValue) / 100)
                : Math.min(coupon.discountValue, deposit.amountMillimes);

            await tx.couponRedemption.create({
              data: {
                couponId: coupon.id,
                userId: deposit.wallet.userId,
                context: "WALLET_DEPOSIT",
                amountOffMillimes: bonusMillimes,
              },
            });
            await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
            await tx.walletDeposit.update({ where: { id }, data: { bonusMillimes } });
          }
        }

        const totalCredit = deposit.amountMillimes + bonusMillimes;

        await tx.wallet.update({
          where: { id: deposit.walletId },
          data: { availableMillimes: { increment: totalCredit } },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: deposit.walletId,
            type: "DEPOSIT",
            amountMillimes: totalCredit,
            reference: `DEP-${deposit.reference}`,
          },
        });
      }
    });

    const depositWallet = deposit.wallet;
    if (depositWallet?.userId) {
      if (status === "PAID") {
        await notifyUser({
          userId: depositWallet.userId,
          type: "PAYMENT_SUCCESS",
          title: "Recharge portefeuille validée ! 💳",
          message: `Votre recharge de ${(deposit.amountMillimes / 1000).toFixed(1)} DT a été validée et créditée à votre portefeuille.`,
          emailSubject: `Votre recharge de ${(deposit.amountMillimes / 1000).toFixed(1)} DT a été validée`,
          link: "/dashboard/wallet",
          dedupeKey: `deposit_verified:${deposit.id}:${status}`,
        });
      } else {
        await notifyUser({
          userId: depositWallet.userId,
          type: "PAYMENT_FAILED",
          title: "Recharge portefeuille non validée",
          message: `Votre demande de recharge (${deposit.reference}) n'a pas pu être validée par l'administration.`,
          emailSubject: `Mise à jour concernant votre recharge (${deposit.reference})`,
          link: "/dashboard/wallet",
          dedupeKey: `deposit_verified:${deposit.id}:${status}`,
        });
      }
    }

    await logAdminAction({
      actor: user,
      action: "DEPOSIT_STATUS_CHANGED",
      targetType: "WalletDeposit",
      targetId: deposit.id,
      metadata: { status, amountMillimes: deposit.amountMillimes, method: deposit.method },
    });

    return NextResponse.json({
      success: true,
      message: status === "PAID" ? "Dépôt approuvé et solde crédité !" : "Dépôt rejeté.",
    });
  } catch (error) {
    console.error("Deposit verification failed", error);
    return NextResponse.json({ error: "Impossible de traiter le dépôt." }, { status: 500 });
  }
}
