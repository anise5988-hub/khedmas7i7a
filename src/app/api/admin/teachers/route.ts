import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const teachers = await prisma.teacherProfile.findMany({
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, createdAt: true } },
        subjects: true,
        availabilities: true,
        bookings: { select: { id: true } },
      },
      orderBy: { id: "desc" },
    });

    return NextResponse.json({
      teachers: teachers.map((t) => ({
        id: t.id,
        userId: t.userId,
        slug: t.slug,
        name: `${t.user.firstName} ${t.user.lastName}`.trim(),
        email: t.user.email,
        phone: t.user.phone ?? "Non renseigné",
        title: t.title ?? "Non spécifié",
        bio: t.bio ?? "",
        experienceYears: t.experienceYears,
        hourlyRateTnd: t.hourlyRateMillimes / 1000,
        hourlyRateMillimes: t.hourlyRateMillimes,
        governorate: t.governorate ?? "Non spécifié",
        city: t.city ?? "",
        online: t.online,
        inPerson: t.inPerson,
        verificationStatus: t.verificationStatus,
        subjects: t.subjects.map((s) => s.subject),
        bookingsCount: t.bookings.length,
        createdAt: t.user.createdAt,
      })),
    });
  } catch (error) {
    console.error("Admin teachers fetch failed", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
