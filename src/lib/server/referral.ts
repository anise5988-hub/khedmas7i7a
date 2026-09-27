import { prisma } from "@/lib/server/prisma";
import { creditWalletBonus } from "@/lib/server/earnings";

const REFERRAL_BONUS_MILLIMES = 10_000; // 10 DT, flat, to both referrer and referred student

/**
 * Awards a one-time 10 DT bonus to both a referred student and their
 * referrer, the first time the referred student completes a booking.
 * Safe to call on every booking completion — the guarded updateMany
 * claim below (User.referralBonusAwardedAt) ensures this only ever
 * fires once per student, even if two different bookings for the same
 * student complete at nearly the same moment. If the claim's winner
 * turns out not to be the chronologically-first completed booking, the
 * bonus is simply skipped rather than retried or double-awarded — the
 * flag is already set either way, so this never runs twice.
 */
export async function maybeAwardReferralBonus(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { studentId: true } });
  if (!booking) return;

  await prisma.$transaction(async (tx) => {
    const claim = await tx.user.updateMany({
      where: { id: booking.studentId, referredById: { not: null }, referralBonusAwardedAt: null },
      data: { referralBonusAwardedAt: new Date() },
    });
    if (claim.count !== 1) return;

    const student = await tx.user.findUnique({ where: { id: booking.studentId }, select: { referredById: true } });
    if (!student?.referredById) return;

    const completedCount = await tx.booking.count({ where: { studentId: booking.studentId, status: "COMPLETED" } });
    if (completedCount !== 1) return;

    await creditWalletBonus(tx, {
      userId: student.referredById,
      amountMillimes: REFERRAL_BONUS_MILLIMES,
      type: "REFERRAL_BONUS",
      reference: `referral-referrer-${bookingId}`,
    });
    await creditWalletBonus(tx, {
      userId: booking.studentId,
      amountMillimes: REFERRAL_BONUS_MILLIMES,
      type: "REFERRAL_BONUS",
      reference: `referral-referred-${bookingId}`,
    });
  });
}
