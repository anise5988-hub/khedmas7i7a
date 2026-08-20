import { describe, it, expect } from "vitest";
import { withdrawalRequestSchema } from "@/lib/validation/withdrawal";

describe("withdrawalRequestSchema", () => {
  describe("Positive Cases", () => {
    it("should accept valid withdrawal requests with each supported payment method", () => {
      const validMethods = ["BANK_TRANSFER", "D17", "FLOUCI", "DIGIPOST"] as const;

      validMethods.forEach((method) => {
        const input = {
          amountInMillimes: 50_000,
          method,
          accountDetails: "RIB: 08000123456789012345",
        };
        const result = withdrawalRequestSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(input);
        }
      });
    });

    it("should accept boundary amounts (1 millime and 100,000,000 millimes)", () => {
      const minInput = {
        amountInMillimes: 1,
        method: "D17",
        accountDetails: "Phone: +216 20 123 456",
      };
      const minResult = withdrawalRequestSchema.safeParse(minInput);
      expect(minResult.success).toBe(true);

      const maxInput = {
        amountInMillimes: 100_000_000,
        method: "BANK_TRANSFER",
        accountDetails: "RIB: 08000123456789012345",
      };
      const maxResult = withdrawalRequestSchema.safeParse(maxInput);
      expect(maxResult.success).toBe(true);
    });

    it("should trim accountDetails whitespace automatically", () => {
      const input = {
        amountInMillimes: 20_000,
        method: "FLOUCI",
        accountDetails: "   Flouci Wallet #98765432   ",
      };
      const result = withdrawalRequestSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.accountDetails).toBe("Flouci Wallet #98765432");
      }
    });

    it("should accept accountDetails at minimum length boundary (4 characters)", () => {
      const input = {
        amountInMillimes: 10_000,
        method: "D17",
        accountDetails: "1234",
      };
      const result = withdrawalRequestSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept accountDetails at maximum length boundary (500 characters)", () => {
      const input = {
        amountInMillimes: 10_000,
        method: "BANK_TRANSFER",
        accountDetails: "A".repeat(500),
      };
      const result = withdrawalRequestSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("Negative Cases - Amount Validation", () => {
    it("should reject 0 millimes", () => {
      const input = {
        amountInMillimes: 0,
        method: "D17",
        accountDetails: "Phone: 20123456",
      };
      const result = withdrawalRequestSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject negative amounts", () => {
      const input = {
        amountInMillimes: -5000,
        method: "D17",
        accountDetails: "Phone: 20123456",
      };
      const result = withdrawalRequestSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject non-integer floating point amounts", () => {
      const input = {
        amountInMillimes: 50.75,
        method: "D17",
        accountDetails: "Phone: 20123456",
      };
      const result = withdrawalRequestSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject amounts exceeding 100,000,000 millimes", () => {
      const input = {
        amountInMillimes: 100_000_001,
        method: "BANK_TRANSFER",
        accountDetails: "RIB: 08000123456789012345",
      };
      const result = withdrawalRequestSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject non-numeric amount values", () => {
      const input = {
        amountInMillimes: "50000",
        method: "D17",
        accountDetails: "Phone: 20123456",
      };
      const result = withdrawalRequestSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("Negative Cases - Method Validation", () => {
    it("should reject unsupported payment methods", () => {
      const invalidMethods = ["PAYPAL", "STRIPE", "CASH", "d17", "bank_transfer", ""];

      invalidMethods.forEach((method) => {
        const input = {
          amountInMillimes: 10_000,
          method,
          accountDetails: "Account info here",
        };
        const result = withdrawalRequestSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    it("should reject missing method", () => {
      const input = {
        amountInMillimes: 10_000,
        accountDetails: "Account info here",
      };
      const result = withdrawalRequestSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("Negative Cases - Account Details Validation", () => {
    it("should reject accountDetails shorter than 4 characters", () => {
      const input = {
        amountInMillimes: 10_000,
        method: "D17",
        accountDetails: "123",
      };
      const result = withdrawalRequestSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject whitespace-only accountDetails that trim to less than 4 chars", () => {
      const input = {
        amountInMillimes: 10_000,
        method: "D17",
        accountDetails: "   ab   ",
      };
      const result = withdrawalRequestSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject accountDetails longer than 500 characters", () => {
      const input = {
        amountInMillimes: 10_000,
        method: "BANK_TRANSFER",
        accountDetails: "A".repeat(501),
      };
      const result = withdrawalRequestSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject missing accountDetails", () => {
      const input = {
        amountInMillimes: 10_000,
        method: "D17",
      };
      const result = withdrawalRequestSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("Edge & Security Cases", () => {
    it("should reject null and empty objects", () => {
      expect(withdrawalRequestSchema.safeParse(null).success).toBe(false);
      expect(withdrawalRequestSchema.safeParse(undefined).success).toBe(false);
      expect(withdrawalRequestSchema.safeParse({}).success).toBe(false);
    });

    it("should ignore extra unexpected properties by default", () => {
      const input = {
        amountInMillimes: 10_000,
        method: "D17",
        accountDetails: "Phone: 20123456",
        extraInjectedField: "malicious",
      };
      const result = withdrawalRequestSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});
