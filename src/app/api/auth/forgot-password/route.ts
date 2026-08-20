import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { hash } from "bcryptjs";
import { z } from "zod";

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

      return NextResponse.json({
        success: true,
        message: "Votre mot de passe a été réinitialisé avec succès ! Vous pouvez maintenant vous connecter.",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Un lien de réinitialisation a été envoyé à votre adresse email.",
    });
  } catch (error) {
    console.error("Forgot password failed", error);
    return NextResponse.json({ error: "Service temporairement indisponible." }, { status: 500 });
  }
}
