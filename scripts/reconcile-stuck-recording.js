// One-off admin reconciliation, run via `vercel env run` so the sensitive
// DATABASE_URL / DAILY_API_KEY are injected by Vercel at execution time and
// never touch disk:
//   npx vercel env run DATABASE_URL --project realprofy -- node scripts/reconcile-stuck-recording.js <bookingId>
// With no args it prints the recent bookings with their recording state.
// With a booking id it:
//   1. finds the Daily room's recordings (even if the app never stopped it)
//   2. stops any still-active Daily recording for that room
//   3. marks the classroom session PROCESSING->AVAILABLE once Daily says finished
//   4. marks the booking + session COMPLETED (optional, pass --complete)
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const DAILY_API_BASE = "https://api.daily.co/v1";
function dailyKey() {
  const key = process.env.DAILY_API_KEY;
  if (!key) throw new Error("DAILY_API_KEY missing");
  return key;
}
async function daily(path, opts = {}) {
  const res = await fetch(`${DAILY_API_BASE}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${dailyKey()}`, ...(opts.headers || {}) },
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { ok: res.ok, status: res.status, json, text };
}

(async () => {
  const args = process.argv.slice(2);
  const bookingId = args.find((a) => !a.startsWith("--"));
  const doComplete = args.includes("--complete");

  if (!bookingId) {
    const b = await p.booking.findMany({
      orderBy: { startsAt: "desc" },
      take: 8,
      include: {
        teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
        student: { select: { firstName: true, lastName: true } },
        classroomSession: { select: { status: true, recordingStatus: true, roomName: true, actualEnd: true } },
      },
    });
    console.log(JSON.stringify(b.map((x) => ({
      id: x.id, startsAt: x.startsAt, status: x.status,
      teacher: `${x.teacher.user.firstName} ${x.teacher.user.lastName}`,
      student: `${x.student.firstName} ${x.student.lastName}`,
      session: x.classroomSession,
    })), null, 1));
    await p.$disconnect();
    return;
  }

  const booking = await p.booking.findUnique({
    where: { id: bookingId },
    include: { classroomSession: true },
  });
  if (!booking) { console.log("NOT FOUND", bookingId); await p.$disconnect(); return; }
  const session = booking.classroomSession;
  console.log("Booking", booking.id, "status", booking.status);
  console.log("Session recordingStatus:", session?.recordingStatus, "room:", session?.roomName);

  if (session?.roomName) {
    // 1. Stop a recording that was never stopped
    if (session.recordingStatus === "RECORDING") {
      const stop = await daily(`/rooms/${encodeURIComponent(session.roomName)}/meetingRecording/stop`, { method: "POST" });
      console.log("Daily stop attempt:", stop.status, stop.ok ? "ok" : stop.text?.slice(0, 200));
      if (stop.ok) {
        await p.classroomSession.update({ where: { bookingId: booking.id }, data: { recordingStatus: "PROCESSING" } });
        console.log("-> PROCESSING");
      }
    }

    // 2. Poll Daily until the recording is finished (up to ~3 min)
    let asset = null;
    for (let i = 0; i < 12; i++) {
      const r = await daily(`/recordings?room_name=${encodeURIComponent(session.roomName)}&limit=1`);
      asset = r.json?.data?.[0] ?? null;
      console.log(`Daily recording #${i + 1}:`, asset ? `id=${asset.id} status=${asset.status}` : "none");
      if (asset && asset.status === "finished") break;
      await new Promise((res) => setTimeout(res, 15000));
    }

    // 3. Promote to AVAILABLE with a fresh access link
    if (asset?.status === "finished") {
      const link = await daily(`/recordings/${asset.id}/access-link`);
      const url = link.json?.download_link ?? null;
      const updated = await p.classroomSession.update({
        where: { bookingId: booking.id },
        data: { recordingStatus: "AVAILABLE", recordingId: asset.id, ...(url ? { recordingUrl: url } : {}) },
      });
      console.log("-> AVAILABLE, recordingId", updated.recordingId, "url set:", Boolean(updated.recordingUrl));
    } else {
      console.log("Recording not finished yet on Daily's side; leaving in PROCESSING. Re-run later.");
    }
  }

  // 4. Optionally complete booking + session
  if (doComplete) {
    const fresh = await p.classroomSession.findUnique({ where: { bookingId: booking.id } });
    await p.$transaction(async (tx) => {
      await tx.booking.update({ where: { id: booking.id }, data: { status: "COMPLETED" } });
      if (fresh) {
        await tx.classroomSession.update({
          where: { bookingId: booking.id },
          data: {
            status: "COMPLETED",
            phase: "COMPLETED",
            teacherJoinedAt: fresh.teacherJoinedAt ?? fresh.scheduledStart,
            studentJoinedAt: fresh.studentJoinedAt ?? fresh.scheduledStart,
            teacherLeftAt: fresh.teacherLeftAt ?? fresh.scheduledEnd,
            studentLeftAt: fresh.studentLeftAt ?? fresh.scheduledEnd,
            actualStart: fresh.actualStart ?? fresh.scheduledStart,
            actualEnd: fresh.actualEnd ?? fresh.scheduledEnd,
          },
        });
      }
    });
    console.log("Booking + session -> COMPLETED");
  }

  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
