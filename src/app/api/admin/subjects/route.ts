import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ subjects });
  } catch (error) {
    console.error("Failed to load subjects", error);
    return NextResponse.json({ subjects: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, cycle, section, active = true } = body;

    if (!name || !cycle) {
      return NextResponse.json({ error: "Nom et cycle obligatoires." }, { status: 400 });
    }

    const subject = await prisma.subject.create({
      data: {
        name: String(name).trim(),
        cycle: String(cycle).trim(),
        section: section ? String(section).trim() : null,
        active: Boolean(active),
      },
    });

    return NextResponse.json({ subject }, { status: 201 });
  } catch (error) {
    console.error("Failed to create subject", error);
    return NextResponse.json({ error: "Impossible de créer la matière." }, { status: 500 });
  }
}
