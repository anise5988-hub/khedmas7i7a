import { describe, it, expect } from "vitest";
import { depositSchema } from "@/lib/validation/deposit";

describe("depositSchema", () => {
  describe("Positive Cases", () => {
    it("should accept valid deposit requests for each supported method", () => {
      const validMethods = ["D17", "BANK_TRANSFER", "FLOUCI"] as const;

      validMethods.forEach((method) => {
        const input = {
          amountMillimes: 20_000,
          method,
          reference: "TX-99887766",
        };
        const result = depositSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(input);
        }
      });
    });

    it("should trim the reference field", () => {
      const input = {
        amountMillimes: 50_000,
        method: "FLOUCI",
        reference: "   REF-123456   ",
      };
      const result = depositSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reference).toBe("REF-123456");
      }
    });

    it("should accept minimum positive integer amount (1 millime)", () => {
      const input = {
        amountMillimes: 1,
        method: "D17",
        reference: "D17-001",
      };
      expect(depositSchema.safeParse(input).success).toBe(true);
    });

    it("should accept maximum allowed deposit amount (10,000,000 millimes = 10,000 TND)", () => {
      const input = {
        amountMillimes: 10_000_000,
        method: "BANK_TRANSFER",
        reference: "VIR-2026-0001",
      };
      expect(depositSchema.safeParse(input).success).toBe(true);
    });

    it("should accept boundary reference lengths (3 and 120 chars)", () => {
      const minRefInput = {
        amountMillimes: 10_000,
        method: "D17",
        reference: "ABC",
      };
      expect(depositSchema.safeParse(minRefInput).success).toBe(true);

      const maxRefInput = {
        amountMillimes: 10_000,
        method: "D17",
        reference: "R".repeat(120),
      };
      expect(depositSchema.safeParse(maxRefInput).success).toBe(true);
    });
  });

  describe("Negative Cases - Amount Validation", () => {
    it("should reject 0 millimes", () => {
      const input = {
        amountMillimes: 0,
        method: "D17",
        reference: "REF-123",
      };
      expect(depositSchema.safeParse(input).success).toBe(false);
    });

    it("should reject negative amounts", () => {
      const input = {
        amountMillimes: -1000,
        method: "D17",
        reference: "REF-123",
      };
      expect(depositSchema.safeParse(input).success).toBe(false);
    });

    it("should reject floating point amounts", () => {
      const input = {
        amountMillimes: 15.5,
        method: "D17",
        reference: "REF-123",
      };
      expect(depositSchema.safeParse(input).success).toBe(false);
    });

    it("should reject amounts exceeding 10,000,000 millimes", () => {
      const input = {
        amountMillimes: 10_000_001,
        method: "BANK_TRANSFER",
        reference: "REF-123",
      };
      expect(depositSchema.safeParse(input).success).toBe(false);
    });
  });

  describe("Negative Cases - Method & Reference Validation", () => {
    it("should reject unsupported deposit methods", () => {
      const invalidMethods = ["PAYPAL", "BITCOIN", "CREDIT_CARD", "d17"];
      invalidMethods.forEach((method) => {
        const input = {
          amountMillimes: 10_000,
          method,
          reference: "REF-123",
        };
        expect(depositSchema.safeParse(input).success).toBe(false);
      });
    });

    it("should reject reference shorter than 3 characters", () => {
      const input = {
        amountMillimes: 10_000,
        method: "D17",
        reference: "AB",
      };
      expect(depositSchema.safeParse(input).success).toBe(false);
    });

    it("should reject reference longer than 120 characters", () => {
      const input = {
        amountMillimes: 10_000,
        method: "D17",
        reference: "R".repeat(121),
      };
      expect(depositSchema.safeParse(input).success).toBe(false);
    });
  });
});
