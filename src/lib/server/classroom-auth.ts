import { prisma } from "@/lib/server/prisma";

type BookingParticipant = {
  bookingId: string;
  isStudent: boolean;
  isTeacher: boolean;
  isAdmin: boolean;
};

/**
 * A user may only read/write classroom data (chat, notes, whiteboard) for a
 * booking they are actually part of. Every classroom API route must call
 * this before touching booking-scoped data — the room id in the URL is not
 * itself a secret, so authorization has to be enforced server-side here.
 */
export async function authorizeBookingParticipant(
  bookingId: string,
  user: { id: string; role: string } | null,
): Promise<BookingParticipant | null> {
  if (!user) return null;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { studentId: true, teacher: { select: { userId: true } } },
  });
  if (!booking) return null;

  const isStudent = user.id === booking.studentId;
  const isTeacher = user.id === booking.teacher.userId;
  const isAdmin = user.role === "ADMIN";

  if (!isStudent && !isTeacher && !isAdmin) return null;

  return { bookingId, isStudent, isTeacher, isAdmin };
}
