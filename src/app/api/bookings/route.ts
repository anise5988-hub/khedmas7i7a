import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { bookingRequestSchema } from "@/lib/validation/booking";
import { notifyUser } from "@/lib/server/notification-service";
import { promoteRecordingIfReady } from "@/lib/server/classroom-session";

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
          classroomSession: { select: { status: true, recordingStatus: true, recordingUrl: true } },
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
          classroomStatus: b.classroomSession?.status ?? null,
          recordingStatus: b.classroomSession?.recordingStatus ?? "NOT_AVAILABLE",
          recordingUrl: b.classroomSession?.recordingUrl ?? null,
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
        classroomSession: { select: { bookingId: true, status: true, recordingStatus: true, recordingUrl: true, roomName: true, endedAt: true } },
      },
      orderBy: { startsAt: "desc" },
    });

    // A recording that finished processing since the student's last visit
    // shouldn't require them to reopen the classroom just to unstick it —
    // their bookings/replays list promotes it to AVAILABLE on its own.
    const promotions = new Map<string, { recordingStatus: string; recordingUrl: string | null }>();
    await Promise.all(
      bookings.map(async (b) => {
        if (!b.classroomSession) return;
        const promoted = await promoteRecordingIfReady(b.classroomSession);
        if (promoted) promotions.set(b.id, promoted);
      }),
    );

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
        teacherId: b.teacher.id,
        teacherName: `${b.teacher.user.firstName} ${b.teacher.user.lastName}`,
        teacherSlug: b.teacher.slug,
        subject: b.teacher.subjects[0]?.subject ?? "Cours particulier",
        classroomStatus: b.classroomSession?.status ?? null,
        recordingStatus: promotions.get(b.id)?.recordingStatus ?? b.classroomSession?.recordingStatus ?? "NOT_AVAILABLE",
        recordingUrl: promotions.get(b.id)?.recordingUrl ?? b.classroomSession?.recordingUrl ?? null,
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

    if (teacher.userId === user.id) {
      return NextResponse.json({ error: "Vous ne pouvez pas réserver une séance avec vous-même." }, { status: 400 });
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    const amountToUse = Math.round((teacher.hourlyRateMillimes * parsed.data.durationMinutes) / 60);

    const newStart = parsed.data.startsAt;
    const newEnd = new Date(newStart.getTime() + parsed.data.durationMinutes * 60_000);
    // Longest bookable session is 120min (see bookingRequestSchema) — any
    // existing booking starting before that can't possibly still be
    // running by newStart, so it's a safe lower bound for the candidate scan.
    const MAX_DURATION_MS = 120 * 60_000;

    let booking;
    try {
      booking = await prisma.$transaction(
        async (tx) => {
          // A slot is unavailable as soon as another request holds it, not
          // just once the teacher confirms — otherwise two students could
          // both pay for the same overlapping time and the teacher could
          // only ever accept one.
          const candidates = await tx.booking.findMany({
            where: {
              teacherId: teacher.id,
              status: { in: ["CONFIRMED", "PENDING"] },
              startsAt: { lt: newEnd, gte: new Date(newStart.getTime() - MAX_DURATION_MS) },
            },
            select: { startsAt: true, durationMinutes: true },
          });
          const hasOverlap = candidates.some((b) => {
            const existingEnd = new Date(b.startsAt.getTime() + b.durationMinutes * 60_000);
            return b.startsAt < newEnd && existingEnd > newStart;
          });
          if (hasOverlap) {
            throw new Error("SLOT_CONFLICT");
          }

          // PENDING, not CONFIRMED — this is a request to the teacher, who
          // must explicitly accept or decline (see /accept and /decline)
          // before the slot is really theirs and before they see a cent of
          // it. The student's payment is taken up front either way, held
          // against the booking rather than the teacher's wallet, so a
          // decline can refund it in full with nothing to unwind on the
          // teacher's side.
          const newBooking = await tx.booking.create({
            data: {
              studentId: user.id,
              teacherId: teacher.id,
              startsAt: parsed.data.startsAt,
              durationMinutes: parsed.data.durationMinutes,
              amountMillimes: amountToUse,
              status: "PENDING",
            },
          });

          // A session may only be created against money the student actually
          // holds. Debiting and creating the booking must happen together: a
          // booking with an unpaid Payment would stay PENDING forever (no
          // code path ever settles a PENDING payment after a top-up), locking
          // the slot for nothing.
          const reserved = wallet
            ? await tx.wallet.updateMany({
                where: { id: wallet.id, availableMillimes: { gte: amountToUse } },
                data: { availableMillimes: { decrement: amountToUse } },
              })
            : null;

          if (!reserved || reserved.count !== 1) {
            throw new Error("INSUFFICIENT_BALANCE");
          }

          await tx.walletTransaction.create({
            data: {
              walletId: wallet!.id,
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

          // Not credited to the teacher yet — see POST /api/bookings/[id]/accept.

          return newBooking;
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (error instanceof Error && error.message === "SLOT_CONFLICT") {
        return NextResponse.json(
          { error: "Ce créneau vient d'être réservé par un autre élève. Veuillez choisir un autre horaire." },
          { status: 409 },
        );
      }
      if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json(
          {
            error: `Solde insuffisant : cette séance coûte ${(amountToUse / 1000).toFixed(3)} DT. Rechargez votre portefeuille pour réserver.`,
            code: "INSUFFICIENT_BALANCE",
            requiredMillimes: amountToUse,
            availableMillimes: wallet?.availableMillimes ?? 0,
            shortfallMillimes: Math.max(0, amountToUse - (wallet?.availableMillimes ?? 0)),
          },
          { status: 402 },
        );
      }
      // Serializable isolation surfaces real concurrent conflicts as a
      // Prisma write-conflict error (P2034) rather than our own check —
      // treat it the same way rather than a generic 500.
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2034") {
        return NextResponse.json(
          { error: "Ce créneau vient d'être réservé par un autre élève. Veuillez réessayer." },
          { status: 409 },
        );
      }
      throw error;
    }

    const teacherUser = await prisma.teacherProfile.findUnique({ where: { id: teacher.id }, select: { userId: true } });
    await Promise.all([
      notifyUser({
        userId: user.id,
        type: "NEW_BOOKING",
        title: "Demande de réservation envoyée",
        message: "Votre demande de séance a été envoyée au professeur. Vous serez notifié dès qu'il l'aura acceptée.",
        emailSubject: "Votre demande de réservation Profy a été envoyée",
        link: "/dashboard/classes",
        dedupeKey: `booking:${booking.id}:student`,
      }),
      ...(teacherUser
        ? [
            notifyUser({
              userId: teacherUser.userId,
              type: "NEW_BOOKING",
              title: "Nouvelle demande de réservation",
              message: `${user.firstName} ${user.lastName} souhaite réserver une séance. Acceptez ou refusez la demande.`,
              emailSubject: "Vous avez une nouvelle demande de séance sur Profy",
              link: "/teacher/dashboard/bookings",
              dedupeKey: `booking:${booking.id}:teacher`,
            }),
          ]
        : []),
    ]);

    return NextResponse.json({ success: true, bookingId: booking.id, status: booking.status, message: "Demande de réservation envoyée au professeur ! Vous serez notifié dès sa réponse." }, { status: 201 });
  } catch (error) {
    console.error("Booking creation failed", error);
    return NextResponse.json({ error: "Impossible de créer la réservation." }, { status: 500 });
  }
}
