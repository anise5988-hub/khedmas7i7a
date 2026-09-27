import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { parsePortfolioInput, getPublicPortfolio } from "@/lib/server/portfolio";

export const runtime = "nodejs";

/**
 * GET /api/teacher/portfolio?teacherId=<id|slug>&scope=manage
 *
 * Public read by default (only published items of an APPROVED teacher).
 * With `scope=manage` the owner (or an admin) gets every item, drafts
 * included, so the management screen can restore them.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get("teacherId");
  const scope = searchParams.get("scope");

  if (!teacherId) {
    return NextResponse.json({ error: "Identifiant du professeur requis." }, { status: 400 });
  }

  try {
    const teacher = await prisma.teacherProfile.findFirst({
      where: { OR: [{ id: teacherId }, { slug: teacherId }, { userId: teacherId }] },
      select: { id: true, userId: true, verificationStatus: true },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Professeur introuvable." }, { status: 404 });
    }

    if (scope === "manage") {
      const user = await getCurrentUser(request);
      const canManage = user && (user.id === teacher.userId || user.role === "ADMIN");
      if (!canManage) {
        return NextResponse.json({ error: "Accès réservé au propriétaire du portfolio." }, { status: 403 });
      }

      const items = await prisma.teacherPortfolioItem.findMany({
        where: { teacherId: teacher.id },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      });
      return NextResponse.json({ items });
    }

    if (teacher.verificationStatus !== "APPROVED") {
      return NextResponse.json({ items: [] });
    }

    const items = await getPublicPortfolio(teacher.id);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Portfolio fetch failed", error);
    return NextResponse.json({ error: "Impossible de charger le portfolio." }, { status: 500 });
  }
}

/**
 * POST /api/teacher/portfolio
 *
 * Adds an example of the teacher's work. The owner is always resolved from
 * the session, never from the payload, so a teacher can't publish work on
 * someone else's profile.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }
  if (user.role !== "TEACHER" && user.role !== "ADMIN" && !user.teacher) {
    return NextResponse.json({ error: "Accès réservé aux professeurs." }, { status: 403 });
  }

  const teacher = user.teacher
    ? { id: user.teacher.id }
    : await prisma.teacherProfile.findUnique({ where: { userId: user.id }, select: { id: true } });

  if (!teacher) {
    return NextResponse.json({ error: "Profil enseignant introuvable." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parsePortfolioInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const count = await prisma.teacherPortfolioItem.count({ where: { teacherId: teacher.id } });
    if (count >= 40) {
      return NextResponse.json(
        { error: "Vous avez atteint la limite de 40 réalisations. Supprimez-en une pour en ajouter une nouvelle." },
        { status: 409 },
      );
    }

    const item = await prisma.teacherPortfolioItem.create({
      data: { ...parsed.value, teacherId: teacher.id, sortOrder: count },
    });

    return NextResponse.json(
      { success: true, item, message: "Réalisation ajoutée à votre portfolio." },
      { status: 201 },
    );
  } catch (error) {
    console.error("Portfolio creation failed", error);
    return NextResponse.json({ error: "Impossible d'enregistrer cette réalisation." }, { status: 500 });
  }
}