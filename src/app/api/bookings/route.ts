import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { bookingRequestSchema } from "@/lib/validation/booking";
import { notifyUser } from "@/lib/server/notification-service";
import { creditTeacherEarning } from "@/lib/server/earnings";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

  try {
    if (user.role === "TEACHER" && user.teacher) {
      const bookings = await prisma.booking.findMany({
        where: { teacherId: user.teacher.id },
        include: {
          student: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          teacher: {
            include: {
              user: { select: { firstName: true, lastName: true } },
              subjects: true,
            },
          },
          payment: true,
        },
        orderBy: { startsAt: "desc" },
      });

      return NextResponse.json({
        bookings: bookings.map((b) => ({
          id: b.id,
          startsAt: b.startsAt,
          durationMinutes: b.durationMinutes,
          amountMillimes: b.amountMillimes,
          amountTnd: b.amountMillimes / 1000,
          status: b.status,
          createdAt: b.createdAt,
          studentName: `${b.student.firstName} ${b.student.lastName}`,
          teacherName: `${b.teacher.user.firstName} ${b.teacher.user.lastName}`,
          teacherSlug: b.teacher.slug,
          subject: b.teacher.subjects[0]?.subject ?? "Cours particulier",
        })),
      });
    }

    const bookings = await prisma.booking.findMany({
      where: { studentId: user.id },
      include: {
        teacher: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, phone: true } },
            subjects: true,
          },
        },
        payment: true,
      },
      orderBy: { startsAt: "desc" },
    });

    return NextResponse.json({
      bookings: bookings.map((b) => ({
        id: b.id,
        startsAt: b.startsAt,
        durationMinutes: b.durationMinutes,
        amountMillimes: b.amountMillimes,
        amountTnd: b.amountMillimes / 1000,
        status: b.status,
        createdAt: b.createdAt,
        studentName: `${user.firstName} ${user.lastName}`,
        teacherName: `${b.teacher.user.firstName} ${b.teacher.user.lastName}`,
        teacherSlug: b.teacher.slug,
        subject: b.teacher.subjects[0]?.subject ?? "Cours particulier",
      })),
    });
  } catch (error) {
    console.error("Bookings fetch failed", error);
    return NextResponse.json({ error: "Impossible de charger les réservations." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise pour réserver." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = bookingRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données de réservation invalides.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (parsed.data.startsAt <= new Date()) {
    return NextResponse.json({ error: "La séance doit être programmée dans le futur." }, { status: 400 });
  }

  try {
    const teacher = await prisma.teacherProfile.findFirst({
      where: {
        OR: [{ id: parsed.data.teacherId }, { slug: parsed.data.teacherId }],
        verificationStatus: "APPROVED",
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Professeur non disponible ou non vérifié." }, { status: 404 });
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    const amountToUse = Math.round((teacher.hourlyRateMillimes * parsed.data.durationMinutes) / 60);

    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          studentId: user.id,
          teacherId: teacher.id,
          startsAt: parsed.data.startsAt,
          durationMinutes: parsed.data.durationMinutes,
          amountMillimes: amountToUse,
          status: "CONFIRMED",
        },
      });

      if (wallet && wallet.availableMillimes >= amountToUse) {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { availableMillimes: { decrement: amountToUse } },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "BOOKING_PAYMENT",
            amountMillimes: -amountToUse,
            reference: `BOOK-${newBooking.id.slice(-6).toUpperCase()}`,
          },
        });

        await tx.payment.create({
          data: {
            bookingId: newBooking.id,
            amountMillimes: amountToUse,
            status: "PAID",
            idempotencyKey: `pay-${newBooking.id}-${Date.now()}`,
          },
        });

        await creditTeacherEarning(tx, {
          teacherUserId: teacher.userId,
          grossAmountMillimes: amountToUse,
          reference: `EARN-BOOK-${newBooking.id}`,
        });
      } else {
        await tx.payment.create({
          data: {
            bookingId: newBooking.id,
            amountMillimes: amountToUse,
            status: "PENDING",
            idempotencyKey: `pay-${newBooking.id}-${Date.now()}`,
          },
        });
      }

      return newBooking;
    });

    const teacherUser = await prisma.teacherProfile.findUnique({ where: { id: teacher.id }, select: { userId: true } });
    const bookingLink = `/dashboard/bookings?bookingId=${booking.id}`;
    await Promise.all([
      notifyUser({ userId: user.id, type: "NEW_BOOKING", title: "Demande de réservation envoyée", message: "Votre demande de séance a été envoyée au professeur.", emailSubject: "Votre demande de réservation Profy a été envoyée", link: bookingLink, dedupeKey: `booking:${booking.id}:student` }),
      ...(teacherUser ? [notifyUser({ userId: teacherUser.userId, type: "NEW_BOOKING", title: "Nouvelle demande de réservation", message: `${user.firstName} ${user.lastName} souhaite réserver une séance.`, emailSubject: "Vous avez une nouvelle demande de séance sur Profy", link: bookingLink, dedupeKey: `booking:${booking.id}:teacher` })] : []),
    ]);

    return NextResponse.json({ success: true, bookingId: booking.id, status: booking.status, message: "Séance réservée avec succès !" }, { status: 201 });
  } catch (error) {
    console.error("Booking creation failed", error);
    return NextResponse.json({ error: "Impossible de créer la réservation." }, { status: 500 });
  }
}
