import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const deposits = await prisma.walletDeposit.findMany({
      include: {
        wallet: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      deposits: deposits.map((d) => ({
        id: d.id,
        walletId: d.walletId,
        userName: `${d.wallet.user.firstName} ${d.wallet.user.lastName}`,
        userEmail: d.wallet.user.email,
        userPhone: d.wallet.user.phone ?? "—",
        method: d.method,
        amountMillimes: d.amountMillimes,
        amountTnd: d.amountMillimes / 1000,
        reference: d.reference,
        status: d.status,
        createdAt: d.createdAt,
      })),
    });
  } catch (error) {
    console.error("Admin deposits fetch failed", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
