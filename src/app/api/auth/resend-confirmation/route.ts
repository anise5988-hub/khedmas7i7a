import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/server/prisma";
import { sendOtpEmail } from "@/lib/server/email";
import { fallbackStore } from "@/lib/server/fallback-store";

const schema = z.object({ email: z.string().email().transform((value) => value.toLowerCase().trim()) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });

  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) {
      return NextResponse.json({ success: true, message: "Si cette adresse existe, un code de confirmation a été envoyé." });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    fallbackStore.setOtp(user.email, otp);

    const emailSent = await sendOtpEmail(
      user.email,
      user.firstName,
      otp,
      "Confirmez votre adresse email",
      `Bonjour ${user.firstName}, voici votre code de confirmation ProfySpace.tn. Il expire dans 10 minutes.`
    );

    return NextResponse.json({
      success: true,
      message: emailSent
        ? "Un code de confirmation a été renvoyé. Vérifiez aussi vos spams."
        : "Impossible d'envoyer l'email pour le moment. Veuillez réessayer.",
    });
  } catch (error) {
    console.error("Resend confirmation failed", error);
    return NextResponse.json({ error: "Impossible de renvoyer l'email pour le moment." }, { status: 400 });
  }
}
