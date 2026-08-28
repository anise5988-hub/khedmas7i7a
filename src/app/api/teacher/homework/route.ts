import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { notifyUser } from "@/lib/server/notification-service";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user?.teacher) {
    return NextResponse.json({ error: "Réservé aux enseignants." }, { status: 403 });
  }

  const homework = await prisma.homework.findMany({
    where: { teacherId: user.teacher.id },
    include: { student: { select: { firstName: true, lastName: true } }, submission: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    homework: homework.map((h) => ({
      id: h.id,
      title: h.title,
      description: h.description,
      fileUrl: h.fileUrl,
      fileName: h.fileName,
      deadline: h.deadline,
      createdAt: h.createdAt,
      studentId: h.studentId,
      studentName: `${h.student.firstName} ${h.student.lastName}`.trim(),
      submission: h.submission,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user?.teacher) {
    return NextResponse.json({ error: "Réservé aux enseignants." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const studentId = String(body?.studentId || "");
  const title = String(body?.title || "").trim();
  const description = String(body?.description || "").trim();

  if (!studentId || !title || !description) {
    return NextResponse.json({ error: "Élève, titre et description sont requis." }, { status: 400 });
  }

  // A teacher may only assign homework to a student they've actually
  // taught — never trust the client-supplied studentId on its own.
  const hasBooking = await prisma.booking.findFirst({
    where: { teacherId: user.teacher.id, studentId },
    select: { id: true },
  });
  if (!hasBooking) {
    return NextResponse.json({ error: "Cet élève n'a jamais réservé de séance avec vous." }, { status: 403 });
  }

  const bookingId = body?.bookingId ? String(body.bookingId) : null;
  if (bookingId) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, teacherId: user.teacher.id, studentId },
      select: { id: true },
    });
    if (!booking) {
      return NextResponse.json({ error: "Séance introuvable pour cet élève." }, { status: 400 });
    }
  }

  const homework = await prisma.homework.create({
    data: {
      teacherId: user.teacher.id,
      studentId,
      bookingId,
      title,
      description,
      fileUrl: body?.fileUrl ? String(body.fileUrl) : null,
      fileName: body?.fileName ? String(body.fileName) : null,
      deadline: body?.deadline ? new Date(body.deadline) : null,
    },
  });

  await notifyUser({
    userId: studentId,
    type: "NEW_MESSAGE",
    title: "Nouveau devoir assigné",
    message: `${user.firstName} ${user.lastName} vous a assigné un devoir : "${title}".`,
    emailSubject: "Vous avez un nouveau devoir sur Profy",
    link: "/dashboard/homework",
    dedupeKey: `homework:${homework.id}:assigned`,
  });

  return NextResponse.json({ success: true, homework }, { status: 201 });
}
