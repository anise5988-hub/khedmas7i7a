import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const section = await prisma.bacSection.findUnique({ where: { id } });
    if (!section) return NextResponse.json({ error: "Section introuvable." }, { status: 404 });
    return NextResponse.json({ section });
  } catch (error) {
    console.error("Failed to load section", error);
    return NextResponse.json({ error: "Impossible de charger la section." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const section = await prisma.bacSection.update({
      where: { id },
      data: {
        ...(typeof body.name === "string" ? { name: body.name.trim() } : {}),
        ...(typeof body.slug === "string" ? { slug: body.slug.trim() } : {}),
        ...(typeof body.active === "boolean" ? { active: body.active } : {}),
      },
    });
    return NextResponse.json({ section });
  } catch (error) {
    console.error("Failed to update section", error);
    return NextResponse.json({ error: "Impossible de modifier la section." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.bacSection.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete section", error);
    return NextResponse.json({ error: "Impossible de supprimer la section." }, { status: 500 });
  }
}
