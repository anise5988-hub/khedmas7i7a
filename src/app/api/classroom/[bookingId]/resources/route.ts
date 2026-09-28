import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getBookingAccess } from "@/lib/server/classroom-access";
import { getOrCreateClassroomSession } from "@/lib/server/classroom-session";
import { prisma } from "@/lib/server/prisma";

/**
 * Classroom resources: PDF / image lesson material uploaded by the teacher
 * (or by a student when the host allows it) and shared into the presentation
 * area. The binary lives in Supabase Storage via /api/uploads/video — this
 * route stores the metadata and the presentation state (which file is on
 * screen, which page), so a late joiner sees the same slide as everyone.
 */
export async function GET(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const user = await getCurrentUser(request);
  const { bookingId } = await params;
  const authorized = await getBookingAccess(bookingId, user);
  if (!authorized.ok) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const session = await getOrCreateClassroomSession(bookingId, authorized.startsAt, authorized.durationMinutes);
  if (!session) return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });

  const resources = await prisma.classroomResource.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ resources });
}

export async function POST(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const user = await getCurrentUser(request);
  const { bookingId } = await params;
  const authorized = await getBookingAccess(bookingId, user);
  if (!authorized.ok || !user) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const session = await getOrCreateClassroomSession(bookingId, authorized.startsAt, authorized.durationMinutes);
  if (!session) return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url : null;
  const fileName = typeof body?.fileName === "string" ? body.fileName.slice(0, 300) : null;
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType : null;
  const sizeBytes = typeof body?.sizeBytes === "number" ? Math.floor(body.sizeBytes) : 0;
  const pageCount = typeof body?.pageCount === "number" ? Math.max(1, Math.floor(body.pageCount)) : 1;

  if (!url || !fileName || !mimeType) {
    return NextResponse.json({ error: "Champs manquants." }, { status: 400 });
  }
  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");
  // Deliberately restrictive: only formats the presentation viewer can
  // actually render (PDF, images). Documents/presentations in other formats
  // are refused with a clear message rather than a fake preview.
  if (!isPdf && !isImage) {
    return NextResponse.json(
      { error: "Seuls les PDF et les images peuvent être partagés dans la zone de présentation." },
      { status: 400 },
    );
  }

  const created = await prisma.classroomResource.create({
    data: {
      sessionId: session.id,
      uploadedById: user.id,
      fileName,
      mimeType,
      kind: isPdf ? "PDF" : "IMAGE",
      url,
      sizeBytes,
      pageCount,
    },
  });

  // Uploading marks the file as the presented one — the teacher shares as
  // they upload, no extra click needed.
  await prisma.classroomResource.updateMany({
    where: { sessionId: session.id },
    data: { isPresenting: false },
  });
  const presenting = await prisma.classroomResource.update({
    where: { id: created.id },
    data: { isPresenting: true, presentedAt: new Date(), page: 1 },
  });

  return NextResponse.json({ resource: presenting }, { status: 201 });
}

/** PATCH — presentation state: which resource is on screen, which page. */
export async function PATCH(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const user = await getCurrentUser(request);
  const { bookingId } = await params;
  const authorized = await getBookingAccess(bookingId, user);
  if (!authorized.ok) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const session = await getOrCreateClassroomSession(bookingId, authorized.startsAt, authorized.durationMinutes);
  if (!session) return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const resourceId = typeof body?.resourceId === "string" ? body.resourceId : null;
  const page = typeof body?.page === "number" ? Math.max(1, Math.floor(body.page)) : null;
  const stop = body?.stop === true;

  if (stop) {
    await prisma.classroomResource.updateMany({ where: { sessionId: session.id }, data: { isPresenting: false } });
    return NextResponse.json({ success: true });
  }
  if (!resourceId) return NextResponse.json({ error: "resourceId manquant." }, { status: 400 });

  const target = await prisma.classroomResource.findFirst({ where: { id: resourceId, sessionId: session.id } });
  if (!target) return NextResponse.json({ error: "Ressource introuvable." }, { status: 404 });

  await prisma.classroomResource.updateMany({ where: { sessionId: session.id }, data: { isPresenting: false } });
  const updated = await prisma.classroomResource.update({
    where: { id: resourceId },
    data: {
      isPresenting: true,
      presentedAt: target.presentedAt ?? new Date(),
      page: page ?? target.page,
    },
  });
  return NextResponse.json({ resource: updated });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const user = await getCurrentUser(request);
  const { bookingId } = await params;
  const authorized = await getBookingAccess(bookingId, user);
  if (!authorized.ok) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const resourceId = searchParams.get("resourceId");
  if (!resourceId) return NextResponse.json({ error: "resourceId manquant." }, { status: 400 });

  const session = await getOrCreateClassroomSession(bookingId, authorized.startsAt, authorized.durationMinutes);
  if (!session) return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });

  // Only the uploader, the host or an admin may delete a resource.
  const resource = await prisma.classroomResource.findFirst({ where: { id: resourceId, sessionId: session.id } });
  if (!resource) return NextResponse.json({ error: "Ressource introuvable." }, { status: 404 });
  if (resource.uploadedById !== user!.id && !authorized.party.isHost) {
    return NextResponse.json({ error: "Seul l'auteur ou l'enseignant peut supprimer ce fichier." }, { status: 403 });
  }

  await prisma.classroomResource.delete({ where: { id: resourceId } });
  return NextResponse.json({ success: true });
}
