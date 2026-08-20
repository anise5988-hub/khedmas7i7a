import { z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  phone: z.string().trim().min(8).max(30).optional().or(z.literal("")),
  password: z.string().min(8).max(128),
  role: z.enum(["STUDENT", "TEACHER"]),
});

export type RegisterInput = z.infer<typeof registerSchema>;
