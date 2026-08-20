import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

  try {
    let wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
      include: {
        deposits: { orderBy: { createdAt: "desc" } },
        transactions: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId: user.id, availableMillimes: 0, pendingMillimes: 0 },
        include: { deposits: true, transactions: true },
      });
    }

    return NextResponse.json({
      wallet: {
        id: wallet.id,
        availableMillimes: wallet.availableMillimes,
        availableTnd: wallet.availableMillimes / 1000,
        pendingMillimes: wallet.pendingMillimes,
        pendingTnd: wallet.pendingMillimes / 1000,
        deposits: wallet.deposits.map((d) => ({
          id: d.id,
          method: d.method,
          amountMillimes: d.amountMillimes,
          amountTnd: d.amountMillimes / 1000,
          reference: d.reference,
          status: d.status,
          createdAt: d.createdAt,
        })),
        transactions: wallet.transactions.map((t) => ({
          id: t.id,
          type: t.type,
          amountMillimes: t.amountMillimes,
          amountTnd: t.amountMillimes / 1000,
          reference: t.reference,
          createdAt: t.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Wallet fetch failed", error);
    return NextResponse.json({ error: "Impossible de charger le wallet." }, { status: 500 });
  }
}
