import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getBookingAccess } from "@/lib/server/classroom-access";
import { setParticipantFlags, logEvent, endSessionForAll } from "@/lib/server/classroom-session";
import { prisma } from "@/lib/server/prisma";

/**
 * Host-only per-participant controls: mute a participant, block/unblock their
 * camera, block reactions, lower their hand, or remove them entirely.
 *
 * Every branch verifies `isHost` against the booking relation before doing
 * anything — a student hitting these endpoints with a forged body gets 403,
 * never an applied change.
 */
export async function POST(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const user = await getCurrentUser(request);
  const { bookingId } = await params;

  const access = await getBookingAccess(bookingId, user);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!access.party.isHost) {
    return NextResponse.json({ error: "Réservé à l'enseignant." }, { status: 403 });
  }

  const session = await prisma.classroomSession.findUnique({ where: { bookingId } });
  if (!session) return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const action = typeof body?.action === "string" ? body.action : null;

  if (action === "END_FOR_ALL") {
    const ended = await endSessionForAll(bookingId, access.party.userId, access.party.userName);
    return NextResponse.json({ success: true, session: ended });
  }

  const targetUserId = typeof body?.userId === "string" ? body.userId : null;
  if (!targetUserId) return NextResponse.json({ error: "userId manquant." }, { status: 400 });

  // A host cannot apply controls to themselves — these are for the other side.
  if (targetUserId === access.party.userId) {
    return NextResponse.json({ error: "Action impossible sur votre propre compte." }, { status: 400 });
  }

  const target = await prisma.classroomParticipant.findUnique({
    where: { sessionId_userId: { sessionId: session.id, userId: targetUserId } },
  });
  if (!target) return NextResponse.json({ error: "Participant introuvable." }, { status: 404 });

  let message = "";
  let flags: Record<string, unknown> = {};

  switch (action) {
    case "MUTE":
      flags = { micBlocked: true };
      message = `${target.displayName} a été coupé par l'enseignant`;
      break;
    case "UNMUTE":
      flags = { micBlocked: false };
      message = `${target.displayName} peut de nouveau parler`;
      break;
    case "BLOCK_CAMERA":
      flags = { cameraBlocked: true };
      message = `Caméra de ${target.displayName} désactivée`;
      break;
    case "ALLOW_CAMERA":
      flags = { cameraBlocked: false };
      message = `Caméra de ${target.displayName} réautorisée`;
      break;
    case "BLOCK_REACTIONS":
      flags = { reactionsBlocked: true };
      message = `Réactions désactivées pour ${target.displayName}`;
      break;
    case "ALLOW_REACTIONS":
      flags = { reactionsBlocked: false };
      message = `Réactions réautorisées pour ${target.displayName}`;
      break;
    case "LOWER_HAND":
      flags = { handRaisedAt: null };
      message = `Main de ${target.displayName} baissée`;
      break;
    default:
      return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  }

  await setParticipantFlags(session.id, targetUserId, flags);
  await logEvent(session.id, access.party.userId, access.party.userName, `HOST_${action}`, message, {
    targetUserId,
  });

  return NextResponse.json({ success: true });
}

/**
 * GET — the host's live roster. Returns every participant with their current
 * flags so the participants panel can render accurate teacher controls even
 * after a page refresh (the flags live in the database, not in memory).
 */
export async function GET(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const user = await getCurrentUser(request);
  const { bookingId } = await params;

  const access = await getBookingAccess(bookingId, user);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const session = await prisma.classroomSession.findUnique({
    where: { bookingId },
    include: {
      participants: { orderBy: { createdAt: "asc" } },
      attendances: { orderBy: { joinedAt: "asc" } },
    },
  });
  if (!session) return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });

  const isHost = access.party.isHost;
  return NextResponse.json({
    participants: session.participants
      .filter((p) => p.admission !== "REMOVED" || isHost)
      .map((p) => ({
        userId: p.userId,
        displayName: p.displayName,
        role: p.role,
        admission: isHost ? p.admission : undefined, // students never see the queue
        micBlocked: p.micBlocked,
        cameraBlocked: p.cameraBlocked,
        reactionsBlocked: p.reactionsBlocked,
        handRaisedAt: p.handRaisedAt,
        leftAt: p.leftAt,
        firstJoinedAt: p.firstJoinedAt,
      })),
    attendances: isHost
      ? session.attendances.map((a) => ({
          userId: a.userId,
          displayName: a.displayName,
          role: a.role,
          joinedAt: a.joinedAt,
          leftAt: a.leftAt,
          durationSeconds: a.durationSeconds,
          reconnectCount: a.reconnectCount,
          leaveReason: a.leaveReason,
        }))
      : [],
    waitingQueue: isHost
      ? session.participants
          .filter((p) => p.admission === "PENDING")
          .map((p) => ({ userId: p.userId, displayName: p.displayName, role: p.role, createdAt: p.createdAt }))
      : [],
  });
}
