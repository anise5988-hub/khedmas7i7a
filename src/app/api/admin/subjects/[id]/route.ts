import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const { id } = await params;
  try {
    const subject = await prisma.subject.findUnique({ where: { id } });
    if (!subject) return NextResponse.json({ error: "Matière introuvable." }, { status: 404 });
    return NextResponse.json({ subject });
  } catch (error) {
    console.error("Failed to load subject", error);
    return NextResponse.json({ error: "Impossible de charger la matière." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = await request.json();
    const subject = await prisma.subject.update({
      where: { id },
      data: {
        ...(typeof body.name === "string" ? { name: body.name.trim() } : {}),
        ...(typeof body.cycle === "string" ? { cycle: body.cycle.trim() } : {}),
        ...(typeof body.section === "string" ? { section: body.section || null } : {}),
        ...(typeof body.active === "boolean" ? { active: body.active } : {}),
      },
    });
    return NextResponse.json({ subject });
  } catch (error) {
    console.error("Failed to update subject", error);
    return NextResponse.json({ error: "Impossible de modifier la matière." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const { id } = await params;
  try {
    await prisma.subject.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete subject", error);
    return NextResponse.json({ error: "Impossible de supprimer la matière." }, { status: 500 });
  }
}
