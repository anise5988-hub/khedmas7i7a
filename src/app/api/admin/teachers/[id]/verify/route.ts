import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { notificationsStore } from "@/lib/server/notifications-store";
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

    if (updatedTeacher.userId) {
      if (status === "APPROVED") {
        notificationsStore.addNotification({
          userId: updatedTeacher.userId,
          title: "Compte Enseignant Vérifié ! 🎉",
          message: "Félicitations, votre dossier enseignant a été validé par l'administration. Votre profil est désormais vérifié et visible sur ProfySpace.tn.",
          type: "SUCCESS",
          link: "/teacher/dashboard",
        });
      } else if (status === "REJECTED") {
        notificationsStore.addNotification({
          userId: updatedTeacher.userId,
          title: "Mise à jour de votre dossier Enseignant",
          message: "Votre demande de vérification nécessite des modifications. Rendez-vous sur votre espace pour mettre à jour vos informations.",
          type: "WARNING",
          link: "/teacher/dashboard",
        });
      } else if (status === "UNDER_REVIEW") {
        notificationsStore.addNotification({
          userId: updatedTeacher.userId,
          title: "Dossier Enseignant en cours d'examen ⏳",
          message: "Votre demande de vérification de profil est actuellement en cours d'analyse par l'administration.",
          type: "INFO",
          link: "/teacher/dashboard",
        });
      }
    }

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
