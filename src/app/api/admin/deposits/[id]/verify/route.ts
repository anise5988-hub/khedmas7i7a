import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { PaymentStatus } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const status = body?.status as PaymentStatus;

  if (!status || !["PAID", "FAILED", "CANCELLED"].includes(status)) {
    return NextResponse.json({ error: "Statut de paiement invalide." }, { status: 400 });
  }

  try {
    const deposit = await prisma.walletDeposit.findUnique({ where: { id } });
    if (!deposit) return NextResponse.json({ error: "Dépôt introuvable." }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.walletDeposit.update({
        where: { id },
        data: { status },
      });

      if (status === "PAID" && deposit.status !== "PAID") {
        await tx.wallet.update({
          where: { id: deposit.walletId },
          data: { availableMillimes: { increment: deposit.amountMillimes } },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: deposit.walletId,
            type: "DEPOSIT",
            amountMillimes: deposit.amountMillimes,
            reference: `DEP-${deposit.reference}`,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: status === "PAID" ? "Dépôt approuvé et solde crédité !" : "Dépôt rejeté.",
    });
  } catch (error) {
    console.error("Deposit verification failed", error);
    return NextResponse.json({ error: "Impossible de traiter le dépôt." }, { status: 500 });
  }
}
