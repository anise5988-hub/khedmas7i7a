import crypto from "crypto";
import { prisma } from "@/lib/server/prisma";
import { createDailyRoom, createDailyMeetingToken, isDailyConfigured } from "@/lib/server/daily";
import { maybeAwardReferralBonus } from "@/lib/server/referral";

const ROOM_EXPIRY_AFTER_MINUTES = 90; // buffer past the scheduled end
const ROOM_EXPIRY_BEFORE_MINUTES = 60; // how early the room may open

function generateRoomName(bookingId: string): string {
  // The booking id alone isn't secret (visible in dashboard URLs), so the
  // actual room name mixes in a random suffix — knowing a booking id
  // doesn't get you into its room.
  const suffix = crypto.randomBytes(8).toString("hex");
  return `profyspace-${bookingId}-${suffix}`;
}

export async function getOrCreateClassroomSession(bookingId: string, startsAt?: Date, durationMinutes?: number) {
  const existing = await prisma.classroomSession.findUnique({ where: { bookingId } });
  if (existing) return existing;

  if (!startsAt || !durationMinutes) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { startsAt: true, durationMinutes: true },
    });
    if (!booking) return null;
    startsAt = booking.startsAt;
    durationMinutes = booking.durationMinutes;
  }

  const scheduledEnd = new Date(startsAt!.getTime() + durationMinutes! * 60_000);
  const roomName = generateRoomName(bookingId);

  let roomUrl: string | null = null;
  if (isDailyConfigured()) {
    const expiresAt = new Date(scheduledEnd!.getTime() + ROOM_EXPIRY_AFTER_MINUTES * 60_000);
    const room = await createDailyRoom(roomName, expiresAt);
    roomUrl = room.url;
  }

  try {
    return await prisma.classroomSession.create({
      data: {
        bookingId,
        roomName,
        roomUrl,
        scheduledStart: startsAt!,
        scheduledEnd,
      },
    });
  } catch {
    // Two simultaneous first-joins raced to create it — fetch the winner.
    return prisma.classroomSession.findUnique({ where: { bookingId } });
  }
}

export async function mintJoinToken(
  session: { roomName: string; roomUrl: string | null },
  userName: string,
  isOwner: boolean,
  userId?: string,
) {
  if (!session.roomUrl) return null;
  return createDailyMeetingToken(session.roomName, userName, isOwner, userId);
}

export function getJoinWindow(session: { scheduledStart: Date; scheduledEnd: Date }) {
  const now = Date.now();
  const opensAt = new Date(session.scheduledStart.getTime() - ROOM_EXPIRY_BEFORE_MINUTES * 60_000);
  const closesAt = new Date(session.scheduledEnd.getTime() + ROOM_EXPIRY_AFTER_MINUTES * 60_000);
  const isTooEarly = now < opensAt.getTime();
  const isTooLate = now > closesAt.getTime();
  return {
    opensAt,
    closesAt,
    canJoinNow: !isTooEarly && !isTooLate,
    isTooEarly,
    isTooLate,
  };
}

// ── Attendance ledger ────────────────────────────────────────────────────────────

/**
 * Records a join and opens an attendance row. Called from the join route
 * AFTER authorization and the payment gate — never trusts a client-sent role.
 * `isReconnect` marks an already-present participant rejoining the same
 * session (from another tab / after a network blip), so the ledger closes the
 * previous row and increments reconnectCount instead of double-counting.
 */
