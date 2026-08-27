import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/server/prisma";
import { fallbackStore } from "@/lib/server/fallback-store";
import { hash } from "bcryptjs";

const verifyOtpSchema = z.object({
  email: z.string().trim().email().transform((v) => v.toLowerCase()),
  otp: z.string().trim().min(6).max(6),
  password: z.string().min(8).max(128).optional(),
  type: z.enum(["PASSWORD_RESET", "EMAIL_VERIFY"]).default("PASSWORD_RESET"),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = verifyOtpSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Code OTP ou données invalides." }, { status: 400 });
  }

  try {
    const { email, otp, password, type } = parsed.data;

    const isValid = fallbackStore.verifyOtp(email, otp);
    if (!isValid) {
      return NextResponse.json({ error: "Code OTP invalide ou expiré." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    if (type === "EMAIL_VERIFY") {
      return NextResponse.json({
        success: true,
        message: "Email vérifié avec succès. Vous pouvez maintenant vous connecter.",
      });
    }

    if (!password) {
      return NextResponse.json({ error: "Mot de passe requis." }, { status: 400 });
    }

    const passwordHash = await hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    fallbackStore.updateUser(user.id, { passwordHash });

    return NextResponse.json({
      success: true,
      message: "Mot de passe réinitialisé avec succès. Vous pouvez vous connecter.",
    });
  } catch (error) {
    console.error("Verify OTP failed", error);
    return NextResponse.json({ error: "Impossible de vérifier le code." }, { status: 500 });
  }
}
