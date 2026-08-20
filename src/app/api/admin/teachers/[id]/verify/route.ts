import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { VerificationStatus } from "@prisma/client";

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
  const status = body?.status as VerificationStatus;

  const validStatuses: VerificationStatus[] = [
    "PENDING",
    "UNDER_REVIEW",
    "APPROVED",
    "REJECTED",
    "SUSPENDED",
  ];

  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Statut de vérification invalide." }, { status: 400 });
  }

  try {
    const updatedTeacher = await prisma.teacherProfile.update({
      where: { id },
      data: { verificationStatus: status },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    return NextResponse.json({
      success: true,
      teacher: {
        id: updatedTeacher.id,
        status: updatedTeacher.verificationStatus,
        name: `${updatedTeacher.user.firstName} ${updatedTeacher.user.lastName}`,
      },
      message: `Statut du professeur mis à jour : ${status}`,
    });
  } catch (error) {
    console.error("Teacher verification update failed", error);
    return NextResponse.json({ error: "Impossible de modifier le statut." }, { status: 500 });
  }
}
