const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const s = await p.classroomSession.updateMany({ data: { locked: false, waitingRoomEnabled: false } });
  const q = await p.classroomParticipant.updateMany({ where: { admission: "PENDING" }, data: { admission: "ADMITTED" } });
  console.log("sessions unlocked:", s.count, "| pending admitted:", q.count);
  await p.$disconnect();
})();
