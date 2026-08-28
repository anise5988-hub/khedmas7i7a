import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { compare } from "bcryptjs";
import { z } from "zod";
import { clearSessionCookies } from "@/lib/server/session-cookies";

const deleteAccountSchema = z.object({
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = deleteAccountSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Veuillez saisir votre mot de passe pour confirmer la suppression." },
      { status: 400 },
    );
  }

  try {
    const valid = await compare(parsed.data.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 400 });
    }

    // Cascade delete user
    await prisma.user.delete({
      where: { id: user.id },
    });

    const response = NextResponse.json({
      success: true,
      message: "Votre compte a été définitivement supprimé.",
    });

    clearSessionCookies(response);
    return response;
  } catch (error) {
    console.error("Delete account failed", error);
    return NextResponse.json({ error: "Impossible de supprimer le compte." }, { status: 500 });
  }
}
