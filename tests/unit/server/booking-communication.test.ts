import { describe, it, expect, vi, beforeEach } from "vitest";

const getCurrentUser = vi.fn();
vi.mock("@/lib/server/auth", () => ({
  getCurrentUser: (...args: unknown[]) => getCurrentUser(...args),
}));

const bookingFindUnique = vi.fn();
const conversationUpsert = vi.fn();
vi.mock("@/lib/server/prisma", () => ({
  prisma: {
    booking: { findUnique: (...args: unknown[]) => bookingFindUnique(...args) },
    conversation: { upsert: (...args: unknown[]) => conversationUpsert(...args) },
  },
}));

// Aucun e-mail réel ne doit partir pendant les tests.
vi.mock("@/lib/server/notification-service", () => ({
  notifyUser: vi.fn().mockResolvedValue(null),
}));

const { getBookingConversationId, getBookingThreadSide, slugifySubject, formatSessionSlot } = await import(
  "@/lib/server/booking-communication"
);

const STUDENT = { id: "student_user_1" };
const TEACHER = { id: "teacher_user_1" };

function booking() {
  return {
    id: "booking_1",
    studentId: STUDENT.id,
    startsAt: new Date("2026-05-12T15:00:00.000Z"),
    durationMinutes: 60,
    status: "CONFIRMED",
    student: { id: STUDENT.id, firstName: "Sami", lastName: "Ben Ali" },
    teacher: {
      // TeacherProfile.userId est l'identité côté User : c'est ce champ que
      // les routes comparent à l'utilisateur de la session.
      userId: TEACHER.id,
      user: { id: TEACHER.id, firstName: "Leila", lastName: "Trabelsi" },
      subjects: [{ subject: "Mathématiques" }],
    },
  };
}

describe("getBookingThreadSide", () => {
  beforeEach(() => {
    bookingFindUnique.mockReset();
    getCurrentUser.mockReset();
  });

  it("returns null when the booking does not exist", async () => {
    bookingFindUnique.mockResolvedValue(null);
    await expect(getBookingThreadSide(STUDENT.id, "missing")).resolves.toBeNull();
  });

  it("returns null for a user who is neither the student nor the teacher", async () => {
    bookingFindUnique.mockResolvedValue(booking());
    await expect(getBookingThreadSide("stranger", "booking_1")).resolves.toBeNull();
  });

  it("resolves the teacher side for the teacher's own user id", async () => {
    bookingFindUnique.mockResolvedValue(booking());
    const side = await getBookingThreadSide(TEACHER.id, "booking_1");
    expect(side).not.toBeNull();
    expect(side?.isTeacher).toBe(true);
    expect(side?.otherUserId).toBe(STUDENT.id);
    expect(side?.otherName).toBe("Sami Ben Ali");
    expect(side?.booking.subject).toBe("Mathématiques");
  });

  it("resolves the student side for the student's own user id", async () => {
    bookingFindUnique.mockResolvedValue(booking());
    const side = await getBookingThreadSide(STUDENT.id, "booking_1");
    expect(side?.isTeacher).toBe(false);
    expect(side?.otherUserId).toBe(TEACHER.id);
    expect(side?.otherName).toBe("Prof. Leila Trabelsi");
  });

  it("never leaks a thread for an empty booking id", async () => {
    await expect(getBookingThreadSide(STUDENT.id, "")).resolves.toBeNull();
    expect(bookingFindUnique).not.toHaveBeenCalled();
  });
});

describe("getBookingConversationId", () => {
  beforeEach(() => {
    bookingFindUnique.mockReset();
    conversationUpsert.mockReset();
  });

  it("does not touch the database when the caller is not a participant", async () => {
    bookingFindUnique.mockResolvedValue(booking());
    const result = await getBookingConversationId("stranger", "booking_1");
    expect(result.conversationId).toBeNull();
    expect(conversationUpsert).not.toHaveBeenCalled();
  });

  it("upserts the conversation that links the two parties", async () => {
    bookingFindUnique.mockResolvedValue(booking());
    conversationUpsert.mockResolvedValue({ id: "conv_1" });

    const result = await getBookingConversationId(TEACHER.id, "booking_1");

    expect(result.conversationId).toBe("conv_1");
    expect(conversationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId_teacherId: { studentId: STUDENT.id, teacherId: TEACHER.id } },
      }),
    );
  });
});

describe("slugifySubject", () => {
  it("strips accents and punctuation for a clean slug", () => {
    expect(slugifySubject("Mathématiques - Séance de révision")).toBe("mathematiques-seance-de-revision");
  });

  it("handles arabic labels without throwing", () => {
    expect(() => slugifySubject("الرياضيات")).not.toThrow();
  });
});

describe("formatSessionSlot", () => {
  it("produces a readable french slot", () => {
    const formatted = formatSessionSlot(new Date("2026-05-12T15:00:00.000Z"));
    expect(formatted).toMatch(/2026/);
    expect(formatted).toContain(" à ");
  });
});