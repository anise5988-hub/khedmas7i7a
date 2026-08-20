import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const bookings = await prisma.booking.findMany({
      include: {
        student: { select: { firstName: true, lastName: true, email: true, phone: true } },
        teacher: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, phone: true } },
            subjects: true,
          },
        },
        payment: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      bookings: bookings.map((b) => ({
        id: b.id,
        studentName: `${b.student.firstName} ${b.student.lastName}`,
        studentEmail: b.student.email,
        studentPhone: b.student.phone ?? "—",
        teacherName: `${b.teacher.user.firstName} ${b.teacher.user.lastName}`,
        teacherSlug: b.teacher.slug,
        subject: b.teacher.subjects[0]?.subject ?? "Cours particulier",
        startsAt: b.startsAt,
        durationMinutes: b.durationMinutes,
        amountTnd: b.amountMillimes / 1000,
        status: b.status,
        paymentStatus: b.payment?.status ?? "PENDING",
        createdAt: b.createdAt,
      })),
    });
  } catch (error) {
    console.error("Admin bookings fetch failed", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
