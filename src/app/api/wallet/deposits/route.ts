import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { depositSchema } from "@/lib/validation/deposit";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
      include: { deposits: { orderBy: { createdAt: "desc" } } },
    });

    return NextResponse.json({
      deposits: wallet?.deposits ?? [],
    });
  } catch (error) {
    console.error("Deposits fetch failed", error);
    return NextResponse.json({ error: "Impossible de charger les dépôts." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

  const parsed = depositSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Montant, méthode ou référence invalide." }, { status: 400 });
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
    console.error("Wallet deposit failed", error);
    return NextResponse.json(
      { error: "Cette référence existe déjà ou le service est indisponible." },
      { status: 409 },
    );
  }
}
