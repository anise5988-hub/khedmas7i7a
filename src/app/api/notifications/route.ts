import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 200 });
  }

  try {
    const notifications = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
    return NextResponse.json({ notifications, unreadCount: notifications.filter((notification) => !notification.read).length });
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
