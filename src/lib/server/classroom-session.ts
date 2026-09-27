import crypto from "crypto";
import { prisma } from "@/lib/server/prisma";
import { createDailyRoom, createDailyMeetingToken, isDailyConfigured } from "@/lib/server/daily";
import { maybeAwardReferralBonus } from "@/lib/server/referral";

const JOIN_WINDOW_AFTER_MINUTES = 60; // grace period for lessons running over
const ROOM_EXPIRY_AFTER_MINUTES = JOIN_WINDOW_AFTER_MINUTES + 30; // buffer past the join grace period

// Not applied right now — the join window is disabled in getJoinWindow().
// Kept so the previous behaviour can be restored with one edit.
const JOIN_WINDOW_BEFORE_MINUTES = 10;

function generateRoomName(bookingId: string): string {
  // The booking id alone isn't secret (visible in dashboard URLs), so the
  // actual room name mixes in a random suffix — knowing a booking id
  // doesn't get you into its room.
  const suffix = crypto.randomBytes(8).toString("hex");
  return `profyspace-${bookingId}-${suffix}`;
}

export async function getOrCreateClassroomSession(bookingId: string) {
  const existing = await prisma.classroomSession.findUnique({ where: { bookingId } });
  if (existing) return existing;

  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { startsAt: true, durationMinutes: true } });
  if (!booking) return null;

  const scheduledEnd = new Date(booking.startsAt.getTime() + booking.durationMinutes * 60_000);
  const roomName = generateRoomName(bookingId);

  let roomUrl: string | null = null;
  if (isDailyConfigured()) {
    const roomExpiresAt = new Date(scheduledEnd.getTime() + ROOM_EXPIRY_AFTER_MINUTES * 60_000);
    const room = await createDailyRoom(roomName, roomExpiresAt);
    roomUrl = room.url;
  }

  try {
    return await prisma.classroomSession.create({
      data: {
        bookingId,
        roomName,
        roomUrl,
        scheduledStart: booking.startsAt,
        scheduledEnd,
      },
    });
  } catch {
    // Two simultaneous first-joins raced to create it — fetch the winner.
    return prisma.classroomSession.findUnique({ where: { bookingId } });
  }
}

export async function mintJoinToken(session: { roomName: string; roomUrl: string | null }, userName: string, isOwner: boolean, userId?: string) {
  if (!session.roomUrl) return null;
  return createDailyMeetingToken(session.roomName, userName, isOwner, userId);
}

export function getJoinWindow(session: { scheduledStart: Date; scheduledEnd: Date }) {
  // The join window is intentionally disabled: a participant can enter the room
  // at any time, before or after the scheduled slot. The booking still decides
  // *who* may join (see authorizeBookingParticipant), which is the check that
  // actually protects a private session; the clock no longer decides *when*.
  // Re-enable by restoring the opensAt/closesAt comparisons below.
  const opensAt = session.scheduledStart;
  const closesAt = session.scheduledEnd;
  return {
    opensAt,
    closesAt,
    canJoinNow: true,
    isTooEarly: false,
    isTooLate: false,
  };
}

export async function recordJoin(bookingId: string, role: "TEACHER" | "STUDENT") {
  const field = role === "TEACHER" ? "teacherJoinedAt" : "studentJoinedAt";
  const session = await prisma.classroomSession.findUnique({ where: { bookingId } });
  if (!session) return null;

  const data: Record<string, unknown> = {};
  if (!session[field]) data[field] = new Date();
  if (session.status === "SCHEDULED") {
    data.status = "IN_PROGRESS";
    data.actualStart = session.actualStart || new Date();
  }

  if (Object.keys(data).length === 0) return session;
  return prisma.classroomSession.update({ where: { bookingId }, data });
}

export async function recordLeave(bookingId: string, role: "TEACHER" | "STUDENT") {
  const field = role === "TEACHER" ? "teacherLeftAt" : "studentLeftAt";
  const session = await prisma.classroomSession.findUnique({ where: { bookingId } });
  if (!session) return null;

  const updated = await prisma.classroomSession.update({
    where: { bookingId },
    data: { [field]: new Date() },
  });

  // Once both sides have left at least once, the lesson is over — close it
  // out and let the booking itself reflect that a real, attended session
  // took place, not just whatever the payment/admin flow marked it as.
  if (updated.teacherJoinedAt && updated.studentJoinedAt && updated.teacherLeftAt && updated.studentLeftAt && updated.status !== "COMPLETED") {
    const completed = await prisma.classroomSession.update({
      where: { bookingId },
      data: { status: "COMPLETED", actualEnd: new Date() },
    });
    await prisma.booking.updateMany({
      where: { id: bookingId, status: { in: ["CONFIRMED", "PENDING"] } },
      data: { status: "COMPLETED" },
    });

    // A referral-bonus bug must never break the classroom-leave flow —
    // the lesson is already over and recorded either way.
    try {
      await maybeAwardReferralBonus(bookingId);
    } catch (error) {
      console.error("Referral bonus award failed", error);
    }

    return completed;
  }

  return updated;
}
