import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getBookingAccess } from "@/lib/server/classroom-access";
import { getOrCreateClassroomSession } from "@/lib/server/classroom-session";
import { prisma } from "@/lib/server/prisma";

/**
 * Whiteboard pages. The board is a vector scene (`strokes` JSON) per page so
 * undo/redo and remote sync are exact rather than lossy bitmap snapshots.
 * Every write records updatedById so the client can show "X modifie le
 * tableau" and the host can restore a page from history via ClassroomEvent.
 *
 * Authorization: both participants may write while the host's
 * studentWhiteboardAllowed switch is on (the host may always write). A
 * student whose write is rejected gets 403, never a silent no-op.
 */
export async function GET(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const user = await getCurrentUser(request);
  const { bookingId } = await params;
  const authorized = await getBookingAccess(bookingId, user);
  if (!authorized.ok) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const session = await getOrCreateClassroomSession(bookingId, authorized.startsAt, authorized.durationMinutes);
  if (!session) return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });

  const pages = await prisma.classroomWhiteboardPage.findMany({
    where: { sessionId: session.id },
    orderBy: { pageIndex: "asc" },
  });
  return NextResponse.json({
    pages,
    studentCanDraw: authorized.party.isHost || session.studentWhiteboardAllowed,
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const user = await getCurrentUser(request);
  const { bookingId } = await params;
  const authorized = await getBookingAccess(bookingId, user);
  if (!authorized.ok || !user) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const session = await getOrCreateClassroomSession(bookingId, authorized.startsAt, authorized.durationMinutes);
  if (!session) return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });

  if (!authorized.party.isHost && !session.studentWhiteboardAllowed) {
    return NextResponse.json({ error: "Le tableau est réservé à l'enseignant pour le moment." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const pageIndex = typeof body?.pageIndex === "number" ? Math.max(0, Math.floor(body.pageIndex)) : null;
  const strokes = body?.strokes;
  if (pageIndex === null || !Array.isArray(strokes)) {
    return NextResponse.json({ error: "pageIndex et strokes (tableau) sont requis." }, { status: 400 });
  }
  if (strokes.length > 5000) {
    return NextResponse.json({ error: "Trop d'éléments sur cette page." }, { status: 400 });
  }

  const page = await prisma.classroomWhiteboardPage.upsert({
    where: { sessionId_pageIndex: { sessionId: session.id, pageIndex } },
    create: { sessionId: session.id, pageIndex, strokes: strokes as never, updatedById: user.id },
    update: { strokes: strokes as never, updatedById: user.id },
  });
  return NextResponse.json({ page });
}

/** POST — create an additional page (returns the new page index). */
export async function POST(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const user = await getCurrentUser(request);
  const { bookingId } = await params;
  const authorized = await getBookingAccess(bookingId, user);
  if (!authorized.ok || !user) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const session = await getOrCreateClassroomSession(bookingId, authorized.startsAt, authorized.durationMinutes);
  if (!session) return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });

  if (!authorized.party.isHost && !session.studentWhiteboardAllowed) {
    return NextResponse.json({ error: "Le tableau est réservé à l'enseignant pour le moment." }, { status: 403 });
  }

  const last = await prisma.classroomWhiteboardPage.findFirst({
    where: { sessionId: session.id },
    orderBy: { pageIndex: "desc" },
    select: { pageIndex: true },
  });
  const pageIndex = (last?.pageIndex ?? -1) + 1;
  const page = await prisma.classroomWhiteboardPage.create({
    data: { sessionId: session.id, pageIndex, strokes: [], updatedById: user.id },
  });
  return NextResponse.json({ page }, { status: 201 });
}

/** DELETE — removes a page (host or the same permission as drawing). */
export async function DELETE(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const user = await getCurrentUser(request);
  const { bookingId } = await params;
  const authorized = await getBookingAccess(bookingId, user);
  if (!authorized.ok) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const session = await getOrCreateClassroomSession(bookingId, authorized.startsAt, authorized.durationMinutes);
  if (!session) return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });

  if (!authorized.party.isHost && !session.studentWhiteboardAllowed) {
    return NextResponse.json({ error: "Le tableau est réservé à l'enseignant pour le moment." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const pageIndex = Number(searchParams.get("pageIndex"));
  if (!Number.isInteger(pageIndex)) return NextResponse.json({ error: "pageIndex invalide." }, { status: 400 });

  const remaining = await prisma.classroomWhiteboardPage.count({ where: { sessionId: session.id } });
  if (remaining <= 1) return NextResponse.json({ error: "Impossible de supprimer la dernière page." }, { status: 400 });

  await prisma.classroomWhiteboardPage.delete({
    where: { sessionId_pageIndex: { sessionId: session.id, pageIndex } },
  });
  // Reindex so the page strip stays contiguous (pageIndex 0..n-1).
  const pages = await prisma.classroomWhiteboardPage.findMany({
    where: { sessionId: session.id },
    orderBy: { pageIndex: "asc" },
  });
  await Promise.all(
    pages.map((p, i) =>
      p.pageIndex === i ? Promise.resolve(p) : prisma.classroomWhiteboardPage.update({ where: { id: p.id }, data: { pageIndex: i } }),
    ),
  );

  return NextResponse.json({ success: true });
}
