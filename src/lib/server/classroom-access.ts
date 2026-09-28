import { prisma } from "@/lib/server/prisma";
import { isDailyConfigured } from "@/lib/server/daily";
import type { Prisma } from "@prisma/client";

/**
 * Live classroom authorization.
 *
 * The booking id in the URL is NOT a secret (it appears in dashboard links),
 * so every route resolves authorization from the signed session here. Two
 * guarantees:
 *  1. only the booking's own student, its teacher or an admin may touch the
 *     classroom's data — a student who edits the id gets 403/404, never
 *     another student's room;
 *  2. the role (isTeacher) comes from the database relation, never from a
 *     client-sent field, so a student can't upgrade themselves to host by
 *     crafting a request.
 */

export type BookingParty = {
  bookingId: string;
  userId: string;
  userName: string;
  isTeacher: boolean;
  isStudent: boolean;
  isAdmin: boolean;
  isHost: boolean; // teacher or admin
};

export async function getBookingParty(
  bookingId: string,
  user: { id: string; role: string; firstName: string; lastName: string } | null,
): Promise<BookingParty | null> {
  if (!user) return null;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      studentId: true,
      status: true,
      startsAt: true,
      payment: { select: { status: true } },
      teacher: { select: { userId: true } },
    },
  });
  if (!booking) return null;

  const isStudent = user.id === booking.studentId;
  const isTeacher = user.id === booking.teacher.userId;
  const isAdmin = user.role === "ADMIN";

  if (!isStudent && !isTeacher && !isAdmin) return null;

  return {
    bookingId,
    userId: user.id,
    userName: `${user.firstName} ${user.lastName}`.trim(),
    isTeacher,
    isStudent,
    isAdmin,
    isHost: isTeacher || isAdmin,
  };
}

/**
 * Full access check used by the session/join route: verifies the reservation
 * itself permits entering (status + payment per the platform's business
 * rules). Admins bypass the payment gate (they supervise), students and
 * teachers do not.
 */
export async function getBookingAccess(
  bookingId: string,
  user: { id: string; role: string; firstName: string; lastName: string } | null,
): Promise<
  | { ok: true; party: BookingParty; paymentStatus: string; bookingStatus: string; startsAt: Date; durationMinutes: number }
  | { ok: false; code: string; status: number; error: string }
> {
  const party = await getBookingParty(bookingId, user);
  if (!party) {
    // Distinguish "doesn't exist" from "not yours" only in wording — neither
    // leaks that a room with this id exists at all.
    const exists = await prisma.booking.findUnique({ where: { id: bookingId }, select: { id: true } });
    return {
      ok: false,
      code: exists ? "UNAUTHORIZED" : "NOT_FOUND",
      status: exists ? 403 : 404,
      error: exists
        ? "Vous ne faites pas partie de cette séance."
        : "Cette séance n'existe pas.",
    };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { status: true, startsAt: true, durationMinutes: true, payment: { select: { status: true } } },
  });
  if (!booking) return { ok: false, code: "NOT_FOUND", status: 404, error: "Cette séance n'existe pas." };

  if (booking.status === "CANCELLED") {
    return { ok: false, code: "CANCELLED", status: 403, error: "Cette séance a été annulée. La classe n'est plus accessible." };
  }

  if (booking.status === "PENDING" && !party.isAdmin) {
    // Neither side has anything to join yet — the teacher must accept or
    // decline the request first. Applies to the teacher too, not just the
    // student: opening a live room for a booking nobody has confirmed makes
    // no sense on either end.
    return {
      ok: false,
      code: "BOOKING_NOT_CONFIRMED",
      status: 403,
      error: "Cette séance n'a pas encore été confirmée par le professeur.",
    };
  }

  if (party.isStudent && !party.isAdmin) {
    // A student can only enter a room that is paid for — an unpaid reservation
    // (PENDING wallet payment, failed provider payment) must not open the
    // classroom. Same gate the booking flow itself enforces.
    const paymentStatus = booking.payment?.status ?? "PENDING";
    if (paymentStatus !== "PAID" && paymentStatus !== "REFUNDED" && booking.status !== "COMPLETED") {
      return {
        ok: false,
        code: "PAYMENT_NOT_CONFIRMED",
        status: 402,
        error: "Le paiement de cette séance n'est pas confirmé. La classe sera accessible après confirmation.",
      };
    }
  }

  return {
    ok: true,
    party,
    paymentStatus: booking.payment?.status ?? "PENDING",
    bookingStatus: booking.status,
    startsAt: booking.startsAt,
    durationMinutes: booking.durationMinutes,
  };
}

// ── Session lookup / creation ────────────────────────────────────────────────

export type ClassroomSessionFull = Prisma.ClassroomSessionGetPayload<{
  include: { participants: true; attendances: true; resources: true; whiteboardPages: true; events: { orderBy: { createdAt: "desc" }; take: 50 } };
}>;

export async function ensureSession(bookingId: string, startsAt: Date, durationMinutes: number) {
  const existing = await prisma.classroomSession.findUnique({ where: { bookingId } });
  if (existing) return existing;

  const scheduledEnd = new Date(startsAt.getTime() + durationMinutes * 60_000);
  try {
    return await prisma.classroomSession.create({
      data: {
        bookingId,
        roomName: generateRoomName(bookingId),
        scheduledStart: startsAt,
        scheduledEnd,
      },
    });
  } catch {
    // Raced with another first-join — the unique(bookingId) winner exists.
    return prisma.classroomSession.findUnique({ where: { bookingId } });
  }
}

export function generateRoomName(bookingId: string): string {
  // Matches the legacy generator so rooms created before this rewrite keep
  // their name pattern; the suffix is what makes the room unguessable.
  return `profyspace-${bookingId}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/** Server-side phase machine — the UI renders whatever this returns. */
export function computePhase(session: {
  status: string;
  phase: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  endedAt: Date | null;
  cancelledAt: Date | null;
  actualStart: Date | null;
  actualEnd: Date | null;
}): "SCHEDULED" | "WAITING" | "STARTING" | "LIVE" | "ENDING_SOON" | "COMPLETED" | "CANCELLED" {
  if (session.status === "CANCELLED" || session.cancelledAt) return "CANCELLED";
  if (session.status === "COMPLETED" || session.endedAt) return "COMPLETED";

  const now = Date.now();
  const start = session.scheduledStart.getTime();
  const end = session.scheduledEnd.getTime();
  const fiveMin = 5 * 60_000;

  if (session.actualStart || session.status === "IN_PROGRESS" || session.phase === "LIVE" || session.phase === "STARTING") {
    if (end - now < fiveMin) return "ENDING_SOON";
    return "LIVE";
  }
  // Not started yet: before the slot it's SCHEDULED, from the scheduled
  // moment up to +15min it's STARTING (people arrive, tech settles), after
  // that, waiting for the first join counts as WAITING.
  if (now < start) return "SCHEDULED";
  if (now < start + 15 * 60_000) return "STARTING";
  return "WAITING";
}

export { isDailyConfigured };
