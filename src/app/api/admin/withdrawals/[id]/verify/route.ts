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
    const withdrawal = await prisma.$transaction(async (tx) => {
      const existing = await tx.withdrawalRequest.findUnique({
        where: { id },
        include: { teacher: { select: { userId: true } } },
      });
      if (!existing) throw new Error("NOT_FOUND");

      // Funds were reserved (available -> pending) when the request was
      // created. Only settle the wallet once, on the transition into a
      // terminal state, so re-verifying the same request twice can't
      // double-refund or double-finalize.
      if (existing.status !== "REJECTED" && existing.status !== "PAID") {
        if (status === "REJECTED") {
          await tx.wallet.updateMany({
            where: { userId: existing.teacher.userId },
            data: {
              pendingMillimes: { decrement: existing.requestedMillimes },
              availableMillimes: { increment: existing.requestedMillimes },
            },
          });
        } else if (status === "PAID") {
          await tx.wallet.updateMany({
            where: { userId: existing.teacher.userId },
            data: { pendingMillimes: { decrement: existing.requestedMillimes } },
          });
        }
      }

      return tx.withdrawalRequest.update({
        where: { id },
        data: { status },
        include: {
          teacher: {
            include: { user: { select: { firstName: true, lastName: true, email: true } } },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      withdrawal,
      message: `Retrait mis à jour : ${status}`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Retrait introuvable." }, { status: 404 });
    }
    console.error("Withdrawal status update failed", error);
    return NextResponse.json({ error: "Impossible de mettre à jour le retrait." }, { status: 500 });
  }
}
