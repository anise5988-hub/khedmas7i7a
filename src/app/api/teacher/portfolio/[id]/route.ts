import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { parsePortfolioInput } from "@/lib/server/portfolio";

export const runtime = "nodejs";

async function loadOwnedItem(userId: string, role: string, itemId: string) {
  const item = await prisma.teacherPortfolioItem.findUnique({
    where: { id: itemId },
    include: { teacher: { select: { userId: true } } },
  });
  if (!item) return { item: null, forbidden: false };
  const isOwner = item.teacher.userId === userId;
  if (!isOwner && role !== "ADMIN") return { item: null, forbidden: true };
  return { item, forbidden: false };
}

/** PATCH /api/teacher/portfolio/[id] — edits or (un)publishes a réalisation. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }

  const { id } = await params;
  const { item, forbidden } = await loadOwnedItem(user.id, user.role, id);
  if (forbidden) {
    return NextResponse.json({ error: "Vous ne pouvez modifier que vos propres réalisations." }, { status: 403 });
  }
  if (!item) {
    return NextResponse.json({ error: "Réalisation introuvable." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Données manquantes." }, { status: 400 });
  }

  // A visibility-only toggle shouldn't force the teacher to re-send every
  // field — that's the common case from the list view.
  const visibilityOnly =
    typeof body.isPublic === "boolean" &&
    body.title === undefined &&
    body.mediaUrl === undefined &&
    body.externalUrl === undefined;

  try {
    if (visibilityOnly) {
      const updated = await prisma.teacherPortfolioItem.update({
        where: { id },
        data: { isPublic: body.isPublic as boolean },
      });
      return NextResponse.json({ success: true, item: updated });
    }

    const parsed = parsePortfolioInput({
      title: body.title ?? item.title,
      description: body.description ?? item.description,
      type: body.type ?? item.type,
      subject: body.subject ?? item.subject,
      level: body.level ?? item.level,
      mediaUrl: body.mediaUrl ?? item.mediaUrl,
      thumbnailUrl: body.thumbnailUrl ?? item.thumbnailUrl,
      externalUrl: body.externalUrl ?? item.externalUrl,
    });
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const updated = await prisma.teacherPortfolioItem.update({
      where: { id },
      data: {
        ...parsed.value,
        ...(typeof body.isPublic === "boolean" ? { isPublic: body.isPublic } : {}),
      },
    });

    return NextResponse.json({ success: true, item: updated, message: "Réalisation mise à jour." });
  } catch (error) {
    console.error("Portfolio update failed", error);
    return NextResponse.json({ error: "Impossible de mettre à jour cette réalisation." }, { status: 500 });
  }
}

/** DELETE /api/teacher/portfolio/[id] */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }

  const { id } = await params;
  const { item, forbidden } = await loadOwnedItem(user.id, user.role, id);
  if (forbidden) {
    return NextResponse.json({ error: "Vous ne pouvez supprimer que vos propres réalisations." }, { status: 403 });
  }
  if (!item) {
    return NextResponse.json({ error: "Réalisation introuvable." }, { status: 404 });
  }

  try {
    await prisma.teacherPortfolioItem.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Réalisation supprimée." });
  } catch (error) {
    console.error("Portfolio deletion failed", error);
    return NextResponse.json({ error: "Impossible de supprimer cette réalisation." }, { status: 500 });
  }
}