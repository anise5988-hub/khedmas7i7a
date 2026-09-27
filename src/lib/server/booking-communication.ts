import { prisma } from "@/lib/server/prisma";
import { notifyUser } from "@/lib/server/notification-service";

/**
 * Shared rules for the private "séance" thread that links a student and a
 * teacher for a given booking (before, during and after the lesson).
 *
 * Everything here is derived from the request's own identity — never from a
 * client-supplied id — so an authenticated user can only ever open a thread
 * they actually belong to.
 */

export type BookingThreadSide = {
  bookingId: string;
  booking: {
    id: string;
    startsAt: Date;
    durationMinutes: number;
    status: string;
    studentId: string;
    subject: string;
    studentName: string;
    teacherUserId: string;
    teacherName: string;
  };
  otherUserId: string;
  otherName: string;
  /** True when the caller is the teacher of that booking. */
  isTeacher: boolean;
};

/** "Mathématiques - Séance de révision" -> "mathematiques-seance-de-revision" */
export function slugifySubject(subject: string): string {
  return subject
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/**
 * Resolves the booking behind a thread and checks that the caller is one of
 * its two participants. Returns null when the booking doesn't exist or the
 * caller has no business seeing it.
 */
export async function getBookingThreadSide(
  userId: string,
  bookingId: string,
): Promise<BookingThreadSide | null> {
  if (!bookingId) return null;

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

  if (!booking) return null;

  const isStudent = booking.studentId === userId;
  const isTeacher = booking.teacher.userId === userId;
  if (!isStudent && !isTeacher) return null;

  const studentName = `${booking.student.firstName} ${booking.student.lastName}`.trim();
  const teacherName = `Prof. ${booking.teacher.user.firstName} ${booking.teacher.user.lastName}`.trim();

  return {
    bookingId: booking.id,
    booking: {
      id: booking.id,
      startsAt: booking.startsAt,
      durationMinutes: booking.durationMinutes,
      status: booking.status,
      studentId: booking.studentId,
      subject: booking.teacher.subjects[0]?.subject ?? "Cours particulier",
      studentName,
      teacherUserId: booking.teacher.user.id,
      teacherName,
    },
    otherUserId: isTeacher ? booking.studentId : booking.teacher.user.id,
    otherName: isTeacher ? studentName : teacherName,
    isTeacher,
  };
}

/**
 * Finds (or creates) the conversation that belongs to a booking's
 * participants, and returns it only if the caller is a participant.
 */
export async function getBookingConversationId(
  userId: string,
  bookingId: string,
): Promise<{ conversationId: string | null; side: BookingThreadSide | null }> {
  const side = await getBookingThreadSide(userId, bookingId);
  if (!side) return { conversationId: null, side: null };

  const conversation = await prisma.conversation.upsert({
    where: {
      studentId_teacherId: {
        studentId: side.booking.studentId,
        teacherId: side.booking.teacherUserId,
      },
    },
    update: {},
    create: {
      studentId: side.booking.studentId,
      teacherId: side.booking.teacherUserId,
    },
    select: { id: true },
  });

  return { conversationId: conversation.id, side };
}

/** Formats an instant as "CET" wall-clock text, e.g. "lun. 12 mai à 16:00". */
export function formatSessionSlot(date: Date): string {
  const day = date.toLocaleDateString("fr-TN", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = date.toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" });
  return `${day} à ${time}`;
}

export type BookingUpdateContext = {
  /** "teacher" = the teacher is proposing, "student" = the student is asking. */
  requesterRole: "TEACHER" | "STUDENT";
  requesterName: string;
  booking: {
    id: string;
    studentId: string;
    teacherUserId: string;
    subject: string;
    startsAt: Date;
  };
  newStartsAt: Date;
  durationMinutes: number;
  message?: string | null;
};

/**
 * Tells the other side (in-app + email) that a new session time is on the
 * table. Both parties stay free to reply in the thread, so this is a
 * proposal, not a silent reschedule of a paid booking.
 *
 * Note: this runs from a route handler, where `prisma` is the runtime client,
 * so `notifyUser` (which is built on the same client) is safe to call.
 */
export async function notifyScheduleUpdate(context: BookingUpdateContext): Promise<void> {
  const recipientId =
    context.requesterRole === "TEACHER" ? context.booking.studentId : context.booking.teacherUserId;
  const recipientLabel = context.requesterRole === "TEACHER" ? "Votre professeur" : "Votre élève";
  const link =
    context.requesterRole === "TEACHER"
      ? `/dashboard/messages?bookingId=${context.booking.id}`
      : `/teacher/dashboard/messages?bookingId=${context.booking.id}`;

  await notifyUser({
    userId: recipientId,
    type: "BOOKING_RESCHEDULE_REQUEST",
    title: "Nouvelle proposition d'horaire de séance",
    message: `${recipientLabel} vous propose une nouvelle date pour « ${context.booking.subject} » : ${formatSessionSlot(
      context.newStartsAt,
    )} (${context.durationMinutes} min). Répondez dans la messagerie de la séance pour confirmer.`,
    emailSubject: `Proposition d'horaire — ${context.booking.subject}`,
    emailMessage:
      `${context.requesterName} propose de déplacer la séance « ${context.booking.subject} » au ${formatSessionSlot(
        context.newStartsAt,
      )} (durée ${context.durationMinutes} min).` +
      (context.message ? `\n\nMessage : ${context.message}` : "") +
      `\n\nRépondez directement dans la messagerie de la séance.`,
    link,
    dedupeKey: `booking_reschedule:${context.booking.id}:${context.newStartsAt.getTime()}`,
  });
}