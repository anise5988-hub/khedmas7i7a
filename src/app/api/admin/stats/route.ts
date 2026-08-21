import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  try {
    const [
      totalUsers,
      studentsCount,
      teachersCount,
      pendingTeachersCount,
      approvedTeachersCount,
      totalBookings,
      pendingWithdrawals,
      pendingDeposits,
      totalDeposits,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.user.count({ where: { role: "TEACHER" } }),
      prisma.teacherProfile.count({ where: { verificationStatus: "PENDING" } }),
      prisma.teacherProfile.count({ where: { verificationStatus: "APPROVED" } }),
      prisma.booking.count(),
      prisma.withdrawalRequest.count({ where: { status: "PENDING" } }),
      prisma.walletDeposit.count({ where: { status: "PENDING" } }),
      prisma.walletDeposit.aggregate({
        _sum: { amountMillimes: true },
        where: { status: "PAID" },
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalUsers,
        studentsCount,
        teachersCount,
        pendingTeachersCount,
        approvedTeachersCount,
        totalBookings,
        pendingWithdrawals,
        pendingDeposits,
        totalDepositedTnd: ((totalDeposits as { _sum: { amountMillimes: number | null } })._sum?.amountMillimes ?? 0) / 1000,
      },
    });
  } catch (error) {
    console.error("Admin stats failed", error);
    return NextResponse.json({
      stats: {
        totalUsers: 0,
        studentsCount: 0,
        teachersCount: 0,
        pendingTeachersCount: 0,
        approvedTeachersCount: 0,
        totalBookings: 0,
        pendingWithdrawals: 0,
        pendingDeposits: 0,
        totalDepositedTnd: 0,
      },
    });
  }
}
