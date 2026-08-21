import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { fallbackStore } from "@/lib/server/fallback-store";

export async function GET() {
  try {
    const [studentsCount, teachersCount, bookingsAggregate, reviewsAggregate] =
      await Promise.all([
        prisma.user.count({ where: { role: "STUDENT" } }),
        prisma.teacherProfile.count(),
        prisma.booking.aggregate({
          _sum: { durationMinutes: true },
          where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
        }),
        prisma.review.aggregate({
          _avg: { rating: true },
          _count: true,
        }),
      ]);

    const totalMinutes = bookingsAggregate._sum.durationMinutes ?? 0;
    const hoursTaught = Math.round(totalMinutes / 60);

    const avgRating = reviewsAggregate._avg.rating ?? 5.0;
    const totalReviews = reviewsAggregate._count ?? 0;
    const satisfactionRate = totalReviews > 0 ? Number(((avgRating / 5) * 100).toFixed(1)) : 100;

    return NextResponse.json({
      studentsCount,
      teachersCount,
      hoursTaught,
      satisfactionRate,
    });
  } catch (error) {
    console.warn("Public stats fetch fallback used", error);
    const fallbackUsers = fallbackStore.getAllUsers();
    const studentsCount = fallbackUsers.filter((u) => u.role === "STUDENT").length;
    const teachersCount = fallbackStore.getAllTeachers().length;

    return NextResponse.json({
      studentsCount,
      teachersCount,
      hoursTaught: 0,
      satisfactionRate: 100,
    });
  }
}
