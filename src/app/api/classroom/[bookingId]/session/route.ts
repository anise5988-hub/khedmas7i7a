import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getBookingAccess, computePhase } from "@/lib/server/classroom-access";
import { getOrCreateClassroomSession, getJoinWindow, mintJoinToken } from "@/lib/server/classroom-session";
import { isDailyConfigured, createDailyRoom } from "@/lib/server/daily";
import { prisma } from "@/lib/server/prisma";

export const runtime = "nodejs";

/**
 * GET /api/classroom/[bookingId]/session
 *
 * One call that answers everything the pre-join screen needs:
 *  - whether the caller may enter at all (booking membership + payment gate),
 *  - the reservation context (teacher, student, subject, time, payment),
 *  - the server-computed phase (SCHEDULED → STARTING → LIVE → ENDING_SOON),
 *  - the host's live switches (waiting room, lock, permissions, recording),
 *  - the waiting-room queue and the caller's own admission state,
 *  - a short-lived join token (only when all gates pass).
 *
 * No query parameter can change WHO this returns for — the caller's identity
 * comes from the signed session cookie, never from the URL.
 */
export async function GET(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const user = await getCurrentUser(request);
  const { bookingId } = await params;

  const access = await getBookingAccess(bookingId, user);
  if (!access.ok) {
    return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      teacher: {
        include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } }, subjects: true },
      },
    },
  });
  if (!booking) return NextResponse.json({ error: "Cette séance n'existe pas." }, { status: 404 });

  let session = await getOrCreateClassroomSession(bookingId, booking.startsAt, booking.durationMinutes);
  if (!session) return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });

  // The session's schedule is only ever set once, at first creation — if the
  // booking is later rescheduled (POST /api/bookings/[id]/reschedule), that
  // endpoint updates Booking.startsAt but has no reason to know a
  // ClassroomSession row already exists for it, so the session's cached
  // scheduledStart/scheduledEnd silently goes stale. That stale end time
  // then drives the room-expiry check just below with the wrong timestamp.
  // Re-derive from the booking (fetched fresh above) on every request so a
  // reschedule can never leave this permanently out of sync.
  const correctScheduledEnd = new Date(booking.startsAt.getTime() + booking.durationMinutes * 60_000);
  if (
    session.scheduledStart.getTime() !== booking.startsAt.getTime() ||
    session.scheduledEnd.getTime() !== correctScheduledEnd.getTime()
  ) {
    session = await prisma.classroomSession.update({
      where: { bookingId },
      data: { scheduledStart: booking.startsAt, scheduledEnd: correctScheduledEnd },
    });
  }

  // Rooms are always open. A Daily room carries its own `exp` timestamp set
  // to scheduledEnd + 90min — past that the provider rejects the join token
  // even though our authorization still allows it, which looked like "can't
  // join" with no visible reason. Recreate the room (and refresh the URL)
  // whenever its lifetime has passed so re-entry always works.
  const roomLifetimeMs = 90 * 60_000;
  const roomExpired = Date.now() > new Date(session.scheduledEnd).getTime() + roomLifetimeMs;
  let activeSession = session;
  if (roomExpired && isDailyConfigured()) {
    try {
      const fresh = await createDailyRoom(
        `profyspace-${bookingId}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
        new Date(Date.now() + 2 * 60 * 60_000),
      );
      activeSession = await prisma.classroomSession.update({
        where: { bookingId },
        data: { roomUrl: fresh.url },
      });
    } catch (error) {
      console.error("Daily room recreation failed", error);
    }
  }

  const window = getJoinWindow(activeSession);
  const phase = computePhase(session);
  const { party } = access;

  // Rooms are always open: lock and waiting-room gating were removed by
  // product decision, so every authorized participant is admitted directly.
  // The DB fields remain (default false) but are no longer enforced.
  const callerParticipant = await prisma.classroomParticipant.findUnique({
    where: { sessionId_userId: { sessionId: session.id, userId: user!.id } },
  });
  const needsAdmission = false;
  const removed = callerParticipant?.admission === "REMOVED";
  const lockedOut = false;
  const canJoin = window.canJoinNow || party.isHost;

  const waitingQueue = party.isHost
    ? await prisma.classroomParticipant.findMany({
        where: { sessionId: session.id, admission: "PENDING" },
        orderBy: { createdAt: "asc" },
      })
    : [];

  let joinToken: string | null = null;
  if (canJoin && !removed && !lockedOut) {
    try {
      joinToken = await mintJoinToken(
        session,
        party.userName,
        party.isHost,
        user!.id,
      );
    } catch (error) {
      console.error("Daily meeting token creation failed", error);
    }
  }

  // The other participant's presence — so the pre-join screen and the
  // participants panel can show who's already in without an extra request.
  const participants = await prisma.classroomParticipant.findMany({
    where: { sessionId: session.id, admission: { not: "REMOVED" } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    // Access verdict
    canJoin,
    removed,
    lockedOut,
    needsAdmission,
    videoConfigured: isDailyConfigured(),
    joinToken,
    // Reservation context
    bookingId: booking.id,
    bookingStatus: booking.status,
    paymentStatus: access.paymentStatus,
    teacherName: `${booking.teacher.user.firstName} ${booking.teacher.user.lastName}`,
    studentName: `${booking.student.firstName} ${booking.student.lastName}`,
    subject: booking.teacher.subjects[0]?.subject ?? "Cours particulier",
    startsAt: booking.startsAt,
    scheduledEnd: session.scheduledEnd,
    durationMinutes: booking.durationMinutes,
    // Session state
    phase,
    sessionStatus: session.status,
    scheduledStart: session.scheduledStart,
    actualStart: session.actualStart,
    actualEnd: session.actualEnd,
    endedAt: session.endedAt,
    // Host controls (the student's client renders them read-only)
    controls: {
      locked: session.locked,
      waitingRoomEnabled: session.waitingRoomEnabled,
      studentScreenShareAllowed: session.studentScreenShareAllowed,
      studentCameraAllowed: session.studentCameraAllowed,
      studentMicAllowed: session.studentMicAllowed,
      studentWhiteboardAllowed: session.studentWhiteboardAllowed,
      studentChatEnabled: session.studentChatEnabled,
      studentReactionsEnabled: session.studentReactionsEnabled,
      lessonSummary: session.lessonSummary,
    },
    recordingStatus: session.recordingStatus,
    recordingUrl: party.isHost || access.paymentStatus === "PAID" ? session.recordingUrl : null,
    // Room material
    roomName: session.roomName,
    roomUrl: session.roomUrl,
    opensAt: window.opensAt,
    closesAt: window.closesAt,
    isTooEarly: window.isTooEarly,
    isTooLate: window.isTooLate,
    // Presence
    participants: participants.map((p) => ({
      userId: p.userId,
      displayName: p.displayName,
      role: p.role,
      micBlocked: p.micBlocked,
      cameraBlocked: p.cameraBlocked,
      reactionsBlocked: p.reactionsBlocked,
      handRaisedAt: p.handRaisedAt,
      leftAt: p.leftAt,
    })),
    waitingQueue: waitingQueue.map((p) => ({
      userId: p.userId,
      displayName: p.displayName,
      role: p.role,
      createdAt: p.createdAt,
    })),
    myAdmission: callerParticipant?.admission ?? null,
    serverTime: new Date().toISOString(),
  });
}

/**
 * PATCH /api/classroom/[bookingId]/session — host-only switches.
 * The server verifies the caller is the booking's teacher (or an admin)
 * before applying anything; a student sending the same PATCH gets 403.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const user = await getCurrentUser(request);
  const { bookingId } = await params;

  const access = await getBookingAccess(bookingId, user);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!access.party.isHost) {
    return NextResponse.json({ error: "Seul l'enseignant peut modifier ces réglages." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const allowedKeys = [
    "locked",
    "waitingRoomEnabled",
    "studentScreenShareAllowed",
    "studentCameraAllowed",
    "studentMicAllowed",
    "studentWhiteboardAllowed",
    "studentChatEnabled",
    "studentReactionsEnabled",
    "lessonSummary",
  ] as const;

  const controls: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    if (key in body) {
      if (key === "lessonSummary") {
        if (typeof body[key] !== "string") continue;
        controls[key] = body[key].slice(0, 8000);
      } else if (typeof body[key] === "boolean") {
        controls[key] = body[key];
      }
    }
  }
  if (Object.keys(controls).length === 0) {
    return NextResponse.json({ error: "Aucun réglage valide fourni." }, { status: 400 });
  }

  const updated = await prisma.classroomSession.update({ where: { bookingId }, data: controls });
  return NextResponse.json({ controls: updated });
}
