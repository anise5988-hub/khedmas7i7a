import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import {
  promoteRecordingIfReady,
  endSessionForAll,
} from "@/lib/server/classroom-session";
import { logAdminAction } from "@/lib/server/audit-log";
import { stopDailyRecording } from "@/lib/server/daily";

/**
 * POST /api/admin/classrooms/[bookingId]/finalize - admin only.
 *
 * Reconciliation for a session whose host never clicked "Terminer" or never
 * stopped the recording (tab closed, crash, etc.). Idempotent:
 *  1. ends the session for everyone (closes attendance, flips booking +
 *     session to COMPLETED, auto-stops a still-running Daily recording)
 *  2. polls Daily until the recording is finished and promotes it to
 *     AVAILABLE with a fresh access link so it is saved/playable.
 * A second call is a no-op that just refreshes the recording link.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acces administrateur requis." }, { status: 403 });
  }

  const { bookingId } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { classroomSession: true },
  });
  if (!booking) return NextResponse.json({ error: "Seance introuvable." }, { status: 404 });

  try {
    // 1. End the session if not already ended (idempotent).
    const ended = booking.classroomSession?.endedAt
      ? booking.classroomSession
      : await endSessionForAll(bookingId, user.id, `${user.firstName} ${user.lastName} (admin)`);
    if (!ended) return NextResponse.json({ error: "Session de classe introuvable." }, { status: 404 });

    // 2. Belt & braces: if a Daily recording is still running, stop it now.
    if (ended.recordingStatus === "RECORDING" && ended.roomName) {
      try {
        await stopDailyRecording(ended.roomName);
        await prisma.classroomSession.update({
          where: { bookingId },
          data: { recordingStatus: "PROCESSING" },
        });
      } catch (error) {
        console.error("Admin recording stop failed", error);
      }
    }

    // 3. Give Daily a moment to finish encoding, then promote.
    let final = await prisma.classroomSession.findUnique({ where: { bookingId } });
    if (final && final.recordingStatus !== "AVAILABLE") {
      const deadline = Date.now() + 90_000;
      while (Date.now() < deadline) {
        final = await prisma.classroomSession.findUnique({ where: { bookingId } });
        const promoted = await promoteRecordingIfReady({
          bookingId,
          recordingStatus: final!.recordingStatus,
          recordingId: final!.recordingId,
          roomName: final!.roomName,
          actualEnd: final!.actualEnd,
        });
        if (promoted?.recordingStatus === "AVAILABLE") break;
        await new Promise((resolve) => setTimeout(resolve, 10_000));
      }
      final = await prisma.classroomSession.findUnique({ where: { bookingId } });
    }

    await logAdminAction({
      actor: user,
      action: "CLASSROOM_FINALIZED",
      targetType: "Booking",
      targetId: bookingId,
      metadata: { recordingStatus: final?.recordingStatus },
    });

    return NextResponse.json({
      success: true,
      bookingStatus: "COMPLETED",
      sessionStatus: final?.status,
      recordingStatus: final?.recordingStatus,
      recordingUrl: final?.recordingUrl ?? null,
    });
  } catch (error) {
    console.error("Admin finalize failed", error);
    return NextResponse.json({ error: "Impossible de finaliser la seance." }, { status: 500 });
  }
}
