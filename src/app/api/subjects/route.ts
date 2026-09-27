import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { subjects as catalogSubjects } from "@/lib/domain/catalog";

/**
 * Public catalogue of active subjects, used by teacher onboarding/profile so any
 * subject an admin adds in the back-office is immediately selectable.
 *
 * Falls back to the static domain catalogue when the database has no subject
 * rows yet (or is unreachable), so the forms never render empty.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  try {
    const subjects = await prisma.subject.findMany({
      where: { active: true },
      orderBy: [{ cycle: "asc" }, { name: "asc" }],
      select: { id: true, name: true, cycle: true, section: true },
    });

    if (subjects.length === 0) {
      return NextResponse.json({
        subjects: catalogSubjects.map((name) => ({ id: null, name, cycle: null, section: null })),
        source: "catalog",
      });
    }

    return NextResponse.json({ subjects, source: "database" });
  } catch (error) {
    console.error("Failed to load active subjects", error);
    return NextResponse.json({
      subjects: catalogSubjects.map((name) => ({ id: null, name, cycle: null, section: null })),
      source: "catalog",
    });
  }
}