export async function recordJoin(
  bookingId: string,
  role: "TEACHER" | "STUDENT" | "ADMIN",
  userId: string,
  displayName: string,
  isReconnect = false,
) {
  const session = await prisma.classroomSession.findUnique({ where: { bookingId } });
  if (!session) return null;

  const participant = await prisma.classroomParticipant.upsert({
    where: { sessionId_userId: { sessionId: session.id, userId } },
    create: {
      sessionId: session.id,
      userId,
      role,
      displayName,
      // Rooms are always open — every participant is admitted directly.
      admission: "ADMITTED",
      firstJoinedAt: new Date(),
    },
    update: {
      displayName,
      lastSeenAt: new Date(),
      leftAt: null,
      removedAt: null,
      removedById: null,
    },
  });

  const data: Record<string, unknown> = {};
  const field = role === "TEACHER" ? "teacherJoinedAt" : role === "STUDENT" ? "studentJoinedAt" : null;
  if (field && !session[field]) data[field] = new Date();
  if (session.status === "SCHEDULED") {
    data.status = "IN_PROGRESS";
    data.phase = "LIVE";
    data.actualStart = session.actualStart || new Date();
  } else if (session.phase === "SCHEDULED" || session.phase === "WAITING" || session.phase === "STARTING") {
    data.phase = "LIVE";
  }

  if (Object.keys(data).length > 0) {
    await prisma.classroomSession.update({ where: { bookingId }, data });
  }

  if (isReconnect) {
    await prisma.classroomAttendance.updateMany({
      where: { sessionId: session.id, userId, leftAt: null },
      data: { reconnectCount: { increment: 1 }, leftAt: new Date(), leaveReason: "DISCONNECTED" },
    });
  }

  const openRow = await prisma.classroomAttendance.findFirst({
    where: { sessionId: session.id, userId, leftAt: null },
    orderBy: { joinedAt: "desc" },
  });
  if (!openRow) {
    await prisma.classroomAttendance.create({
      data: {
        sessionId: session.id,
        participantId: participant.id,
        userId,
        role,
        displayName,
      },
    });
  }

  await prisma.classroomParticipant.update({ where: { id: participant.id }, data: { lastSeenAt: new Date() } });
  await logEvent(session.id, userId, displayName, "PARTICIPANT_JOINED", `${displayName} a rejoint la classe`, { role, isReconnect });

  return prisma.classroomSession.findUnique({ where: { bookingId } });
}

/**
 * Closes the open attendance row and updates the session. When BOTH sides
 * have joined and left at least once, the lesson is marked COMPLETED — this
 * is what closes the booking, credits the referral bonus and flips the
 * dashboards, so it must never depend on client state.
 */
export async function recordLeave(
  bookingId: string,
  role: "TEACHER" | "STUDENT" | "ADMIN",
  userId: string,
  displayName: string,
  reason: "LEFT" | "ENDED" | "REMOVED" | "DISCONNECTED" = "LEFT",
) {
  const session = await prisma.classroomSession.findUnique({ where: { bookingId } });
  if (!session) return null;

  const field = role === "TEACHER" ? "teacherLeftAt" : role === "STUDENT" ? "studentLeftAt" : null;

  const openRow = await prisma.classroomAttendance.findFirst({
    where: { sessionId: session.id, userId, leftAt: null },
    orderBy: { joinedAt: "desc" },
  });
  if (openRow) {
    const durationSeconds = Math.max(0, Math.floor((Date.now() - openRow.joinedAt.getTime()) / 1000));
    await prisma.classroomAttendance.update({
      where: { id: openRow.id },
      data: { leftAt: new Date(), durationSeconds, leaveReason: reason },
    });
  }

  await prisma.classroomParticipant.updateMany({
    where: { sessionId: session.id, userId, leftAt: null },
    data: { leftAt: new Date() },
  });

  await logEvent(session.id, userId, displayName, "PARTICIPANT_LEFT", `${displayName} a quitté la classe`, { role, reason });

  if (role === "ADMIN") {
    // An admin observer leaving never touches lesson state.
    return session;
  }

  const data: Record<string, unknown> = {};
  if (field) data[field] = new Date();
  if (Object.keys(data).length === 0) return session;
  const updated = await prisma.classroomSession.update({ where: { bookingId }, data });

  if (
    updated.teacherJoinedAt &&
    updated.studentJoinedAt &&
    updated.teacherLeftAt &&
    updated.studentLeftAt &&
    updated.status !== "COMPLETED"
  ) {
    const completed = await prisma.classroomSession.update({
      where: { bookingId },
      data: { status: "COMPLETED", phase: "COMPLETED", actualEnd: new Date() },
    });
    await prisma.booking.updateMany({
      where: { id: bookingId, status: { in: ["CONFIRMED", "PENDING"] } },
      data: { status: "COMPLETED" },
    });
    try {
      await maybeAwardReferralBonus(bookingId);
    } catch (error) {
      console.error("Referral bonus award failed", error);
    }
    return completed;
  }

  return updated;
}

