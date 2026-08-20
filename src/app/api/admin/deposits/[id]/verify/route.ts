import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { PaymentStatus } from "@prisma/client";
import { notifyUser } from "@/lib/server/notification-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser(request);
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

    const depositWallet = await prisma.wallet.findUnique({ where: { id: deposit.walletId }, select: { userId: true } });
    if (depositWallet?.userId) {
      if (status === "PAID") {
        await notifyUser({
          userId: depositWallet.userId,
          type: "PAYMENT_SUCCESS",
          title: "Recharge portefeuille validée ! 💳",
          message: `Votre recharge de ${(deposit.amountMillimes / 1000).toFixed(1)} DT a été validée et créditée à votre portefeuille.`,
          emailSubject: `Votre recharge de ${(deposit.amountMillimes / 1000).toFixed(1)} DT a été validée`,
          link: "/dashboard/wallet",
          dedupeKey: `deposit_verified:${deposit.id}:${status}`,
        });
      } else {
        await notifyUser({
          userId: depositWallet.userId,
          type: "PAYMENT_FAILED",
          title: "Recharge portefeuille non validée",
          message: `Votre demande de recharge (${deposit.reference}) n'a pas pu être validée par l'administration.`,
          emailSubject: `Mise à jour concernant votre recharge (${deposit.reference})`,
          link: "/dashboard/wallet",
          dedupeKey: `deposit_verified:${deposit.id}:${status}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: status === "PAID" ? "Dépôt approuvé et solde crédité !" : "Dépôt rejeté.",
    });
  } catch (error) {
    console.error("Deposit verification failed", error);
    return NextResponse.json({ error: "Impossible de traiter le dépôt." }, { status: 500 });
  }
}
