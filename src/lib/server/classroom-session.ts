import crypto from "crypto";
import { prisma } from "@/lib/server/prisma";

const JOIN_WINDOW_BEFORE_MINUTES = 10;
const JOIN_WINDOW_AFTER_MINUTES = 60; // grace period for lessons running over

function generateRoomName(bookingId: string): string {
  // The booking id alone isn't secret (visible in dashboard URLs), so the
  // actual Jitsi room name mixes in a random suffix — knowing a booking id
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

  try {
    return await prisma.classroomSession.create({
      data: {
        bookingId,
        roomName: generateRoomName(bookingId),
        scheduledStart: booking.startsAt,
        scheduledEnd,
      },
    });
  } catch {
    // Two simultaneous first-joins raced to create it — fetch the winner.
    return prisma.classroomSession.findUnique({ where: { bookingId } });
  }
}

export function getJoinWindow(session: { scheduledStart: Date; scheduledEnd: Date }) {
  const opensAt = new Date(session.scheduledStart.getTime() - JOIN_WINDOW_BEFORE_MINUTES * 60_000);
  const closesAt = new Date(session.scheduledEnd.getTime() + JOIN_WINDOW_AFTER_MINUTES * 60_000);
  const now = new Date();
  return {
    opensAt,
    closesAt,
    canJoinNow: now >= opensAt && now <= closesAt,
    isTooEarly: now < opensAt,
    isTooLate: now > closesAt,
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
    return completed;
  }

  return updated;
}
