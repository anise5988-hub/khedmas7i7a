import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getBookingAccess } from "@/lib/server/classroom-access";
import { setRecordingStatus, logEvent, promoteRecordingIfReady } from "@/lib/server/classroom-session";
import { prisma } from "@/lib/server/prisma";
import { isDailyConfigured } from "@/lib/server/daily";

/**
 * Cloud recording via Daily.
 *
 * Daily records on the server side; the recording asset becomes downloadable
 * after the meeting ends. This route starts/stops the cloud recording and
 * tracks the state in ClassroomSession so the replays page and the admin
 * console can show an honest status — the button only appears when
 * DAILY_API_KEY is configured (otherwise the UI clearly says recording is
 * unavailable rather than showing a dead control).
 *
 * Host only. Both endpoints are idempotent enough to survive a double-click
 * (starting twice just re-starts; stopping when not recording is a no-op).
 */
export async function POST(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const user = await getCurrentUser(request);
  const { bookingId } = await params;

  const access = await getBookingAccess(bookingId, user);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!access.party.isHost) {
    return NextResponse.json({ error: "Seul l'enseignant peut démarrer l'enregistrement." }, { status: 403 });
  }
  if (!isDailyConfigured()) {
    return NextResponse.json(
      { error: "L'enregistrement n'est pas disponible : le service vidéo n'est pas configuré.", code: "RECORDING_UNAVAILABLE" },
      { status: 503 },
    );
  }

  const session = await prisma.classroomSession.findUnique({ where: { bookingId } });
  if (!session) return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });
  if (!session.roomUrl) {
    return NextResponse.json({ error: "Cette salle n'a pas de service vidéo actif." }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action === "STOP" ? "STOP" : "START";

  try {
    if (action === "START") {
      const { startDailyRecording } = await import("@/lib/server/daily");
      const result = await startDailyRecording(session.roomName);
      await setRecordingStatus(bookingId, "RECORDING");
      await logEvent(session.id, access.party.userId, access.party.userName, "RECORDING_STARTED", "Enregistrement démarré");
      return NextResponse.json({ success: true, recordingStatus: "RECORDING", meetingId: result.meetingId });
    }

    const { stopDailyRecording } = await import("@/lib/server/daily");
    await stopDailyRecording(session.roomName);
    await setRecordingStatus(bookingId, "PROCESSING");
    await logEvent(session.id, access.party.userId, access.party.userName, "RECORDING_STOPPED", "Enregistrement arrêté");
    return NextResponse.json({ success: true, recordingStatus: "PROCESSING" });
  } catch (error) {
    console.error("Daily recording toggle failed", error);
    await setRecordingStatus(bookingId, "FAILED");
    return NextResponse.json({ error: "L'enregistrement a échoué. Vérifiez la configuration Daily." }, { status: 502 });
  }
}

/**
 * GET — recording status and, once available, the download URL. Students see
 * it only when the platform marks the asset available (payment gate already
 * enforced by getBookingAccess).
 */
export async function GET(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const user = await getCurrentUser(request);
  const { bookingId } = await params;

  const access = await getBookingAccess(bookingId, user);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const session = await prisma.classroomSession.findUnique({ where: { bookingId } });
  if (!session) return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });

  // If a recording is in PROCESSING after the lesson ended, poll Daily once
  // for the finished asset and promote it to AVAILABLE.
  const promoted = await promoteRecordingIfReady(session);
  if (promoted) return NextResponse.json(promoted);

  return NextResponse.json({
    recordingStatus: session.recordingStatus,
    recordingUrl: session.recordingUrl,
    configured: isDailyConfigured(),
  });
}
