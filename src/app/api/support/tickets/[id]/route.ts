import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { logAdminAction } from "@/lib/server/audit-log";
import type { TicketStatus, TicketPriority } from "@prisma/client";

async function authorizeTicket(id: string, user: { id: string; role: string } | null) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) return null;
  // A guest ticket has no account to check ownership against — the
  // unguessable cuid ticket id itself is the access credential, same
  // model as an order-tracking link. An authenticated ticket still
  // requires the real owner or an admin.
  if (ticket.userId === null) return ticket;
  if (!user) return null;
  if (ticket.userId !== user.id && user.role !== "ADMIN") return null;
  return ticket;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  const { id } = await params;
  const ticket = await authorizeTicket(id, user);
  if (!ticket) {
    return NextResponse.json({ error: "Ticket introuvable ou accès refusé." }, { status: 404 });
  }

  const full = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: { select: { firstName: true, lastName: true, email: true, role: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  return NextResponse.json({ ticket: full });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const status = body?.status as TicketStatus | undefined;
  const priority = body?.priority as TicketPriority | undefined;

  const validStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
  const validPriorities = ["LOW", "NORMAL", "HIGH", "URGENT"];

  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  }
  if (priority && !validPriorities.includes(priority)) {
    return NextResponse.json({ error: "Priorité invalide." }, { status: 400 });
  }

  try {
    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: { ...(status ? { status } : {}), ...(priority ? { priority } : {}) },
    });

    await logAdminAction({
      actor: user,
      action: "SUPPORT_TICKET_STATUS_CHANGED",
      targetType: "SupportTicket",
      targetId: ticket.id,
      metadata: { status, priority },
    });

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Failed to update ticket", error);
    return NextResponse.json({ error: "Impossible de mettre à jour le ticket." }, { status: 500 });
  }
}
