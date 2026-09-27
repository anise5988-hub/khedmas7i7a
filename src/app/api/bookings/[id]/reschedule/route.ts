import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { notifyScheduleUpdate } from "@/lib/server/booking-communication";
import { sendMessage } from "@/lib/server/chat-repository";
import { formatSessionSlot } from "@/lib/server/booking-communication";

export const runtime = "nodejs";

const bodySchema = z.object({
  startsAt: z.coerce.date(),
  durationMinutes: z.union([z.literal(30), z.literal(60), z.literal(90), z.literal(120)]).optional(),
  message: z.string().max(600).optional(),
});

/** Longest bookable session (see bookingRequestSchema) — used for overlap scan bounds. */
const MAX_DURATION_MS = 120 * 60_000;

/**
 * POST /api/bookings/[id]/reschedule
 *
 * Records a new time for a booked session and tells the other participant.
 *
 * Deliberately *not* a silent paid-booking rewrite: the booking keeps its
 * status and its money, the new time is written to `startsAt`, and the
 * other side is notified (in-app + email) and answered in the session
 * thread. That way a student never discovers their lesson moved with no
 * notice, and no refund/ledger entry is invented for a change the two
 * parties are still agreeing on.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }

  const { id: bookingId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nouvelle date ou durée invalide.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (parsed.data.startsAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "La nouvelle date doit être dans le futur." }, { status: 400 });
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        teacher: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            subjects: { select: { subject: true } },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
    }

    const isTeacher = booking.teacher.userId === user.id;
    const isStudent = booking.studentId === user.id;
    if (!isTeacher && !isStudent) {
      return NextResponse.json({ error: "Vous n'avez pas accès à cette réservation." }, { status: 403 });
    }
    if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Cette séance est terminée ou annulée : sa date ne peut plus être modifiée." },
        { status: 409 },
      );
    }

    const durationMinutes = parsed.data.durationMinutes ?? booking.durationMinutes;
    const newStart = parsed.data.startsAt;
    const newEnd = new Date(newStart.getTime() + durationMinutes * 60_000);

    const updated = await prisma.$transaction(async (tx) => {
      // Same overlap rule as booking creation: the teacher cannot end up
      // with two confirmed sessions running at once.
      const candidates = await tx.booking.findMany({
        where: {
          teacherId: booking.teacherId,
          status: "CONFIRMED",
          id: { not: booking.id },
          startsAt: { lt: newEnd, gte: new Date(newStart.getTime() - MAX_DURATION_MS) },
        },
        select: { startsAt: true, durationMinutes: true },
      });

      const hasOverlap = candidates.some((candidate) => {
        const existingEnd = new Date(candidate.startsAt.getTime() + candidate.durationMinutes * 60_000);
        return candidate.startsAt < newEnd && existingEnd > newStart;
      });
      if (hasOverlap) {
        throw new Error("SLOT_CONFLICT");
      }

      return tx.booking.update({
        where: { id: booking.id },
        data: { startsAt: newStart, durationMinutes },
      });
    }, { isolationLevel: "Serializable" });

    const subject = booking.teacher.subjects[0]?.subject ?? "Cours particulier";
    const requesterName = `${user.firstName} ${user.lastName}`.trim();
    const requesterRole = isTeacher ? "TEACHER" : "STUDENT";

    await notifyScheduleUpdate({
      requesterRole,
      requesterName,
      newStartsAt: newStart,
      durationMinutes,
      message: parsed.data.message ?? null,
      booking: {
        id: booking.id,
        studentId: booking.studentId,
        teacherUserId: booking.teacher.userId,
        subject,
        startsAt: booking.startsAt,
      },
    });

    // A system line in the session thread keeps the whole story (old date,
    // new date, who asked, optional note) next to the conversation itself.
    let conversationId: string | null = null;
    try {
      const conversation = await prisma.conversation.upsert({
        where: {
          studentId_teacherId: {
            studentId: booking.studentId,
            teacherId: booking.teacher.userId,
          },
        },
        update: {},
        create: { studentId: booking.studentId, teacherId: booking.teacher.userId },
        select: { id: true },
      });
      conversationId = conversation.id;

      const note = parsed.data.message?.trim();
      await sendMessage({
        conversationId: conversation.id,
        senderId: user.id,
        text:
          `📅 Nouvelle proposition d'horaire : ${formatSessionSlot(newStart)} (${durationMinutes} min). ` +
          `Ancienne date : ${formatSessionSlot(booking.startsAt)}.` +
          (note ? `\nMessage : ${note}` : ""),
      });
    } catch (threadError) {
      // The reschedule itself succeeded; a missing chat line must not turn
      // that into a failure for the teacher.
      console.warn("Session thread update skipped", threadError);
    }

    return NextResponse.json({
      success: true,
      conversationId,
      booking: {
        id: updated.id,
        startsAt: updated.startsAt,
        durationMinutes: updated.durationMinutes,
        status: updated.status,
      },
      message: isTeacher
        ? "Nouvelle date enregistrée. L'élève a été notifié et peut répondre dans la discussion de la séance."
        : "Nouvelle date demandée. Votre professeur a été notifié et peut confirmer dans la discussion.",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SLOT_CONFLICT") {
      return NextResponse.json(
        { error: "Ce créneau chevauche une autre séance confirmée du professeur. Choisissez un autre horaire." },
        { status: 409 },
      );
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2034") {
      return NextResponse.json({ error: "Conflit de réservation simultané. Veuillez réessayer." }, { status: 409 });
    }
    console.error("Booking reschedule failed", error);
    return NextResponse.json({ error: "Impossible de mettre à jour la date de cette séance." }, { status: 500 });
  }
}