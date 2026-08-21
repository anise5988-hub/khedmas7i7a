import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { z } from "zod";
import { supabaseAuth } from "@/lib/server/supabase-auth";
import { sendTransactionalEmail } from "@/lib/server/email";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().transform((v) => v.toLowerCase()),
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

    if (!supabaseAuth) {
      await sendTransactionalEmail({
        to: user.email,
        name: user.firstName,
        subject: "Réinitialisation de votre mot de passe Profy",
        title: "Réinitialisation de mot de passe",
        message: `Bonjour ${user.firstName}, le service Supabase Auth n'est pas configuré. Contactez le support pour réinitialiser votre mot de passe.`,
        link: "/support",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Un email contenant les instructions de réinitialisation vous a été envoyé.",
    });
  } catch (error) {
    console.error("Forgot password failed", error);
    return NextResponse.json({ error: "Service temporairement indisponible." }, { status: 500 });
  }
}
