import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { notifyUser } from "@/lib/server/notification-service";
import { logAdminAction } from "@/lib/server/audit-log";
import { VerificationStatus } from "@prisma/client";

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

    await logAdminAction({
      actor: user,
      action: "TEACHER_VERIFICATION_CHANGED",
      targetType: "TeacherProfile",
      targetId: updatedTeacher.id,
      metadata: { status, teacherEmail: updatedTeacher.user.email },
    });

    if (updatedTeacher.userId) {
      if (status === "APPROVED") {
        await notifyUser({
          userId: updatedTeacher.userId,
          type: "PROFESSOR_VERIFIED",
          title: "Compte Enseignant Vérifié ! 🎉",
          message: "Félicitations, votre dossier enseignant a été validé. Votre profil est désormais vérifié sur Profy.",
          emailSubject: "Votre profil Professeur a été vérifié sur Profy",
          link: "/teacher/dashboard",
          dedupeKey: `teacher_verified:${updatedTeacher.id}:approved`,
        });
      } else if (status === "REJECTED") {
        await notifyUser({
          userId: updatedTeacher.userId,
          type: "PROFESSOR_REJECTED",
          title: "Mise à jour de votre dossier Enseignant",
          message: "Votre demande de vérification nécessite des modifications. Rendez-vous sur votre espace pour mettre à jour vos informations.",
          emailSubject: "Mise à jour de votre demande de vérification Profy",
          link: "/teacher/dashboard",
          dedupeKey: `teacher_verified:${updatedTeacher.id}:rejected`,
        });
      } else if (status === "UNDER_REVIEW") {
        await notifyUser({
          userId: updatedTeacher.userId,
          type: "PROFESSOR_VERIFIED",
          title: "Dossier Enseignant en cours d'examen ⏳",
          message: "Votre demande de vérification de profil est actuellement en cours d'analyse par l'administration.",
          emailSubject: "Votre dossier Professeur est en cours d'analyse",
          link: "/teacher/dashboard",
          dedupeKey: `teacher_verified:${updatedTeacher.id}:review`,
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
