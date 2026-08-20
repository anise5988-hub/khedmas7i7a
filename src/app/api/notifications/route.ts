import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { notificationsStore } from "@/lib/server/notifications-store";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 200 });
  }

  const result = notificationsStore.getUserNotifications(user.id, user.role);
  return NextResponse.json(result);
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  notificationsStore.markAsRead(user.id, body.id);

  const result = notificationsStore.getUserNotifications(user.id, user.role);
  return NextResponse.json({ success: true, ...result });
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.title || !body.message) {
    return NextResponse.json({ error: "Titre et message requis" }, { status: 400 });
  }

  const notification = notificationsStore.addNotification({
    userId: body.userId || user.id,
    role: body.role || null,
    title: body.title,
    message: body.message,
    type: body.type || "INFO",
    link: body.link || null,
  });

  return NextResponse.json({ success: true, notification });
}
