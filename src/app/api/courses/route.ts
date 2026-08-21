import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { coursesStore } from "@/lib/server/courses-store";
import { notifyUser } from "@/lib/server/notification-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subject = searchParams.get("subject") || undefined;
  const level = searchParams.get("level") || undefined;
  const search = searchParams.get("search") || undefined;
  const teacherId = searchParams.get("teacherId") || undefined;
  const user = await getCurrentUser(request);

  // Private teacher listings must be scoped to the authenticated teacher (or admin).
  let effectiveTeacherId = teacherId;
  if (teacherId) {
    if (user && user.role === "TEACHER") {
      effectiveTeacherId = user.id;
    } else if (!user || (user.id !== teacherId && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
  }

  const courses = coursesStore.getAllCourses({
    subject,
    level,
    search,
    teacherId: effectiveTeacherId,
  });

  return NextResponse.json({ courses });
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Réservé aux enseignants" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, description, subject, level, language, priceTnd, visibility, thumbnailUrl, sections } = body;

    if (![title, description, subject, level].every((value) => typeof value === "string" && value.trim())) {
      return NextResponse.json({ error: "Le titre, la description, la matière et le niveau sont obligatoires." }, { status: 400 });
    }

    const price = Number(priceTnd);
    if (!Number.isFinite(price) || price < 0 || price > 10000) {
      return NextResponse.json({ error: "Le tarif doit être compris entre 0 et 10 000 DT." }, { status: 400 });
    }

    const allowedVisibility = ["PUBLIC", "LOCKED", "PRIVATE", "DRAFT"];
    if (visibility && !allowedVisibility.includes(visibility)) {
      return NextResponse.json({ error: "Visibilité de cours invalide." }, { status: 400 });
    }

    if (!Array.isArray(sections) || sections.length === 0 || !sections.every((section) =>
      section && typeof section.title === "string" && section.title.trim() && Array.isArray(section.lessons) &&
      section.lessons.length > 0 && section.lessons.every((lesson: { title?: unknown; durationMinutes?: unknown; videoUrl?: unknown }) =>
        typeof lesson.title === "string" && lesson.title.trim() && Number.isInteger(Number(lesson.durationMinutes)) &&
        Number(lesson.durationMinutes) >= 1 && typeof lesson.videoUrl === "string" && lesson.videoUrl.trim()
      )
    )) {
      return NextResponse.json({ error: "Ajoutez au moins un module et une leçon vidéo valide." }, { status: 400 });
    }

    const newCourse = coursesStore.createCourse({
      teacherId: user.id,
      teacherName: `${user.firstName} ${user.lastName}`,
      teacherSlug: user.firstName.toLowerCase() + "-" + user.lastName.toLowerCase(),
      title,
      description,
      subject,
      level,
      language: language || "Français",
      priceTnd: price,
      amountMillimes: price * 1000,
      visibility: visibility || "LOCKED",
      thumbnailUrl: thumbnailUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80",
      rating: 5.0,
      reviewCount: 0,
      studentCount: 0,
      sections: sections || [],
    });

    await notifyUser({
      userId: user.id,
      type: "COURSE_PUBLISHED",
      title: "Cours publié avec succès ! 🚀",
      message: `Votre cours "${title}" (${price > 0 ? `${price} DT` : "Gratuit"}) a été publié et est accessible sur la plateforme.`,
      emailSubject: `Votre cours "${title}" est en ligne sur Profy`,
      link: `/courses/${newCourse.id}`,
      dedupeKey: `course_published:${newCourse.id}`,
    });

    return NextResponse.json({ success: true, course: newCourse }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Format de requête invalide" }, { status: 400 });
  }
}
