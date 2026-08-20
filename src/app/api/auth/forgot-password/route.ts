import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { hash } from "bcryptjs";
import { z } from "zod";
import { supabaseAuth } from "@/lib/server/supabase-auth";
import { notifyUser } from "@/lib/server/notification-service";
import { sendTransactionalEmail } from "@/lib/server/email";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().transform((v) => v.toLowerCase()),
  newPassword: z.string().min(8).max(128).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (!user) {
      // Return positive message for security so user email existence isn't leaked
      return NextResponse.json({
        success: true,
        message: "Si cette adresse existe, les instructions de réinitialisation ont été envoyées.",
      });
    }

    // If a direct newPassword reset is provided
    if (parsed.data.newPassword) {
      const newHash = await hash(parsed.data.newPassword, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      });

      await notifyUser({
        userId: user.id,
        type: "PASSWORD_CHANGED",
        title: "Mot de passe réinitialisé 🔒",
        message: "Votre mot de passe a été réinitialisé avec succès. Vous pouvez vous connecter à votre compte.",
        emailSubject: "Votre mot de passe Profy a été réinitialisé",
        link: "/login",
        dedupeKey: `pwd_reset_done:${user.id}:${Date.now()}`,
      });

      return NextResponse.json({
        success: true,
        message: "Votre mot de passe a été réinitialisé avec succès ! Vous pouvez maintenant vous connecter.",
      });
    }

    const appOrigin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

    if (supabaseAuth) {
      try {
        await supabaseAuth.auth.resetPasswordForEmail(parsed.data.email, {
          redirectTo: `${appOrigin}/reset-password`,
        });
      } catch (err) {
        console.warn("Supabase resetPasswordForEmail failed", err);
      }
    }

    await sendTransactionalEmail({
      to: user.email,
      name: user.firstName,
      subject: "Réinitialisation de votre mot de passe Profy",
      title: "Réinitialisation de mot de passe",
      message: `Bonjour ${user.firstName}, vous avez demandé la réinitialisation de votre mot de passe sur Profy. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.`,
      link: `/forgot-password?email=${encodeURIComponent(user.email)}`,
    });

    return NextResponse.json({
      success: true,
      message: "Un email contenant les instructions de réinitialisation vous a été envoyé.",
    });
  } catch (error) {
    console.error("Forgot password failed", error);
    return NextResponse.json({ error: "Service temporairement indisponible." }, { status: 500 });
  }
}
