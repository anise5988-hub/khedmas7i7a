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
  const breakdown = calculateTeacherWithdrawal(parsed.data.amountInMillimes);

  if (user && user.teacher) {
    try {
      const withdrawal = await prisma.withdrawalRequest.create({
        data: {
          teacherId: user.teacher.id,
          requestedMillimes: breakdown.requestedAmountInMillimes,
          feeMillimes: breakdown.feeAmountInMillimes,
          payoutMillimes: breakdown.payoutAmountInMillimes,
          method: parsed.data.method,
          accountDetails: parsed.data.accountDetails,
          status: "PENDING",
        },
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
      console.error("Withdrawal record failed", error);
    }
  }

  return NextResponse.json(
    {
      status: "PENDING",
      method: parsed.data.method,
      ...breakdown,
    },
    { status: 201 },
  );
}
