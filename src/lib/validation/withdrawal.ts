import { z } from "zod";

export const withdrawalRequestSchema = z.object({
  amountInMillimes: z.number().int().positive().max(100_000_000),
  method: z.enum(["BANK_TRANSFER", "D17", "FLOUCI", "DIGIPOST"]),
  accountDetails: z.string().trim().min(4).max(500),
});

export type WithdrawalRequestInput = z.infer<typeof withdrawalRequestSchema>;
