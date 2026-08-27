import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { authorizeBookingParticipant } from "@/lib/server/classroom-auth";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const user = await getCurrentUser(request);
  const { bookingId } = await params;
  const authorized = await authorizeBookingParticipant(bookingId, user);
  if (!authorized) {
    return NextResponse.json({ error: "Vous ne faites pas partie de cette séance." }, { status: 403 });
  }

  const messages = await prisma.classroomMessage.findMany({
    where: { bookingId },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return NextResponse.json({ messages });
}

export async function POST(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const user = await getCurrentUser(request);
  const { bookingId } = await params;
  const authorized = await authorizeBookingParticipant(bookingId, user);
  if (!authorized || !user) {
    return NextResponse.json({ error: "Vous ne faites pas partie de cette séance." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const attachmentUrl = typeof body?.attachmentUrl === "string" ? body.attachmentUrl : null;
  const attachmentName = typeof body?.attachmentName === "string" ? body.attachmentName : null;

  if (!text && !attachmentUrl) {
    return NextResponse.json({ error: "Message vide." }, { status: 400 });
  }
  if (text.length > 4000) {
    return NextResponse.json({ error: "Message trop long." }, { status: 400 });
  }

  const created = await prisma.classroomMessage.create({
    data: {
      bookingId,
      senderId: user.id,
      senderName: `${user.firstName} ${user.lastName}`,
      text: text || null,
      attachmentUrl,
      attachmentName,
    },
  });

  return NextResponse.json({ message: created }, { status: 201 });
}
