import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  try {
    const levels = await prisma.educationLevel.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({ levels });
  } catch (error) {
    console.error("Failed to load levels", error);
    return NextResponse.json({ levels: [] });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, slug, cycle, sortOrder = 0, active = true } = body;

    if (!name || !slug || !cycle) {
      return NextResponse.json({ error: "Nom, slug et cycle obligatoires." }, { status: 400 });
    }

    const level = await prisma.educationLevel.create({
      data: {
        name: String(name).trim(),
        slug: String(slug).trim(),
        cycle: String(cycle).trim(),
        sortOrder: Number(sortOrder),
        active: Boolean(active),
      },
    });

    return NextResponse.json({ level }, { status: 201 });
  } catch (error) {
    console.error("Failed to create level", error);
    return NextResponse.json({ error: "Impossible de créer le niveau." }, { status: 500 });
  }
}
