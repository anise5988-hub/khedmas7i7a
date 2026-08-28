import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { authorizeBookingParticipant } from "@/lib/server/classroom-auth";

// STUN alone only tells two peers what their own public address is — it
// can't relay media, so any call where both sides are behind a symmetric
// NAT or a restrictive firewall (common on mobile carrier networks and
// some corporate/school networks) simply fails to connect. A TURN server
// relays the media instead. Configuring one requires an actual account
// with a TURN provider (or a self-hosted coturn) — there is nothing to
// wire up here in code alone, so this reads static credentials from env
// vars if present and just omits TURN entirely otherwise (STUN-only,
// today's behavior, keeps working for anyone not behind a hard NAT).
function buildTurnServers(): RTCIceServer[] {
  const urls = (process.env.TURN_URLS || "")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);
  const username = process.env.TURN_USERNAME;
  const credential = process.env.TURN_CREDENTIAL;

  if (urls.length === 0 || !username || !credential) return [];
  return [{ urls, username, credential }];
}

export async function GET(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const user = await getCurrentUser(request);
  const { bookingId } = await params;

  const participant = await authorizeBookingParticipant(bookingId, user);
  if (!participant) {
    return NextResponse.json({ error: "Accès refusé à cette salle." }, { status: 403 });
  }

  const iceServers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    ...buildTurnServers(),
  ];

  return NextResponse.json({ iceServers });
}
