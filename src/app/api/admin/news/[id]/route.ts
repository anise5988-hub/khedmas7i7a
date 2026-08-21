import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { newsStore } from "@/lib/server/news-store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { id } = await params;
  const item = await newsStore.getNewsById(id);
  if (!item) {
    return NextResponse.json({ error: "Actualité non trouvée." }, { status: 404 });
  }

  return NextResponse.json({ news: item });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Données requises." }, { status: 400 });
  }

  try {
    const updated = await newsStore.updateNews(id, {
      ...(body.title !== undefined ? { title: String(body.title).trim() } : {}),
      ...(body.shortDescription !== undefined ? { shortDescription: String(body.shortDescription).trim() } : {}),
      ...(body.content !== undefined ? { content: String(body.content).trim() } : {}),
      ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl ? String(body.imageUrl).trim() : null } : {}),
      ...(body.published !== undefined ? { published: Boolean(body.published) } : {}),
    });

    if (!updated) {
      return NextResponse.json({ error: "Actualité introuvable." }, { status: 404 });
    }

    return NextResponse.json({ success: true, news: updated, message: "Actualité mise à jour avec succès." });
  } catch (error) {
    console.error("News update failed", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { id } = await params;
  try {
    const success = await newsStore.deleteNews(id);
    return NextResponse.json({ success, message: "Actualité supprimée avec succès." });
  } catch (error) {
    console.error("News deletion failed", error);
    return NextResponse.json({ error: "Erreur lors de la suppression." }, { status: 500 });
  }
}
