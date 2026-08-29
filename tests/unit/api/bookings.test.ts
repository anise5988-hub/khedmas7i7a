import { describe, it, expect, vi, beforeEach } from "vitest";

const getCurrentUser = vi.fn();
vi.mock("@/lib/server/auth", () => ({
  getCurrentUser: (...args: unknown[]) => getCurrentUser(...args),
}));

const teacherProfileFindFirst = vi.fn();
const walletFindUnique = vi.fn();
const bookingCreate = vi.fn();
const bookingFindMany = vi.fn();
const walletUpdate = vi.fn();
const walletUpsert = vi.fn();
const walletTransactionCreate = vi.fn();
const paymentCreate = vi.fn();
const teacherProfileFindUnique = vi.fn();

vi.mock("@/lib/server/prisma", () => ({
  prisma: {
    teacherProfile: {
      findFirst: (...args: unknown[]) => teacherProfileFindFirst(...args),
      findUnique: (...args: unknown[]) => teacherProfileFindUnique(...args),
    },
    wallet: { findUnique: (...args: unknown[]) => walletFindUnique(...args) },
    $transaction: async (fn: (tx: unknown) => unknown) =>
      fn({
        booking: { create: bookingCreate, findMany: bookingFindMany },
        wallet: { update: walletUpdate, upsert: walletUpsert },
        walletTransaction: { create: walletTransactionCreate },
        payment: { create: paymentCreate },
        platformSettings: { findUnique: vi.fn().mockResolvedValue({ commissionRate: 10 }) },
      }),
  },
}));

vi.mock("@/lib/server/notification-service", () => ({
  notifyUser: vi.fn().mockResolvedValue(null),
}));

const { POST } = await import("@/app/api/bookings/route");

const STUDENT = { id: "student_1", firstName: "Sami", lastName: "Ben Ali" };
const TEACHER = {
  id: "teacher_1",
  userId: "teacher_user_1",
  slug: "prof-maths",
  hourlyRateMillimes: 30_000,
  verificationStatus: "APPROVED",
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/bookings", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    teacherProfileFindFirst.mockReset();
    teacherProfileFindUnique.mockReset();
    walletFindUnique.mockReset();
    bookingCreate.mockReset();
    bookingFindMany.mockReset();
    walletUpdate.mockReset();
    walletUpsert.mockReset();
    walletTransactionCreate.mockReset();
    paymentCreate.mockReset();

    getCurrentUser.mockResolvedValue(STUDENT);
    teacherProfileFindFirst.mockResolvedValue(TEACHER);
    teacherProfileFindUnique.mockResolvedValue({ userId: TEACHER.userId });
    walletFindUnique.mockResolvedValue({ id: "wallet_1", userId: STUDENT.id, availableMillimes: 1_000_000 });
    walletUpsert.mockResolvedValue({ id: "teacher_wallet_1", userId: TEACHER.userId });
    bookingFindMany.mockResolvedValue([]);
    bookingCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: "booking_1", ...data }),
    );
  });

  it("ignores a client-supplied price and charges the teacher's real hourly rate instead", async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const response = await POST(
      makeRequest({
        teacherId: "prof-maths",
        startsAt: futureDate,
        durationMinutes: 60,
        amountInMillimes: 1,
        mode: "ONLINE",
      }),
    );

    expect(response.status).toBe(201);
    expect(bookingCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amountMillimes: 30_000 }) }),
    );
    expect(walletUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { availableMillimes: { decrement: 30_000 } } }),
    );
  });

  it("computes the price from duration and the teacher's rate for a longer session", async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await POST(
      makeRequest({
        teacherId: "prof-maths",
        startsAt: futureDate,
        durationMinutes: 90,
        amountInMillimes: 999_999,
        mode: "ONLINE",
      }),
    );

    expect(bookingCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amountMillimes: 45_000 }) }),
    );
  });
});
