import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { fallbackStore } from "@/lib/server/fallback-store";
import { supabaseAuth } from "@/lib/server/supabase-auth";
import { getCurrentUser } from "@/lib/server/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const password = String(body?.password || "").trim();
    const accessToken = body?.accessToken ? String(body.accessToken) : null;

    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
    }

    let userId: string | null = null;

    // A password reset is authorized by the authenticated Supabase recovery
    // session, never by a user-controlled email address.
    const currentUser = await getCurrentUser(request);
    if (currentUser) {
      userId = currentUser.id;
    }

    // Try the Supabase recovery access token if provided.
    if (!userId && supabaseAuth && accessToken) {
      const { data } = await supabaseAuth.auth.getUser(accessToken);
      if (data?.user) {
        userId = data.user.id;
      }
    }

    const passwordHash = await hash(password, 12);

    // Update in Prisma
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash },
        });

        fallbackStore.updateUser(user.id, { passwordHash });

        return NextResponse.json({
          success: true,
          message: "Mot de passe réinitialisé avec succès.",
        });
      }
    }

    if (userId) {
      const fallbackUser = fallbackStore.getUserById(userId);
      if (fallbackUser) {
        fallbackStore.updateUser(fallbackUser.id, { passwordHash });
        return NextResponse.json({ success: true, message: "Mot de passe réinitialisé avec succès." });
      }
    }

    return NextResponse.json({ error: "Session de réinitialisation invalide ou expirée." }, { status: 401 });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json({ error: "Impossible de réinitialiser le mot de passe." }, { status: 500 });
  }
}
