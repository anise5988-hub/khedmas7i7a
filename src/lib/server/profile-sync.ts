import { prisma } from "@/lib/server/prisma";

export async function ensureUserProfile(input: { id: string; email: string; firstName?: string; lastName?: string; phone?: string; role?: "STUDENT" | "TEACHER" }) {
  const role = input.role === "TEACHER" ? "TEACHER" : "STUDENT";
  const user = await prisma.user.upsert({ where: { id: input.id }, update: { email: input.email, firstName: input.firstName || "Utilisateur", lastName: input.lastName || "Profy", phone: input.phone || null }, create: { id: input.id, email: input.email, firstName: input.firstName || "Utilisateur", lastName: input.lastName || "Profy", phone: input.phone || null, passwordHash: "supabase_auth", role } });
  await prisma.wallet.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
  if (role === "STUDENT") {
    await prisma.studentProfile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
  } else {
    await prisma.teacherProfile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id, slug: `${user.firstName}-${user.lastName}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"), hourlyRateMillimes: 0 } });
  }
  return user;
}
