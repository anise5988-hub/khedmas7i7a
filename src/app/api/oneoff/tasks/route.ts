import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

/**
 * ONE-OFF maintenance endpoint — will be deleted right after it runs.
 * Token-gated so nobody but the operator can trigger it.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("token") !== process.env.AUTH_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const out: Record<string, unknown> = {};

  // 1. Confirm the most recently created booking.
  const last = await prisma.booking.findFirst({
    orderBy: { createdAt: "desc" },
    include: {
      teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
      student: { select: { firstName: true, lastName: true } },
    },
  });
  if (last) {
    await prisma.booking.update({ where: { id: last.id }, data: { status: "CONFIRMED" } });
    out.lastBooking = {
      id: last.id,
      previousStatus: last.status,
      newStatus: "CONFIRMED",
      teacher: `${last.teacher.user.firstName} ${last.teacher.user.lastName}`,
      student: `${last.student.firstName} ${last.student.lastName}`,
      startsAt: last.startsAt,
    };
  }

  // 2. Rename any user whose name/email contains "benfajria" + "google"
  //    to "Benfajria Khouloud".
  const candidates = await prisma.user.findMany({
    where: {
      OR: [
        { firstName: { contains: "benfajria", mode: "insensitive" } },
        { lastName: { contains: "benfajria", mode: "insensitive" } },
        { email: { contains: "benfajria", mode: "insensitive" } },
      ],
    },
  });
  out.renamed = [];
  for (const u of candidates) {
    const fullName = `${u.firstName} ${u.lastName}`;
    if (/google/i.test(fullName) || /google/i.test(u.email)) {
      const updated = await prisma.user.update({
        where: { id: u.id },
        data: { firstName: "Benfajria", lastName: "Khouloud" },
      });
      out.renamed.push({ id: updated.id, email: updated.email, name: `${updated.firstName} ${updated.lastName}` });
    }
  }

  return NextResponse.json({ success: true, ...out });
}
