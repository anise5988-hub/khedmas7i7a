import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/withdrawals/route";

describe("POST /api/withdrawals", () => {
  it("should calculate breakdown and return 201 with status PENDING for valid withdrawal request", async () => {
    const request = new Request("http://localhost/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountInMillimes: 100_000,
        method: "D17",
        accountDetails: "Phone: +216 20 123 456",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data).toEqual({
      status: "PENDING",
      method: "D17",
      requestedAmountInMillimes: 100_000,
      feeAmountInMillimes: 10_000,
      payoutAmountInMillimes: 90_000,
    });
  });

  it("should return 400 Bad Request when request body is invalid or missing required fields", async () => {
    const request = new Request("http://localhost/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountInMillimes: -50,
        method: "INVALID_METHOD",
      }),
    });

    const response = await POST(request);
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
