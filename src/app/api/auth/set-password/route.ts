import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { fallbackStore } from "@/lib/server/fallback-store";
import { notifyUser } from "@/lib/server/notification-service";

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé. Veuillez vous connecter." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const password = String(body?.password || "").trim();

  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
  }

  try {
    const passwordHash = await hash(password, 10);

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
      await notifyUser({
        userId: user.id,
        type: "PASSWORD_CHANGED",
        title: "Mot de passe défini avec succès ",
        message: "Votre mot de passe a été défini. Vous pouvez désormais vous connecter directement avec votre adresse email.",
        emailSubject: "Votre mot de passe a été configuré sur Profy",
        link: "/dashboard",
        dedupeKey: `pwd_set:${user.id}:${Date.now()}`,
      });
      return NextResponse.json({ success: true, message: "Mot de passe configuré avec succès !" });
    } catch (dbError) {
      console.warn("Prisma set-password failed, updating fallback store", dbError);
    }

    fallbackStore.updateUser(user.id, { passwordHash });
    return NextResponse.json({ success: true, message: "Mot de passe configuré avec succès !" });
  } catch (err) {
    console.error("Set password error:", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour du mot de passe." }, { status: 500 });
  }
}
