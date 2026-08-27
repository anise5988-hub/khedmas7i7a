import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

type DailyCount = { day: Date; count: bigint };
type DailySum = { day: Date; total: bigint | null };

function fillDays(rows: { day: Date; value: number }[], days: number) {
  const byDay = new Map(rows.map((r) => [r.day.toISOString().slice(0, 10), r.value]));
  const out: { date: string; value: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, value: byDay.get(key) ?? 0 });
  }
  return out;
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  try {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 29);

    const [registrationRows, bookingRows, revenueRows, subjectRows, statusRows, governorateRows] = await Promise.all([
      prisma.$queryRaw<DailyCount[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
        FROM "User" WHERE "createdAt" >= ${since}
        GROUP BY 1 ORDER BY 1
      `,
      prisma.$queryRaw<DailyCount[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
        FROM "Booking" WHERE "createdAt" >= ${since}
        GROUP BY 1 ORDER BY 1
      `,
      prisma.$queryRaw<DailySum[]>`
        SELECT date_trunc('day', "createdAt") AS day, SUM("amountMillimes")::bigint AS total
        FROM "WalletDeposit" WHERE "createdAt" >= ${since} AND status = 'PAID'
        GROUP BY 1 ORDER BY 1
      `,
      prisma.teacherSubject.groupBy({
        by: ["subject"],
        _count: { subject: true },
        orderBy: { _count: { subject: "desc" } },
        take: 8,
      }),
      prisma.booking.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      prisma.teacherProfile.groupBy({
        by: ["governorate"],
        _count: { governorate: true },
        where: { governorate: { not: null } },
        orderBy: { _count: { governorate: "desc" } },
        take: 8,
      }),
    ]);

    return NextResponse.json({
      registrationsByDay: fillDays(registrationRows.map((r) => ({ day: r.day, value: Number(r.count) })), 30),
      bookingsByDay: fillDays(bookingRows.map((r) => ({ day: r.day, value: Number(r.count) })), 30),
      revenueTndByDay: fillDays(revenueRows.map((r) => ({ day: r.day, value: Number(r.total ?? 0) / 1000 })), 30),
      popularSubjects: subjectRows.map((r) => ({ subject: r.subject, count: r._count.subject })),
      bookingStatusDistribution: statusRows.map((r) => ({ status: r.status, count: r._count.status })),
      teachersByGovernorate: governorateRows.map((r) => ({ governorate: r.governorate ?? "Non renseigné", count: r._count.governorate })),
    });
  } catch (error) {
    console.error("Admin analytics failed", error);
    return NextResponse.json({ error: "Impossible de calculer les statistiques." }, { status: 500 });
  }
}
