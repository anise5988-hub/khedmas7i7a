import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { subjects } from "@/lib/domain/catalog";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  if (user.role !== "TEACHER" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès réservé aux professeurs." }, { status: 403 });
  }

  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: user.id },
    include: {
      subjects: true,
      availabilities: true,
      bookings: {
        include: {
          student: { select: { firstName: true, lastName: true, email: true, phone: true } },
        },
        orderBy: { startsAt: "desc" },
      },
      withdrawals: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!teacher) return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });

  return NextResponse.json({
    teacher: {
      id: teacher.id,
      slug: teacher.slug,
      avatarUrl: teacher.avatarUrl,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      title: teacher.title,
      bio: teacher.bio,
      experienceYears: teacher.experienceYears,
      hourlyRateMillimes: teacher.hourlyRateMillimes,
      hourlyRateTnd: teacher.hourlyRateMillimes / 1000,
      governorate: teacher.governorate,
      city: teacher.city,
      online: teacher.online,
      inPerson: teacher.inPerson,
      verificationStatus: teacher.verificationStatus,
      subjects: teacher.subjects.map((s) => s.subject),
      availabilities: teacher.availabilities,
      bookings: teacher.bookings,
      withdrawals: teacher.withdrawals,
    },
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Données requises manquantes." }, { status: 400 });

  const hourlyRateMillimes = Number(body.hourlyRateMillimes);
  if (isNaN(hourlyRateMillimes) || hourlyRateMillimes <= 0) {
    return NextResponse.json({ error: "Tarif horaire invalide." }, { status: 400 });
  }

  const selectedSubjects = Array.isArray(body.subjects) ? body.subjects : [];
  const validSubjects = selectedSubjects.filter((s: string) => subjects.includes(s as never));
  if (validSubjects.length === 0) {
    return NextResponse.json({ error: "Veuillez sélectionner au moins une matière valide." }, { status: 400 });
  }

  try {
    let teacher = await prisma.teacherProfile.findUnique({ where: { userId: user.id } });

    if (!teacher) {
      const slug = `${user.firstName}-${user.lastName}-${Date.now()}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      teacher = await prisma.teacherProfile.create({
        data: {
          userId: user.id,
          slug,
          hourlyRateMillimes,
          verificationStatus: "PENDING",
        },
      });
    }

    await prisma.$transaction([
      prisma.teacherProfile.update({
        where: { id: teacher.id },
        data: {
          title: body.title || "Professeur",
          avatarUrl: body.avatarUrl || null,
          bio: body.bio || "",
          experienceYears: Number(body.experienceYears) || 0,
          hourlyRateMillimes,
          governorate: body.governorate || null,
          city: body.city || null,
          online: body.online !== false,
          inPerson: Boolean(body.inPerson),
          verificationStatus: "PENDING",
        },
      }),
      prisma.teacherSubject.deleteMany({ where: { teacherId: teacher.id } }),
      prisma.teacherSubject.createMany({
        data: validSubjects.map((subject: string) => ({
          teacherId: teacher.id,
          subject,
        })),
      }),
      prisma.availability.deleteMany({ where: { teacherId: teacher.id } }),
      ...(Array.isArray(body.availability) && body.availability.length > 0
        ? [
            prisma.availability.createMany({
              data: body.availability.map((item: { dayOfWeek: number; startTime: string; endTime: string }) => ({
                teacherId: teacher.id,
                dayOfWeek: Number(item.dayOfWeek),
                startTime: String(item.startTime),
                endTime: String(item.endTime),
              })),
            }),
          ]
        : []),
    ]);

    return NextResponse.json({
      status: "PENDING",
      message: "Candidature enregistrée avec succès. Elle est actuellement en cours d'examen par l'administration.",
    });
  } catch (error) {
    console.error("Teacher profile submission failed", error);
    return NextResponse.json({ error: "Impossible d'enregistrer la candidature." }, { status: 500 });
  }
}
