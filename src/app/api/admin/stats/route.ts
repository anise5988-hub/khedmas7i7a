import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    // Return empty stats if not admin or unauthorized
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
        totalDepositedTnd: (totalDeposits._sum.amountMillimes ?? 0) / 1000,
      },
    });
  } catch (error) {
    console.error("Admin stats failed", error);
    return NextResponse.json({ error: "Erreur lors du calcul des statistiques." }, { status: 500 });
  }
}
