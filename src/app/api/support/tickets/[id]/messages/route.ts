import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { notifyUser } from "@/lib/server/notification-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

  const { id } = await params;
  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket || (ticket.userId !== user.id && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Ticket introuvable ou accès refusé." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "Message vide." }, { status: 400 });

  const isAdminReply = user.role === "ADMIN" && ticket.userId !== user.id;

  const [message] = await prisma.$transaction([
    prisma.supportMessage.create({
      data: {
        ticketId: id,
        senderId: user.id,
        senderName: `${user.firstName} ${user.lastName}`,
        senderRole: user.role,
        text,
      },
    }),
    prisma.supportTicket.update({
      where: { id },
      data: {
        updatedAt: new Date(),
        // A reply from support reopens a resolved/closed ticket into
        // progress; a reply from the ticket owner on an open ticket
        // doesn't change status.
        ...(isAdminReply && (ticket.status === "OPEN")
          ? { status: "IN_PROGRESS" }
          : {}),
      },
    }),
  ]);

  if (isAdminReply) {
    await notifyUser({
      userId: ticket.userId,
      type: "SUPPORT_TICKET_REPLY",
      title: "Réponse à votre ticket de support",
      message: `L'équipe ProfySpace a répondu à votre ticket "${ticket.subject}".`,
      link: "/dashboard/support",
      dedupeKey: `support_reply:${message.id}`,
    });
  }

  return NextResponse.json({ message }, { status: 201 });
}
