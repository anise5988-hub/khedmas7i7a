import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/server/prisma";
import { subjects } from "@/lib/domain/catalog";

export async function POST(request: Request) {
  const userId = (await cookies()).get("profy_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.bio !== "string" || typeof body.title !== "string" || !Number.isInteger(body.hourlyRateMillimes) || body.hourlyRateMillimes <= 0 || !Array.isArray(body.subjects) || !body.subjects.every((item: unknown) => typeof item === "string" && subjects.includes(item as never))) return NextResponse.json({ error: "Informations professeur invalides." }, { status: 400 });
  try {
    const teacher = await prisma.teacherProfile.findUnique({ where: { userId } });
    if (!teacher) return NextResponse.json({ error: "Profil professeur introuvable." }, { status: 404 });
    await prisma.$transaction([
      prisma.teacherProfile.update({ where: { userId }, data: { title: body.title, bio: body.bio, experienceYears: body.experienceYears ?? 0, hourlyRateMillimes: body.hourlyRateMillimes, governorate: body.governorate ?? null, city: body.city ?? null, online: body.online ?? true, inPerson: body.inPerson ?? false, verificationStatus: "PENDING" } }),
      prisma.teacherSubject.deleteMany({ where: { teacherId: teacher.id } }),
      prisma.teacherSubject.createMany({ data: body.subjects.map((subject: string) => ({ teacherId: teacher.id, subject })) }),
      prisma.availability.deleteMany({ where: { teacherId: teacher.id } }),
      prisma.availability.createMany({ data: (body.availability ?? []).map((item: { dayOfWeek: number; startTime: string; endTime: string }) => ({ teacherId: teacher.id, ...item })) }),
    ]);
    return NextResponse.json({ status: "PENDING", message: "Candidature envoyée. Elle sera visible après validation admin." });
  } catch (error) { console.error("Teacher profile failed", error); return NextResponse.json({ error: "Impossible d'enregistrer le profil." }, { status: 503 }); }
}
