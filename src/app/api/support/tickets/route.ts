import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { notifyUser } from "@/lib/server/notification-service";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;

  const tickets = await prisma.supportTicket.findMany({
    where: user.role === "ADMIN" ? (status ? { status: status as never } : {}) : { userId: user.id },
    include: {
      user: { select: { firstName: true, lastName: true, email: true, role: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ tickets });
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);

  const body = await request.json().catch(() => null);
  const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
  const text = typeof body?.message === "string" ? body.message.trim() : "";
  const category = typeof body?.category === "string" ? body.category.trim() : null;
  const attachmentUrl = typeof body?.attachmentUrl === "string" ? body.attachmentUrl.trim() : null;
  const attachmentName = typeof body?.attachmentName === "string" ? body.attachmentName.trim() : null;

  if (!subject || (!text && !attachmentUrl)) {
    return NextResponse.json({ error: "Sujet et message obligatoires." }, { status: 400 });
  }

  // A visitor who hasn't created an account yet can still open a ticket —
  // the "chat with us" widget needs to work for prospective students and
  // teachers who haven't signed up. They just need to give us a name and
  // an email so we have somewhere to send the reply, since there's no
  // account to notify in-app.
  let guestName: string | null = null;
  let guestEmail: string | null = null;
  if (!user) {
    guestName = typeof body?.guestName === "string" ? body.guestName.trim() : "";
    guestEmail = typeof body?.guestEmail === "string" ? body.guestEmail.trim().toLowerCase() : "";
    if (!guestName || !guestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      return NextResponse.json({ error: "Nom et email valides requis." }, { status: 400 });
    }
  }

  const senderId = user ? user.id : `guest:${guestEmail}`;
  const senderName = user ? `${user.firstName} ${user.lastName}` : guestName!;
  const senderRole = user ? user.role : "GUEST";
  const senderAvatarUrl = user?.avatarUrl || null;

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: user ? user.id : null,
      guestName,
      guestEmail,
      subject,
      category,
      messages: {
        create: { senderId, senderName, senderRole, senderAvatarUrl, text, attachmentUrl, attachmentName },
      },
    },
    include: { messages: true },
  });

  // Notify all admins a new ticket was opened.
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  await Promise.all(
    admins.map((admin) =>
      notifyUser({
        userId: admin.id,
        type: "SUPPORT_TICKET_CREATED",
        title: "Nouveau ticket de support",
        message: `${senderName} a ouvert un ticket : "${subject}"`,
        link: `/admin/support/${ticket.id}`,
        dedupeKey: `support_ticket_new:${ticket.id}`,
      }),
    ),
  );

  return NextResponse.json({ ticket }, { status: 201 });
}
