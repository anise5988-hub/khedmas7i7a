import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getBookingAccess } from "@/lib/server/classroom-access";
import { recordLeave } from "@/lib/server/classroom-session";

export async function POST(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const user = await getCurrentUser(request);
  const { bookingId } = await params;

  const access = await getBookingAccess(bookingId, user);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!access.party.isStudent && !access.party.isTeacher) {
    return NextResponse.json({ success: true, tracked: false });
  }

  const body = await request.json().catch(() => null);
  const reason = body?.reason === "DISCONNECTED" || body?.reason === "ENDED" || body?.reason === "REMOVED" ? body.reason : "LEFT";
  const role = access.party.isTeacher ? "TEACHER" : "STUDENT";

  const session = await recordLeave(bookingId, role, access.party.userId, access.party.userName, reason);
  return NextResponse.json({ success: true, tracked: true, session });
}
