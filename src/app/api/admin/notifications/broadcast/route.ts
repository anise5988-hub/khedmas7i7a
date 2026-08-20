import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { notificationsStore } from "@/lib/server/notifications-store";

export async function POST(request: Request) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.title || !body.message) {
    return NextResponse.json({ error: "Le titre et le message de la notification sont requis." }, { status: 400 });
  }

  const notification = notificationsStore.addNotification({
    userId: body.userId || null,
    role: body.targetRole || null,
    title: String(body.title).trim(),
    message: String(body.message).trim(),
    type: body.type || "SYSTEM",
    link: body.link || null,
  });

  return NextResponse.json({
    success: true,
    message: "Notification diffusée avec succès !",
    notification,
  });
}
