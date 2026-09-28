import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getBookingAccess } from "@/lib/server/classroom-access";
import { endSessionForAll } from "@/lib/server/classroom-session";
import { prisma } from "@/lib/server/prisma";

/**
 * POST /api/classroom/[bookingId]/session/end — host only.
 * Ends the lesson for everyone: closes every open attendance row, marks the
 * session and booking COMPLETED, and stamps who ended it. Idempotent — a
 * second call does nothing rather than corrupting the ledger.
 */
export async function POST(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const user = await getCurrentUser(request);
  const { bookingId } = await params;

  const access = await getBookingAccess(bookingId, user);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!access.party.isHost) {
    return NextResponse.json({ error: "Seul l'enseignant peut terminer la séance." }, { status: 403 });
  }

  const session = await endSessionForAll(bookingId, access.party.userId, access.party.userName);
  if (!session) return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });

  return NextResponse.json({ success: true, session });
}

/**
 * GET /api/classroom/[bookingId]/session/end — attendance summary.
 * Available to both participants (their own session) and admins. Returns the
 * attendance ledger and the event log so the UI can show join/leave times and
 * total duration without a separate admin endpoint.
 */
export async function GET(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const user = await getCurrentUser(request);
  const { bookingId } = await params;

  const access = await getBookingAccess(bookingId, user);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const session = await prisma.classroomSession.findUnique({
    where: { bookingId },
    include: {
      attendances: { orderBy: { joinedAt: "asc" } },
      events: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  });
  if (!session) return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });

  const totalSeconds = session.attendances.reduce((sum, row) => sum + (row.durationSeconds ?? 0), 0);

  return NextResponse.json({
    sessionId: session.id,
    status: session.status,
    phase: session.phase,
    scheduledStart: session.scheduledStart,
    scheduledEnd: session.scheduledEnd,
    actualStart: session.actualStart,
    actualEnd: session.actualEnd,
    endedAt: session.endedAt,
    endedById: session.endedById,
    lessonSummary: session.lessonSummary,
    recordingStatus: session.recordingStatus,
    recordingUrl: session.recordingUrl,
    attendances: session.attendances.map((a) => ({
      id: a.id,
      userId: a.userId,
      role: a.role,
      displayName: a.displayName,
      joinedAt: a.joinedAt,
      leftAt: a.leftAt,
      durationSeconds: a.durationSeconds,
      reconnectCount: a.reconnectCount,
      leaveReason: a.leaveReason,
    })),
    totalAttendanceSeconds: totalSeconds,
    events: access.party.isHost
      ? session.events.map((e) => ({ id: e.id, type: e.type, message: e.message, actorName: e.actorName, createdAt: e.createdAt }))
      : [],
  });
}
