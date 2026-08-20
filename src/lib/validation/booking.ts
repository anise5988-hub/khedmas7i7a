import { z } from "zod";

export const bookingRequestSchema = z.object({
  teacherId: z.string().min(1),
  startsAt: z.coerce.date(),
  durationMinutes: z.union([z.literal(30), z.literal(60), z.literal(90), z.literal(120)]),
  amountInMillimes: z.number().int().positive(),
  mode: z.enum(["ONLINE", "IN_PERSON"]),
});
