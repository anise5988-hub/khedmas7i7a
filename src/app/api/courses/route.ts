import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { coursesStore } from "@/lib/server/courses-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subject = searchParams.get("subject") || undefined;
  const level = searchParams.get("level") || undefined;
  const search = searchParams.get("search") || undefined;
  const teacherId = searchParams.get("teacherId") || undefined;

  const courses = coursesStore.getAllCourses({
    subject,
    level,
    search,
    teacherId,
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

    if (!title || !description || !subject || !level) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    const price = Number(priceTnd) || 0;

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

    return NextResponse.json({ success: true, course: newCourse }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Format de requête invalide" }, { status: 400 });
  }
}
