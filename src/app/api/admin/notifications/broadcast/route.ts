import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { notifyUser } from "@/lib/server/notification-service";

const VALID_ROLES = ["STUDENT", "TEACHER", "ADMIN"];

export async function POST(request: Request) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.title || !body.message) {
    return NextResponse.json({ error: "Le titre et le message de la notification sont requis." }, { status: 400 });
  }

  const title = String(body.title).trim();
  const message = String(body.message).trim();
  const link = body.link ? String(body.link) : undefined;
  const targetRole = VALID_ROLES.includes(body.targetRole) ? body.targetRole : null;
  const targetUserId = body.userId ? String(body.userId) : null;

  const recipients = await prisma.user.findMany({
    where: targetUserId ? { id: targetUserId } : targetRole ? { role: targetRole } : {},
    select: { id: true },
  });

  if (recipients.length === 0) {
    return NextResponse.json({ error: "Aucun destinataire trouvé pour cette diffusion." }, { status: 400 });
  }

  const broadcastId = `broadcast_${Date.now()}`;
  await Promise.all(
    recipients.map((recipient) =>
      notifyUser({
        userId: recipient.id,
        type: "ADMIN_ANNOUNCEMENT",
        title,
        message,
        link,
        dedupeKey: `${broadcastId}:${recipient.id}`,
      }),
    ),
  );

  return NextResponse.json({
    success: true,
    message: `Notification diffusée à ${recipients.length} utilisateur(s).`,
    recipientCount: recipients.length,
  });
}
