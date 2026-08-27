import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { calculateTeacherWithdrawal } from "@/lib/finance/withdrawal";
import { withdrawalRequestSchema } from "@/lib/validation/withdrawal";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

  try {
    if (user.role === "ADMIN") {
      const withdrawals = await prisma.withdrawalRequest.findMany({
        include: {
          teacher: {
            include: {
              user: { select: { firstName: true, lastName: true, email: true, phone: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ withdrawals });
    }

    if (!user.teacher) {
      return NextResponse.json({ error: "Profil professeur introuvable." }, { status: 404 });
    }

    const withdrawals = await prisma.withdrawalRequest.findMany({
      where: { teacherId: user.teacher.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ withdrawals });
  } catch (error) {
    console.error("Withdrawals fetch failed", error);
    return NextResponse.json({ error: "Impossible de charger les retraits." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = withdrawalRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données de retrait invalides.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const user = await getCurrentUser(request);
  if (!user || !user.teacher) {
    return NextResponse.json({ error: "Profil professeur requis pour demander un retrait." }, { status: 403 });
  }

  const breakdown = calculateTeacherWithdrawal(parsed.data.amountInMillimes);

  try {
    const withdrawal = await prisma.$transaction(async (tx) => {
      // Reserve the funds up front (available -> pending) so concurrent
      // withdrawal requests can never together exceed what the teacher
      // actually earned.
      const reservation = await tx.wallet.updateMany({
        where: { userId: user.id, availableMillimes: { gte: breakdown.requestedAmountInMillimes } },
        data: {
          availableMillimes: { decrement: breakdown.requestedAmountInMillimes },
          pendingMillimes: { increment: breakdown.requestedAmountInMillimes },
        },
      });

      if (reservation.count !== 1) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const wallet = await tx.wallet.findUnique({ where: { userId: user.id } });
      if (!wallet) throw new Error("WALLET_NOT_FOUND");

      const created = await tx.withdrawalRequest.create({
        data: {
          teacherId: user.teacher!.id,
          requestedMillimes: breakdown.requestedAmountInMillimes,
          feeMillimes: breakdown.feeAmountInMillimes,
          payoutMillimes: breakdown.payoutAmountInMillimes,
          method: parsed.data.method,
          accountDetails: parsed.data.accountDetails,
          status: "PENDING",
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "WITHDRAWAL",
          amountMillimes: -breakdown.requestedAmountInMillimes,
          reference: `WD-REQ-${created.id}`,
        },
      });

      return created;
    });

    return NextResponse.json(
      {
        id: withdrawal.id,
        status: withdrawal.status,
        method: withdrawal.method,
        ...breakdown,
        message: "Demande de retrait enregistrée. L'administration procèdera au virement sous 24h.",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
      return NextResponse.json({ error: "Solde disponible insuffisant pour ce retrait." }, { status: 400 });
    }
    console.error("Withdrawal record failed", error);
    return NextResponse.json({ error: "Impossible d'enregistrer la demande de retrait." }, { status: 500 });
  }
}
