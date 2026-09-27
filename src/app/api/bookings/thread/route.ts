import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getBookingConversationId } from "@/lib/server/booking-communication";

export const runtime = "nodejs";

/**
 * POST /api/bookings/thread
 * body: { bookingId: string }
 *
 * Opens the private thread attached to a booking. The booking is looked up
 * server-side and the caller must be one of its two participants — the
 * client only ever names the booking, never the counterpart.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const bookingId = body && typeof body.bookingId === "string" ? body.bookingId.trim() : "";
  if (!bookingId) {
    return NextResponse.json({ error: "Identifiant de réservation requis." }, { status: 400 });
  }

  try {
    const { conversationId, side } = await getBookingConversationId(user.id, bookingId);
    if (!conversationId || !side) {
      return NextResponse.json(
        { error: "Réservation introuvable ou vous n'y avez pas accès." },
        { status: 404 },
      );
    }

    const link = side.isTeacher
      ? `/teacher/dashboard/messages?conversationId=${conversationId}&bookingId=${side.bookingId}`
      : `/dashboard/messages?conversationId=${conversationId}&bookingId=${side.bookingId}`;

    return NextResponse.json({
      success: true,
      conversationId,
      link,
      isTeacher: side.isTeacher,
      counterpartName: side.otherName,
      booking: {
        id: side.booking.id,
        startsAt: side.booking.startsAt,
        durationMinutes: side.booking.durationMinutes,
        status: side.booking.status,
        subject: side.booking.subject,
      },
    });
  } catch (error) {
    console.error("Booking thread resolution failed", error);
    return NextResponse.json({ error: "Impossible d'ouvrir la discussion de cette séance." }, { status: 500 });
  }
}