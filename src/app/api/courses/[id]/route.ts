import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { coursesStore } from "@/lib/server/courses-store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser(request);
  const course = coursesStore.getCourseById(id);

  if (!course) {
    return NextResponse.json({ error: "Cours introuvable" }, { status: 404 });
  }

  const isTeacher = user?.id === course.teacherId || user?.role === "ADMIN";
  const hasAccess = isTeacher || (user ? coursesStore.hasAccess(id, user.id) : course.priceTnd === 0);

  // Filter content if user does not have full access
  const sanitizedCourse = {
    ...course,
    sections: course.sections.map((sec) => ({
      ...sec,
      lessons: sec.lessons.map((les) => {
        if (hasAccess || les.isFreePreview) {
          return les;
        }
        // Protect locked video content
        return {
          id: les.id,
          title: les.title,
          durationMinutes: les.durationMinutes,
          isFreePreview: false,
          description: "🔒 Contenu réservé. Débloquez ce cours pour accéder à la leçon complète.",
          videoUrl: undefined,
          resources: undefined,
        };
      }),
    })),
  };

  const progress = user ? coursesStore.getProgress(id, user.id) : null;

  return NextResponse.json({
    course: sanitizedCourse,
    hasAccess,
    isTeacher,
    progress,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser(request);
  const course = coursesStore.getCourseById(id);

  if (!course) {
    return NextResponse.json({ error: "Cours introuvable" }, { status: 404 });
  }

  if (user?.id !== course.teacherId && user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const allowedFields = ["title", "description", "subject", "level", "language", "priceTnd", "visibility", "thumbnailUrl", "sections"];
    const updates = Object.fromEntries(Object.entries(body).filter(([key]) => allowedFields.includes(key)));

    if ("priceTnd" in updates && (!Number.isFinite(Number(updates.priceTnd)) || Number(updates.priceTnd) < 0)) {
      return NextResponse.json({ error: "Tarif invalide" }, { status: 400 });
    }
    if ("visibility" in updates && !["PUBLIC", "LOCKED", "PRIVATE", "DRAFT"].includes(String(updates.visibility))) {
      return NextResponse.json({ error: "Visibilité invalide" }, { status: 400 });
    }

    const updated = coursesStore.updateCourse(id, updates);
    return NextResponse.json({ success: true, course: updated });
  } catch {
    return NextResponse.json({ error: "Erreur de mise à jour" }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser(request);
  const course = coursesStore.getCourseById(id);

  if (!course) {
    return NextResponse.json({ error: "Cours introuvable" }, { status: 404 });
  }

  if (user?.id !== course.teacherId && user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  coursesStore.deleteCourse(id);
  return NextResponse.json({ success: true, message: "Cours supprimé" });
}
