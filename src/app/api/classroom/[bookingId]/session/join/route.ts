import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { authorizeBookingParticipant } from "@/lib/server/classroom-auth";
import { recordJoin } from "@/lib/server/classroom-session";

export async function POST(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const user = await getCurrentUser(request);
  const { bookingId } = await params;

  const participant = await authorizeBookingParticipant(bookingId, user);
  if (!participant) {
    return NextResponse.json({ error: "Accès refusé à cette salle." }, { status: 403 });
  }
  if (!participant.isStudent && !participant.isTeacher) {
    // An admin observing doesn't count as lesson attendance.
    return NextResponse.json({ success: true, tracked: false });
  }

  const session = await recordJoin(bookingId, participant.isTeacher ? "TEACHER" : "STUDENT");
  return NextResponse.json({ success: true, tracked: true, session });
}