/**
 * Ends the lesson for everyone (host only). Idempotent: a second call is a
 * no-op, so a double-click can't break the completion logic or re-award a
 * referral bonus.
 */
export async function endSessionForAll(bookingId: string, endedById: string, endedByName: string) {
  const session = await prisma.classroomSession.findUnique({ where: { bookingId } });
  if (!session) return null;

  if (session.endedAt) return session; // already ended

  // Close every open attendance row.
  const openRows = await prisma.classroomAttendance.findMany({ where: { sessionId: session.id, leftAt: null } });
  const now = new Date();
  await Promise.all(
    openRows.map((row) =>
      prisma.classroomAttendance.update({
        where: { id: row.id },
        data: {
          leftAt: now,
          durationSeconds: Math.max(0, Math.floor((now.getTime() - row.joinedAt.getTime()) / 1000)),
          leaveReason: "ENDED",
        },
      }),
    ),
  );
  await prisma.classroomParticipant.updateMany({
    where: { sessionId: session.id, leftAt: null },
    data: { leftAt: now },
  });

  const updated = await prisma.classroomSession.update({
    where: { bookingId },
    data: { status: "COMPLETED", phase: "COMPLETED", actualEnd: now, endedById, endedAt: now },
  });
  await prisma.booking.updateMany({
    where: { id: bookingId, status: { in: ["CONFIRMED", "PENDING"] } },
    data: { status: "COMPLETED" },
  });
  await logEvent(session.id, endedById, endedByName, "SESSION_ENDED", `Le cours a été terminé par ${endedByName}`);

  try {
    await maybeAwardReferralBonus(bookingId);
  } catch (error) {
    console.error("Referral bonus award failed", error);
  }
  return updated;
}

export async function logEvent(
  sessionId: string,
  actorId: string | null,
  actorName: string | null,
  type: string,
  message: string,
  metadata?: Record<string, unknown>,
) {
  try {
    await prisma.classroomEvent.create({
      data: { sessionId, actorId, actorName, type, message, metadata: metadata as never },
    });
  } catch (error) {
    // Event log failures must never break the classroom action itself.
    console.error("classroom event log failed", error);
  }
}

// ── Host permission / presence mutations (all called by authorized routes) ──

export async function setParticipantAdmission(sessionId: string, userId: string, admission: "ADMITTED" | "REMOVED") {
  return prisma.classroomParticipant.updateMany({
    where: { sessionId, userId },
    data: { admission, removedAt: admission === "REMOVED" ? new Date() : null },
  });
}

export async function setParticipantFlags(
  sessionId: string,
  userId: string,
  flags: { micBlocked?: boolean; cameraBlocked?: boolean; reactionsBlocked?: boolean; handRaisedAt?: Date | null },
) {
  return prisma.classroomParticipant.updateMany({ where: { sessionId, userId }, data: flags });
}

export async function setSessionControls(
  bookingId: string,
  controls: Partial<{
    locked: boolean;
    waitingRoomEnabled: boolean;
    studentScreenShareAllowed: boolean;
    studentCameraAllowed: boolean;
    studentMicAllowed: boolean;
    studentWhiteboardAllowed: boolean;
    studentChatEnabled: boolean;
    studentReactionsEnabled: boolean;
    lessonSummary: string;
  }>,
) {
  return prisma.classroomSession.update({ where: { bookingId }, data: controls });
}

export async function setRecordingStatus(
  bookingId: string,
  status: "NOT_AVAILABLE" | "RECORDING" | "PROCESSING" | "AVAILABLE" | "FAILED",
  url?: string | null,
) {
  const data: Record<string, unknown> = { recordingStatus: status };
  if (url !== undefined) data.recordingUrl = url;
  return prisma.classroomSession.update({ where: { bookingId }, data });
}
