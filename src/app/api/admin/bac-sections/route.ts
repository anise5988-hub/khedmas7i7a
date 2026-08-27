import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  try {
    const sections = await prisma.bacSection.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ sections });
  } catch (error) {
    console.error("Failed to load sections", error);
    return NextResponse.json({ sections: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, slug, active = true } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "Nom et slug obligatoires." }, { status: 400 });
    }

    const section = await prisma.bacSection.create({
      data: {
        name: String(name).trim(),
        slug: String(slug).trim(),
        active: Boolean(active),
      },
    });

    return NextResponse.json({ section }, { status: 201 });
  } catch (error) {
    console.error("Failed to create section", error);
    return NextResponse.json({ error: "Impossible de créer la section." }, { status: 500 });
  }
}
