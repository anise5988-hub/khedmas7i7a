import { describe, it, expect, vi, beforeEach } from "vitest";

const getCurrentUser = vi.fn();
vi.mock("@/lib/server/auth", () => ({
  getCurrentUser: (...args: unknown[]) => getCurrentUser(...args),
}));

const walletUpdateMany = vi.fn();
const walletFindUnique = vi.fn();
const withdrawalRequestCreate = vi.fn();
const walletTransactionCreate = vi.fn();

vi.mock("@/lib/server/prisma", () => ({
  prisma: {
    $transaction: async (fn: (tx: unknown) => unknown) =>
      fn({
        wallet: { updateMany: walletUpdateMany, findUnique: walletFindUnique },
        withdrawalRequest: { create: withdrawalRequestCreate },
        walletTransaction: { create: walletTransactionCreate },
      }),
  },
}));

const { POST } = await import("@/app/api/withdrawals/route");

const TEACHER_USER = {
  id: "user_1",
  teacher: { id: "teacher_1" },
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/withdrawals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/withdrawals", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    walletUpdateMany.mockReset();
    walletFindUnique.mockReset();
    withdrawalRequestCreate.mockReset();
    walletTransactionCreate.mockReset();
  });

  it("reserves the funds and creates a real withdrawal request for an authenticated teacher with enough balance", async () => {
    getCurrentUser.mockResolvedValue(TEACHER_USER);
    walletUpdateMany.mockResolvedValue({ count: 1 });
    walletFindUnique.mockResolvedValue({ id: "wallet_1", userId: "user_1" });
    withdrawalRequestCreate.mockResolvedValue({
      id: "wd_1",
      status: "PENDING",
      method: "D17",
    });

    const response = await POST(
      makeRequest({ amountInMillimes: 100_000, method: "D17", accountDetails: "Phone: +216 20 123 456" }),
    );

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toMatchObject({
      id: "wd_1",
      status: "PENDING",
      method: "D17",
      requestedAmountInMillimes: 100_000,
      feeAmountInMillimes: 10_000,
      payoutAmountInMillimes: 90_000,
    });
    expect(walletUpdateMany).toHaveBeenCalledWith({
      where: { userId: "user_1", availableMillimes: { gte: 100_000 } },
      data: {
        availableMillimes: { decrement: 100_000 },
        pendingMillimes: { increment: 100_000 },
      },
    });
    expect(withdrawalRequestCreate).toHaveBeenCalled();
  });

  it("rejects unauthenticated requests instead of returning a fake success", async () => {
    getCurrentUser.mockResolvedValue(null);

    const response = await POST(
      makeRequest({ amountInMillimes: 100_000, method: "D17", accountDetails: "Phone: +216 20 123 456" }),
    );

    expect(response.status).toBe(403);
    expect(withdrawalRequestCreate).not.toHaveBeenCalled();
  });

  it("rejects the request when the teacher's available balance is insufficient", async () => {
    getCurrentUser.mockResolvedValue(TEACHER_USER);
    walletUpdateMany.mockResolvedValue({ count: 0 });

    const response = await POST(
      makeRequest({ amountInMillimes: 100_000, method: "D17", accountDetails: "Phone: +216 20 123 456" }),
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Solde disponible insuffisant pour ce retrait.");
    expect(withdrawalRequestCreate).not.toHaveBeenCalled();
  });

  it("should return 400 Bad Request when request body is invalid or missing required fields", async () => {
    const response = await POST(
      makeRequest({
        amountInMillimes: -50,
        method: "INVALID_METHOD",
      }),
    );

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Données de retrait invalides.");
    expect(data.issues).toBeDefined();
  });

  it("should return 400 Bad Request when request body is not valid JSON", async () => {
    const request = new Request("http://localhost/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-a-json-string",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Données de retrait invalides.");
  });
});
