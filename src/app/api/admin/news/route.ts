import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { newsStore } from "@/lib/server/news-store";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé. Réservé aux administrateurs." }, { status: 403 });
  }

  try {
    const news = await newsStore.getAllNews(false);
    return NextResponse.json({ news });
  } catch (error) {
    console.error("Admin news fetch failed", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé. Réservé aux administrateurs." }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.title || !body.shortDescription || !body.content) {
      return NextResponse.json({ error: "Titre, résumé et contenu sont requis." }, { status: 400 });
    }

    const created = await newsStore.createNews({
      title: String(body.title).trim(),
      shortDescription: String(body.shortDescription).trim(),
      content: String(body.content).trim(),
      imageUrl: body.imageUrl ? String(body.imageUrl).trim() : null,
      published: Boolean(body.published),
      authorId: user.id,
    });

    return NextResponse.json({ success: true, news: created, message: "Actualité créée avec succès." }, { status: 201 });
  } catch (error) {
    console.error("Admin create news failed", error);
    return NextResponse.json({ error: "Impossible de créer l'actualité." }, { status: 500 });
  }
}
