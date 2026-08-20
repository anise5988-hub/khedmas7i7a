export const TEACHER_WITHDRAWAL_FEE_PERCENT = 10;

export type WithdrawalBreakdown = {
  requestedAmountInMillimes: number;
  feeAmountInMillimes: number;
  payoutAmountInMillimes: number;
};

export function calculateTeacherWithdrawal(
  requestedAmountInMillimes: number,
): WithdrawalBreakdown {
  if (!Number.isSafeInteger(requestedAmountInMillimes) || requestedAmountInMillimes <= 0) {
    throw new Error("Withdrawal amount must be a positive integer in millimes.");
  }

  const feeAmountInMillimes = Math.round(
    (requestedAmountInMillimes * TEACHER_WITHDRAWAL_FEE_PERCENT) / 100,
  );

  return {
    requestedAmountInMillimes,
    feeAmountInMillimes,
    payoutAmountInMillimes: requestedAmountInMillimes - feeAmountInMillimes,
  };
}

export function formatTndFromMillimes(amountInMillimes: number): string {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    minimumFractionDigits: 3,
  }).format(amountInMillimes / 1000);
}
