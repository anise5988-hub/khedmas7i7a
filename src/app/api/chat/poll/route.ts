import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getChatPollPayload } from "@/lib/server/chat-repository";
import { presenceStore } from "@/lib/server/chat-store";
import { getBookingConversationId } from "@/lib/server/booking-communication";

export const runtime = "nodejs";

/**
 * GET /api/chat/poll?active=<conversationId>&since=<ISO>
 *
 * Sondage unique et économe pour la messagerie : une seule requête renvoie la
 * liste des conversations et l'historique de celle qui est ouverte. Si rien
 * n'a bougé depuis `since`, le serveur évite même de lire l'historique.
 *
 * `bookingId` permet d'ouvrir le fil d'une séance (vérifié côté serveur).
 */
export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  presenceStore.touchUser(user.id);

  const { searchParams } = new URL(request.url);
  const activeParam = searchParams.get("active");
  const sinceParam = searchParams.get("since");
  const bookingId = searchParams.get("bookingId");

  // Un bookingId n'est honoré que si l'appelant est bien l'un des deux
  // participants — la réservation est résolue ici, jamais transmise par le client.
  let activeConversationId = activeParam;
  let booking = null;
  if (bookingId) {
    const resolved = await getBookingConversationId(user.id, bookingId);
    if (!resolved.conversationId) {
      return NextResponse.json({ error: "Réservation introuvable ou non autorisée." }, { status: 404 });
    }
    activeConversationId = resolved.conversationId;
    booking = resolved.side?.booking ?? null;
  }

  const since = sinceParam ? new Date(sinceParam) : null;
  if (since && Number.isNaN(since.getTime())) {
    return NextResponse.json({ error: "Paramètre de date invalide." }, { status: 400 });
  }

  try {
    const payload = await getChatPollPayload({
      userId: user.id,
      activeConversationId,
      since,
    });

    return NextResponse.json(
      {
        conversations: payload.summaries,
        activeConversationId: payload.activeId,
        messages: payload.messages,
        messagesChanged: payload.messagesChanged,
        truncated: payload.truncated,
        serverTime: new Date().toISOString(),
        booking,
      },
      // Une réponse de sondage ne doit jamais être servie depuis un cache
      // intermédiaire : elle est propre à l'utilisateur et périmée en 2 s.
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Chat poll failed", error);
    return NextResponse.json({ error: "Impossible de synchroniser la messagerie." }, { status: 500 });
  }
}