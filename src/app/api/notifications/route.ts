import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 200 });
  }

  const { searchParams } = new URL(request.url);

  // Sondage léger : la cloche n'a besoin que du compteur pour afficher sa
  // pastille. Renvoyer 50 avis complets toutes les 15 s sur chaque page
  // coûtait une requête Base et un transfert inutiles (et déclenchait un
  // rendu de la liste même fermée).
  if (searchParams.get("scope") === "count") {
    try {
      const unreadCount = await prisma.notification.count({
        where: { userId: user.id, read: false },
      });
      return NextResponse.json(
        { unreadCount },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    } catch (error) {
      console.error("Notification count failed", error);
      return NextResponse.json({ error: "Impossible de charger le compteur." }, { status: 500 });
    }
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(
      {
        notifications,
        unreadCount: notifications.filter((notification) => !notification.read).length,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Notifications fetch failed", error);
    return NextResponse.json({ error: "Impossible de charger les notifications." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  try {
    await prisma.notification.updateMany({ where: { userId: user.id, ...(body.id ? { id: body.id } : {}) }, data: { read: true } });
    const notifications = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
    return NextResponse.json({ success: true, notifications, unreadCount: notifications.filter((notification) => !notification.read).length });
  } catch (error) {
    console.error("Notification update failed", error);
    return NextResponse.json({ error: "Impossible de mettre à jour la notification." }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ error: "Les notifications sont créées côté serveur." }, { status: 405 });
}
