import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { notifyUser } from "@/lib/server/notification-service";
import { sendTransactionalEmail } from "@/lib/server/email";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  const { id } = await params;
  const ticket = await prisma.supportTicket.findUnique({ where: { id } });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket introuvable ou accès refusé." }, { status: 404 });
  }

  // Same access model as GET on the ticket itself: a guest ticket (no
  // userId) is reachable by anyone holding its unguessable id; an
  // authenticated ticket requires the real owner or an admin.
  const isGuestTicket = ticket.userId === null;
  if (!isGuestTicket && (!user || (ticket.userId !== user.id && user.role !== "ADMIN"))) {
    return NextResponse.json({ error: "Ticket introuvable ou accès refusé." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "Message vide." }, { status: 400 });

  const isAdminReply = !!user && user.role === "ADMIN" && ticket.userId !== user.id;
  const senderId = user ? user.id : `guest:${ticket.guestEmail}`;
  const senderName = user ? `${user.firstName} ${user.lastName}` : ticket.guestName || "Visiteur";
  const senderRole = user ? user.role : "GUEST";

  const [message] = await prisma.$transaction([
    prisma.supportMessage.create({
      data: { ticketId: id, senderId, senderName, senderRole, text },
    }),
    prisma.supportTicket.update({
      where: { id },
      data: {
        updatedAt: new Date(),
        // A reply from support reopens a resolved/closed ticket into
        // progress; a reply from the ticket owner on an open ticket
        // doesn't change status.
        ...(isAdminReply && ticket.status === "OPEN" ? { status: "IN_PROGRESS" } : {}),
      },
    }),
  ]);

  if (isAdminReply) {
    if (ticket.userId) {
      await notifyUser({
        userId: ticket.userId,
        type: "SUPPORT_TICKET_REPLY",
        title: "Réponse à votre ticket de support",
        message: `L'équipe ProfySpace a répondu à votre ticket "${ticket.subject}".`,
        link: "/dashboard/support",
        dedupeKey: `support_reply:${message.id}`,
      });
    } else if (ticket.guestEmail) {
      await sendTransactionalEmail({
        to: ticket.guestEmail,
        name: ticket.guestName || undefined,
        subject: `Réponse à votre message : "${ticket.subject}"`,
        title: "L'équipe ProfySpace vous a répondu",
        message: text,
      });
    }
  }

  return NextResponse.json({ message }, { status: 201 });
}
