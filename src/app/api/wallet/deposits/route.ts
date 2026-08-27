import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { depositSchema } from "@/lib/validation/deposit";
import { fallbackStore } from "@/lib/server/fallback-store";
import { validateCoupon } from "@/lib/server/coupons";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
      include: { deposits: { orderBy: { createdAt: "desc" } } },
    });

    if (wallet?.deposits) {
      return NextResponse.json({ deposits: wallet.deposits });
    }
  } catch (error) {
    console.warn("Prisma deposits fetch failed, using fallback", error);
  }

  const fallbackDeposits = fallbackStore.getDeposits().filter((d) => d.userId === user.id);
  return NextResponse.json({ deposits: fallbackDeposits });
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

  const rawBody = await request.json().catch(() => null);
  const parsed = depositSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Montant, méthode ou référence invalide." }, { status: 400 });
  }

  const couponCode = typeof rawBody?.couponCode === "string" ? rawBody.couponCode.trim().toUpperCase() : null;
  if (couponCode) {
    const validation = await validateCoupon({
      code: couponCode,
      userId: user.id,
      context: "WALLET_DEPOSIT",
      amountMillimes: parsed.data.amountMillimes,
    });
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
  }

  try {
    let wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId: user.id, availableMillimes: 0, pendingMillimes: 0 },
      });
    }

    const deposit = await prisma.walletDeposit.create({
      data: {
        walletId: wallet.id,
        method: parsed.data.method,
        amountMillimes: parsed.data.amountMillimes,
        reference: parsed.data.reference,
        status: "PENDING",
        couponCode,
      },
    });

    return NextResponse.json(
      {
        status: deposit.status,
        id: deposit.id,
        message: "Demande de recharge reçue avec succès. Le solde sera crédité après validation de la référence.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.warn("Prisma deposit create failed, saving to in-memory store", error);

    const fallbackDeposit = {
      id: `dep_${Date.now()}`,
      userId: user.id,
      method: parsed.data.method,
      amountMillimes: parsed.data.amountMillimes,
      amountTnd: parsed.data.amountMillimes / 1000,
      reference: parsed.data.reference,
      status: "PENDING",
      createdAt: new Date(),
    };

    fallbackStore.addDeposit(fallbackDeposit);

    return NextResponse.json(
      {
        status: "PENDING",
        id: fallbackDeposit.id,
        message: "Demande de recharge reçue avec succès. Le solde sera crédité après validation de la référence.",
      },
      { status: 201 },
    );
  }
}
