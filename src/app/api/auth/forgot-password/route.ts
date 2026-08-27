import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { z } from "zod";
import { sendOtpEmail } from "@/lib/server/email";
import { fallbackStore } from "@/lib/server/fallback-store";

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
      return NextResponse.json({
        success: true,
        message: "Si cette adresse existe, les instructions de réinitialisation ont été envoyées.",
      });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    fallbackStore.setOtp(user.email, otp);

    const emailSent = await sendOtpEmail(
      user.email,
      user.firstName,
      otp,
      "Code de réinitialisation de mot de passe",
      `Bonjour ${user.firstName}, voici votre code de réinitialisation de mot de passe ProfySpace.tn. Il expire dans 10 minutes.`
    );

    return NextResponse.json({
      success: true,
      message: emailSent
        ? "Un code de réinitialisation a été envoyé à votre adresse email."
        : "Impossible d'envoyer l'email pour le moment. Veuillez réessayer.",
    });
  } catch (error) {
    console.error("Forgot password failed", error);
    return NextResponse.json({ error: "Service temporairement indisponible." }, { status: 500 });
  }
}
