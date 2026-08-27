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

  const notes = await prisma.classroomNote.findMany({
    where: { bookingId },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  return NextResponse.json({ notes });
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
  if (!text) {
    return NextResponse.json({ error: "Note vide." }, { status: 400 });
  }
  if (text.length > 8000) {
    return NextResponse.json({ error: "Note trop longue." }, { status: 400 });
  }

  const created = await prisma.classroomNote.create({
    data: {
      bookingId,
      authorId: user.id,
      authorName: `${user.firstName} ${user.lastName}`,
      text,
    },
  });

  return NextResponse.json({ note: created }, { status: 201 });
}
