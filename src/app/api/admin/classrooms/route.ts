import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { promoteRecordingIfReady } from "@/lib/server/classroom-session";

/**
 * GET /api/admin/classrooms — session metadata for the admin console.
 *
 * Returns operational metadata only: who, what, when, attendance totals and
 * technical status. It never returns chat messages, whiteboard content or
 * lesson summaries — the private content of a lesson stays between the
 * teacher and the student (mirrors the principle used by the platform's
 * audit log: admins see the fact of an action, not its content).
 */
export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
  const status = searchParams.get("status");

  const sessions = await prisma.classroomSession.findMany({
    where: status && status !== "ALL" ? { status: status as never } : undefined,
    include: {
      booking: {
        include: {
          student: { select: { firstName: true, lastName: true, email: true } },
          teacher: {
            include: { user: { select: { firstName: true, lastName: true, email: true } }, subjects: true },
          },
          payment: { select: { status: true } },
        },
      },
      attendances: { select: { userId: true, role: true, joinedAt: true, leftAt: true, durationSeconds: true, reconnectCount: true, leaveReason: true } },
    },
    orderBy: { scheduledStart: "desc" },
    take: limit,
  });

  // Same promotion pass as the student/teacher booking lists: a recording
  // that finished encoding, or an AVAILABLE one whose signed URL expired,
  // gets refreshed here so the admin console's play button actually works
  // without someone having to reopen the classroom first.
  const promotions = new Map<string, { recordingStatus: string; recordingUrl: string | null }>();
  await Promise.all(
    sessions.map(async (s) => {
      const promoted = await promoteRecordingIfReady({
        bookingId: s.bookingId,
        recordingStatus: s.recordingStatus,
        recordingId: s.recordingId,
        roomName: s.roomName,
        actualEnd: s.actualEnd,
      });
      if (promoted) promotions.set(s.bookingId, promoted);
    }),
  );

  return NextResponse.json({
    sessions: sessions.map((s) => {
      const total = s.attendances.reduce((sum, a) => sum + (a.durationSeconds ?? 0), 0);
      const promoted = promotions.get(s.bookingId);
      return {
        sessionId: s.id,
        bookingId: s.bookingId,
        provider: s.provider,
        roomName: s.roomName,
        status: s.status,
        phase: s.phase,
        scheduledStart: s.scheduledStart,
        scheduledEnd: s.scheduledEnd,
        actualStart: s.actualStart,
        actualEnd: s.actualEnd,
        endedAt: s.endedAt,
        studentName: `${s.booking.student.firstName} ${s.booking.student.lastName}`,
        studentEmail: s.booking.student.email,
        teacherName: `${s.booking.teacher.user.firstName} ${s.booking.teacher.user.lastName}`,
        teacherEmail: s.booking.teacher.user.email,
        subject: s.booking.teacher.subjects[0]?.subject ?? "Cours particulier",
        paymentStatus: s.booking.payment?.status ?? s.booking.status,
        bookingStatus: s.booking.status,
        recordingStatus: promoted?.recordingStatus ?? s.recordingStatus,
        recordingUrl: promoted?.recordingUrl ?? s.recordingUrl,
        locked: s.locked,
        waitingRoomEnabled: s.waitingRoomEnabled,
        // Attendance aggregates — useful for quality tracking, still no lesson content.
        teacherAttendance: s.attendances.filter((a) => a.role === "TEACHER").map((a) => ({ joinedAt: a.joinedAt, leftAt: a.leftAt, durationSeconds: a.durationSeconds, reconnectCount: a.reconnectCount, leaveReason: a.leaveReason })),
        studentAttendance: s.attendances.filter((a) => a.role === "STUDENT").map((a) => ({ joinedAt: a.joinedAt, leftAt: a.leftAt, durationSeconds: a.durationSeconds, reconnectCount: a.reconnectCount, leaveReason: a.leaveReason })),
        totalAttendanceSeconds: total,
      };
    }),
  });
}
