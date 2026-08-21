import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  try {
    const [studentsCount, approvedTeachersCount, bookingsAggregate, reviewsAggregate] =
      await Promise.all([
        prisma.user.count({ where: { role: "STUDENT" } }),
        prisma.teacherProfile.count({ where: { verificationStatus: "APPROVED" } }),
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
      teachersCount: approvedTeachersCount,
      hoursTaught,
      satisfactionRate,
    });
  } catch (error) {
    console.warn("Public stats fetch fallback used", error);
    return NextResponse.json({
      studentsCount: 0,
      teachersCount: 0,
      hoursTaught: 0,
      satisfactionRate: 100,
    });
  }
}
