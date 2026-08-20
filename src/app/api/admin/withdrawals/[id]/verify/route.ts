import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { WithdrawalStatus } from "@prisma/client";

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
  const status = body?.status as WithdrawalStatus;

  if (!status || !["APPROVED", "PAID", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Statut de retrait invalide." }, { status: 400 });
  }

  try {
    const withdrawal = await prisma.withdrawalRequest.update({
      where: { id },
      data: { status },
      include: {
        teacher: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
      },
    });

    return NextResponse.json({
      success: true,
      withdrawal,
      message: `Retrait mis à jour : ${status}`,
    });
  } catch (error) {
    console.error("Withdrawal status update failed", error);
    return NextResponse.json({ error: "Impossible de mettre à jour le retrait." }, { status: 500 });
  }
}
