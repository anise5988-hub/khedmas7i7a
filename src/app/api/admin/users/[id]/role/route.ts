import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { fallbackStore } from "@/lib/server/fallback-store";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const newRole = body?.role;

  if (!["STUDENT", "TEACHER", "ADMIN"].includes(newRole)) {
    return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
  }

  try {
    try {
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { role: newRole },
      });
      return NextResponse.json({ success: true, user: updatedUser });
    } catch (dbError) {
      console.warn("Prisma user role update failed, using fallback store", dbError);
    }

    const updated = fallbackStore.updateUser(id, { role: newRole });
    if (!updated) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error("Update role error:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la mise à jour." }, { status: 500 });
  }
}
