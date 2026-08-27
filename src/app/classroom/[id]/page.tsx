import Link from "next/link";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { ClassroomClient } from "./classroom-client";

function DeniedScreen({ title, message }: { title: string; message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#101b2d] px-6 text-center text-white">
      <div className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-slate-300">{message}</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-2xl bg-[#0d8d78] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0b7866]"
        >
          Retour au tableau de bord
        </Link>
      </div>
    </main>
  );
}

export default async function ClassroomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return (
      <DeniedScreen
        title="Connexion requise"
        message="Vous devez être connecté pour accéder à cette salle de révision."
      />
    );
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      teacher: {
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  });

  if (!booking) {
    return (
      <DeniedScreen
        title="Séance introuvable"
        message="Cette réservation n'existe pas ou a été supprimée."
      />
    );
  }

  // A user may only enter the classroom for a booking they are actually
  // part of. This is the only check that matters — the frontend never
  // decides who can join a private session.
  const isStudent = user.id === booking.studentId;
  const isTeacher = user.id === booking.teacher.userId;
  const isAdmin = user.role === "ADMIN";

  if (!isStudent && !isTeacher && !isAdmin) {
    return (
      <DeniedScreen
        title="Accès refusé"
        message="Vous ne faites pas partie de cette séance et ne pouvez pas rejoindre cette salle."
      />
    );
  }

  if (booking.status === "CANCELLED") {
    return (
      <DeniedScreen
        title="Séance annulée"
        message="Cette séance a été annulée. La salle de révision n'est plus accessible."
      />
    );
  }

  const otherPartyName = isStudent
    ? `${booking.teacher.user.firstName} ${booking.teacher.user.lastName}`
    : `${booking.student.firstName} ${booking.student.lastName}`;

  return (
    <ClassroomClient
      bookingId={booking.id}
      currentUserId={user.id}
      currentUserName={`${user.firstName} ${user.lastName}`}
      currentUserRole={isTeacher ? "tutor" : "student"}
      otherPartyName={otherPartyName}
      startsAt={booking.startsAt.toISOString()}
      durationMinutes={booking.durationMinutes}
    />
  );
}
