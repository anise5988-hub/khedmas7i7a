import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getBookingAccess } from "@/lib/server/classroom-access";
import { recordJoin, setParticipantAdmission, logEvent } from "@/lib/server/classroom-session";
import { prisma } from "@/lib/server/prisma";

/**
 * POST /api/classroom/[bookingId]/session/join
 * body: { isReconnect?: boolean }
 *
 * Called after the Daily "joined-meeting" event. Enforces, server-side:
 *  - the caller belongs to the booking,
 *  - the payment gate has passed,
 *  - the host's lock / waiting-room admission state allows entering.
 */
export async function POST(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const user = await getCurrentUser(request);
  const { bookingId } = await params;

  const access = await getBookingAccess(bookingId, user);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!access.party.isStudent && !access.party.isTeacher) {
    // An admin observing doesn't count as lesson attendance.
    return NextResponse.json({ success: true, tracked: false });
  }

  const session = await prisma.classroomSession.findUnique({ where: { bookingId } });
  if (!session) return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });

  const participant = await prisma.classroomParticipant.findUnique({
    where: { sessionId_userId: { sessionId: session.id, userId: access.party.userId } },
  });

  const role = access.party.isTeacher ? "TEACHER" : "STUDENT";
  if (participant?.admission === "REMOVED") {
    return NextResponse.json({ error: "Vous avez été retiré de cette classe." }, { status: 403 });
  }
  if (session.locked && role === "STUDENT") {
    return NextResponse.json({ error: "La classe est verrouillée. Attendez que l'enseignant l'ouvre." }, { status: 423 });
  }
  if (session.waitingRoomEnabled && role === "STUDENT" && participant?.admission !== "ADMITTED") {
    return NextResponse.json({ admission: "PENDING", message: "En attente que votre enseignant vous autorise à entrer." });
  }

  const body = await request.json().catch(() => null);
  const isReconnect = Boolean(body?.isReconnect);

  const updated = await recordJoin(bookingId, role, access.party.userId, access.party.userName, isReconnect);
  return NextResponse.json({ success: true, tracked: true, session: updated, admission: "ADMITTED" });
}

/**
 * PATCH /api/classroom/[bookingId]/session/join — host admission control.
 * body: { userId: string; action: "ADMIT" | "REMOVE" | "ADMIT_ALL" }
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const user = await getCurrentUser(request);
  const { bookingId } = await params;

  const access = await getBookingAccess(bookingId, user);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!access.party.isHost) return NextResponse.json({ error: "Réservé à l'enseignant." }, { status: 403 });

  const session = await prisma.classroomSession.findUnique({ where: { bookingId } });
  if (!session) return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const action = body?.action as string | undefined;
  const targetUserId = body?.userId as string | undefined;

  if (action === "ADMIT_ALL") {
    await prisma.classroomParticipant.updateMany({
      where: { sessionId: session.id, admission: "PENDING" },
      data: { admission: "ADMITTED" },
    });
    await logEvent(session.id, access.party.userId, access.party.userName, "ADMIT_ALL", "Tous les participants en attente ont été admis");
    return NextResponse.json({ success: true });
  }

  if (!targetUserId || (action !== "ADMIT" && action !== "REMOVE")) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  await setParticipantAdmission(session.id, targetUserId, action === "ADMIT" ? "ADMITTED" : "REMOVED");
  if (action === "REMOVE") {
    // Kicking someone must also close their attendance row so the ledger
    // reflects that they no longer count as present.
    const openRow = await prisma.classroomAttendance.findFirst({
      where: { sessionId: session.id, userId: targetUserId, leftAt: null },
      orderBy: { joinedAt: "desc" },
    });
    if (openRow) {
      const durationSeconds = Math.max(0, Math.floor((Date.now() - openRow.joinedAt.getTime()) / 1000));
      await prisma.classroomAttendance.update({
        where: { id: openRow.id },
        data: { leftAt: new Date(), durationSeconds, leaveReason: "REMOVED" },
      });
    }
  }

  const target = await prisma.classroomParticipant.findFirst({
    where: { sessionId: session.id, userId: targetUserId },
    select: { displayName: true },
  });
  await logEvent(
    session.id,
    access.party.userId,
    access.party.userName,
    action === "ADMIT" ? "PARTICIPANT_ADMITTED" : "PARTICIPANT_REMOVED",
    target ? `${target.displayName} a été ${action === "ADMIT" ? "admis" : "retiré"} par ${access.party.userName}` : action,
  );
  return NextResponse.json({ success: true });
}
