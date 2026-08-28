import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { z } from "zod";

const updateProfileSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().transform((v) => v.toLowerCase()),
  phone: z.string().trim().optional().or(z.literal("")),
  avatarUrl: z.string().trim().url().optional().or(z.literal("")),
});

export async function PATCH(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données de profil invalides.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    // Check if new email is taken by another user
    if (parsed.data.email !== user.email) {
      const existing = await prisma.user.findUnique({
        where: { email: parsed.data.email },
      });
      if (existing && existing.id !== user.id) {
        return NextResponse.json(
          { error: "Cette adresse email est déjà utilisée par un autre compte." },
          { status: 409 },
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        ...(parsed.data.avatarUrl !== undefined ? { avatarUrl: parsed.data.avatarUrl || null } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profil mis à jour avec succès !",
      user: {
        id: updated.id,
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        phone: updated.phone,
        avatarUrl: updated.avatarUrl,
      },
    });
  } catch (error) {
    console.error("Profile update failed", error);
    return NextResponse.json({ error: "Impossible de modifier le profil." }, { status: 500 });
  }
}
