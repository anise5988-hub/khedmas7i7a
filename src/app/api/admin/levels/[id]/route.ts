import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const level = await prisma.educationLevel.findUnique({ where: { id } });
    if (!level) return NextResponse.json({ error: "Niveau introuvable." }, { status: 404 });
    return NextResponse.json({ level });
  } catch (error) {
    console.error("Failed to load level", error);
    return NextResponse.json({ error: "Impossible de charger le niveau." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const level = await prisma.educationLevel.update({
      where: { id },
      data: {
        ...(typeof body.name === "string" ? { name: body.name.trim() } : {}),
        ...(typeof body.slug === "string" ? { slug: body.slug.trim() } : {}),
        ...(typeof body.cycle === "string" ? { cycle: body.cycle.trim() } : {}),
        ...(typeof body.sortOrder === "number" ? { sortOrder: body.sortOrder } : {}),
        ...(typeof body.active === "boolean" ? { active: body.active } : {}),
      },
    });
    return NextResponse.json({ level });
  } catch (error) {
    console.error("Failed to update level", error);
    return NextResponse.json({ error: "Impossible de modifier le niveau." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.educationLevel.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete level", error);
    return NextResponse.json({ error: "Impossible de supprimer le niveau." }, { status: 500 });
  }
}
