import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { coursesStore } from "@/lib/server/courses-store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id: courseId } = await params;
  try {
    const { lessonId } = await request.json();
    if (!lessonId) {
      return NextResponse.json({ error: "lessonId requis" }, { status: 400 });
    }

    const progress = coursesStore.markLessonComplete(courseId, user.id, lessonId);
    return NextResponse.json({ success: true, progress });
  } catch {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
}
