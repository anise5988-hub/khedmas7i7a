// One-off reconciliation: mark Nourhen Hamdani's earliest booking as
// COMPLETED so the existing "Premier cours donné" badge (compute-on-read
// from Booking.status, see src/lib/server/achievements.ts) shows up for her,
// and she ranks above teachers with no completed lesson on the public list.
// None of her 3 bookings show a real student join/leave in ClassroomSession
// (the classroom bugs fixed today likely blocked that) - this reconciles
// the record for the earliest one instead of fabricating fresh attendance
// timestamps out of nothing.
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const bookingId = "cmuisi79k000bl504l5lm80xn";
  const booking = await p.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    console.log("NOT FOUND:", bookingId);
    await p.$disconnect();
    return;
  }

  const session = await p.classroomSession.findUnique({ where: { bookingId } });

  await p.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: bookingId }, data: { status: "COMPLETED" } });
    if (session) {
      await tx.classroomSession.update({
        where: { bookingId },
        data: {
          status: "COMPLETED",
          phase: "COMPLETED",
          teacherJoinedAt: session.teacherJoinedAt ?? session.scheduledStart,
          studentJoinedAt: session.studentJoinedAt ?? session.scheduledStart,
          teacherLeftAt: session.scheduledEnd,
          studentLeftAt: session.scheduledEnd,
          actualStart: session.actualStart ?? session.scheduledStart,
          actualEnd: session.scheduledEnd,
        },
      });
    }
  });

  console.log("Booking + session marked COMPLETED for", bookingId);
  await p.$disconnect();
})();
