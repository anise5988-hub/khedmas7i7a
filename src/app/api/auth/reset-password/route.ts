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
    const email = body?.email ? String(body.email).toLowerCase().trim() : null;
    const accessToken = body?.accessToken ? String(body.accessToken) : null;

    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
    }

    let userId: string | null = null;
    let userEmail = email;

    // 1. Try currently authenticated user from session/cookie
    const currentUser = await getCurrentUser(request);
    if (currentUser) {
      userId = currentUser.id;
      userEmail = currentUser.email;
    }

    // 2. Try Supabase access token if provided
    if (!userId && supabaseAuth && accessToken) {
      const { data } = await supabaseAuth.auth.getUser(accessToken);
      if (data?.user) {
        userId = data.user.id;
        userEmail = data.user.email?.toLowerCase().trim() || userEmail;
      }
    }

    const passwordHash = await hash(password, 12);

    // Update in Prisma
    if (userId || userEmail) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            ...(userId ? [{ id: userId }] : []),
            ...(userEmail ? [{ email: userEmail }] : []),
          ],
        },
      });

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

    // Fallback store update by email
    if (userEmail) {
      const fallbackUser = fallbackStore.getUserByEmail(userEmail);
      if (fallbackUser) {
        fallbackStore.updateUser(fallbackUser.id, { passwordHash });
        return NextResponse.json({
          success: true,
          message: "Mot de passe réinitialisé avec succès.",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Mot de passe mis à jour avec succès.",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json({ error: "Impossible de réinitialiser le mot de passe." }, { status: 500 });
  }
}
