import { z } from "zod";

export const depositSchema = z.object({
  amountMillimes: z.number().int().positive().max(10_000_000),
  // Format-only here — payment methods are admin-managed (see PaymentMethod
  // model), not a fixed set, so whether this id is a real, enabled method is
  // checked against the database inside the route handler.
  method: z.string().trim().min(1).max(60),
  reference: z.string().trim().min(3).max(120),
  // Optional URL of an uploaded receipt/screenshot image. Validated as a
  // plain string here; the actual upload happens via /api/uploads/video
  // before this schema ever sees it, and the route only persists the URL.
  proofUrl: z.string().trim().url().max(500).optional(),
});
