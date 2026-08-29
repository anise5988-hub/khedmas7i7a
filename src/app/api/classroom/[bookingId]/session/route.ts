import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { authorizeBookingParticipant } from "@/lib/server/classroom-auth";
import { getOrCreateClassroomSession, getJoinWindow, mintJoinToken } from "@/lib/server/classroom-session";
import { isDailyConfigured } from "@/lib/server/daily";

export async function GET(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const user = await getCurrentUser(request);
  const { bookingId } = await params;

  const participant = await authorizeBookingParticipant(bookingId, user);
  if (!participant || !user) {
    return NextResponse.json({ error: "Accès refusé à cette salle." }, { status: 403 });
  }

  const session = await getOrCreateClassroomSession(bookingId);
  if (!session) {
    return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });
  }

  const window = getJoinWindow(session);
  const canJoin = window.canJoinNow || participant.isAdmin;

  let joinToken: string | null = null;
  if (canJoin) {
    try {
      joinToken = await mintJoinToken(session, `${user.firstName} ${user.lastName}`.trim(), participant.isTeacher || participant.isAdmin);
    } catch (error) {
      console.error("Daily meeting token creation failed", error);
    }
  }

  return NextResponse.json({
    roomName: session.roomName,
    roomUrl: session.roomUrl,
    provider: session.provider,
    status: session.status,
    scheduledStart: session.scheduledStart,
    scheduledEnd: session.scheduledEnd,
    canJoin,
    opensAt: window.opensAt,
    closesAt: window.closesAt,
    isTooEarly: window.isTooEarly,
    isTooLate: window.isTooLate,
    recordingStatus: session.recordingStatus,
    recordingUrl: canJoin || participant.isAdmin ? session.recordingUrl : null,
    videoConfigured: isDailyConfigured(),
    joinToken,
  });
}
