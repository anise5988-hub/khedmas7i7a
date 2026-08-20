import { z } from "zod";

export const depositSchema = z.object({
  amountMillimes: z.number().int().positive().max(10_000_000),
  method: z.enum(["D17", "BANK_TRANSFER", "FLOUCI"]),
  reference: z.string().trim().min(3).max(120),
});
