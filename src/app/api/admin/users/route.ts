import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        wallet: { select: { availableMillimes: true } },
        teacher: { select: { verificationStatus: true, hourlyRateMillimes: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        email: u.email,
        phone: u.phone ?? "—",
        role: u.role,
        createdAt: u.createdAt,
        walletBalanceTnd: u.wallet ? u.wallet.availableMillimes / 1000 : 0,
        teacherStatus: u.teacher?.verificationStatus ?? null,
      })),
    });
  } catch (error) {
    console.error("Admin users fetch failed", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
