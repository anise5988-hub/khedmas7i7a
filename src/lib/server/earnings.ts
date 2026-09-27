import type { Prisma, PrismaClient } from "@prisma/client";

type TxClient = Prisma.TransactionClient | PrismaClient;

/**
 * Credits a teacher's wallet with their share of a payment, net of the
 * platform commission rate configured in PlatformSettings (default 10%).
 * Must run inside the same transaction as the payment/debit it corresponds to,
 * otherwise a crash between the two could burn student money without ever
 * paying the teacher.
 */
export async function creditTeacherEarning(
  tx: TxClient,
  params: { teacherUserId: string; grossAmountMillimes: number; reference: string },
): Promise<void> {
  if (params.grossAmountMillimes <= 0) return;

  const settings = await tx.platformSettings.findUnique({ where: { id: "default" } });
  const commissionRate = settings?.commissionRate ?? 10;
  const netAmountMillimes = Math.round(params.grossAmountMillimes * (1 - commissionRate / 100));
  if (netAmountMillimes <= 0) return;

  const wallet = await tx.wallet.upsert({
    where: { userId: params.teacherUserId },
    update: { availableMillimes: { increment: netAmountMillimes } },
    create: { userId: params.teacherUserId, availableMillimes: netAmountMillimes, pendingMillimes: 0 },
  });

  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: "TEACHER_EARNING",
      amountMillimes: netAmountMillimes,
      reference: params.reference,
    },
  });
}

/**
 * Credits a flat bonus amount straight to a wallet, with no commission
 * deduction — unlike creditTeacherEarning, which nets out the platform
 * commission rate and would silently shrink a fixed promotional amount
 * like a referral reward.
 */
export async function creditWalletBonus(
  tx: TxClient,
  params: { userId: string; amountMillimes: number; type: "REFERRAL_BONUS"; reference: string },
): Promise<void> {
  if (params.amountMillimes <= 0) return;

  const wallet = await tx.wallet.upsert({
    where: { userId: params.userId },
    update: { availableMillimes: { increment: params.amountMillimes } },
    create: { userId: params.userId, availableMillimes: params.amountMillimes, pendingMillimes: 0 },
  });

  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: params.type,
      amountMillimes: params.amountMillimes,
      reference: params.reference,
    },
  });
}
