import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }

  try {
    const favorites = await prisma.favorite.findMany({
      where: { studentId: user.id },
      include: {
        teacher: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            subjects: true,
            reviews: { select: { rating: true } },
          },
        },
      },
    });

    const formatted = favorites.map((f) => {
      const avgRating =
        f.teacher.reviews.length > 0
          ? Number((f.teacher.reviews.reduce((acc, r) => acc + r.rating, 0) / f.teacher.reviews.length).toFixed(1))
          : 5.0;

      return {
        id: f.teacher.id,
        slug: f.teacher.slug,
        avatarUrl: f.teacher.avatarUrl,
        name: `${f.teacher.user.firstName} ${f.teacher.user.lastName}`.trim(),
        title: f.teacher.title || "Professeur particulier",
        bio: f.teacher.bio || "",
        rate: f.teacher.hourlyRateMillimes / 1000,
        rating: avgRating,
        reviewsCount: f.teacher.reviews.length,
        subjects: f.teacher.subjects.map((s) => s.subject),
        city: f.teacher.city || f.teacher.governorate || "Tunis",
        verificationStatus: f.teacher.verificationStatus,
      };
    });

    return NextResponse.json({ favorites: formatted });
  } catch (error) {
    console.error("Favorites fetch failed", error);
    return NextResponse.json({ favorites: [] });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const teacherId = body?.teacherId;
  if (!teacherId) {
    return NextResponse.json({ error: "ID professeur requis." }, { status: 400 });
  }

  try {
    const existing = await prisma.favorite.findUnique({
      where: {
        studentId_teacherId: {
          studentId: user.id,
          teacherId,
        },
      },
    });

    if (existing) {
      await prisma.favorite.delete({
        where: {
          studentId_teacherId: {
            studentId: user.id,
            teacherId,
          },
        },
      });
      return NextResponse.json({ success: true, favorited: false, message: "Retiré des favoris." });
    } else {
      await prisma.favorite.create({
        data: {
          studentId: user.id,
          teacherId,
        },
      });
      return NextResponse.json({ success: true, favorited: true, message: "Ajouté aux favoris !" });
    }
  } catch (error) {
    console.error("Favorites toggle failed", error);
    return NextResponse.json({ error: "Impossible de modifier les favoris." }, { status: 500 });
  }
}
