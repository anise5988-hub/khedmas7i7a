import { describe, it, expect } from "vitest";
import {
  calculateTeacherWithdrawal,
  formatTndFromMillimes,
  TEACHER_WITHDRAWAL_FEE_PERCENT,
} from "@/lib/finance/withdrawal";

describe("calculateTeacherWithdrawal", () => {
  describe("Positive Cases", () => {
    it("should calculate exact 10% fee and payout for standard withdrawal amounts", () => {
      // 100 TND = 100,000 millimes
      const amount = 100_000;
      const result = calculateTeacherWithdrawal(amount);

      expect(result).toEqual({
        requestedAmountInMillimes: 100_000,
        feeAmountInMillimes: 10_000,
        payoutAmountInMillimes: 90_000,
      });
      expect(result.feeAmountInMillimes + result.payoutAmountInMillimes).toBe(amount);
    });

    it("should calculate correct fee and payout for small withdrawal amounts", () => {
      // 50 TND = 50,000 millimes
      const result = calculateTeacherWithdrawal(50_000);
      expect(result.requestedAmountInMillimes).toBe(50_000);
      expect(result.feeAmountInMillimes).toBe(5_000);
      expect(result.payoutAmountInMillimes).toBe(45_000);
    });

    it("should handle large withdrawal amounts correctly", () => {
      // 10,000 TND = 10,000,000 millimes
      const result = calculateTeacherWithdrawal(10_000_000);
      expect(result.requestedAmountInMillimes).toBe(10_000_000);
      expect(result.feeAmountInMillimes).toBe(1_000_000);
      expect(result.payoutAmountInMillimes).toBe(9_000_000);
    });

    it("should correctly round fee when 10% produces a fractional millime", () => {
      // 15 millimes * 10% = 1.5 millimes -> Math.round -> 2 millimes
      const result15 = calculateTeacherWithdrawal(15);
      expect(result15.feeAmountInMillimes).toBe(2);
      expect(result15.payoutAmountInMillimes).toBe(13);
      expect(result15.feeAmountInMillimes + result15.payoutAmountInMillimes).toBe(15);

      // 14 millimes * 10% = 1.4 millimes -> Math.round -> 1 millime
      const result14 = calculateTeacherWithdrawal(14);
      expect(result14.feeAmountInMillimes).toBe(1);
      expect(result14.payoutAmountInMillimes).toBe(13);
      expect(result14.feeAmountInMillimes + result14.payoutAmountInMillimes).toBe(14);
    });

    it("should have TEACHER_WITHDRAWAL_FEE_PERCENT set to 10", () => {
      expect(TEACHER_WITHDRAWAL_FEE_PERCENT).toBe(10);
    });
  });

  describe("Edge Cases", () => {
    it("should calculate fee of 0 and payout of 1 for minimum positive integer (1 millime)", () => {
      // 1 * 10% = 0.1 -> Math.round -> 0
      const result = calculateTeacherWithdrawal(1);
      expect(result).toEqual({
        requestedAmountInMillimes: 1,
        feeAmountInMillimes: 0,
        payoutAmountInMillimes: 1,
      });
    });

    it("should handle 5 millimes rounding (5 * 10% = 0.5 -> 1 millime fee)", () => {
      const result = calculateTeacherWithdrawal(5);
      expect(result.feeAmountInMillimes).toBe(1);
      expect(result.payoutAmountInMillimes).toBe(4);
    });

    it("should handle Number.MAX_SAFE_INTEGER correctly", () => {
      const maxSafe = Number.MAX_SAFE_INTEGER;
      const result = calculateTeacherWithdrawal(maxSafe);
      expect(result.requestedAmountInMillimes).toBe(maxSafe);
      expect(result.feeAmountInMillimes + result.payoutAmountInMillimes).toBe(maxSafe);
    });
  });

  describe("Negative & Validation Cases", () => {
    it("should throw error for 0 millimes", () => {
      expect(() => calculateTeacherWithdrawal(0)).toThrow(
        "Withdrawal amount must be a positive integer in millimes.",
      );
    });

    it("should throw error for negative numbers", () => {
      expect(() => calculateTeacherWithdrawal(-1)).toThrow(
        "Withdrawal amount must be a positive integer in millimes.",
      );
      expect(() => calculateTeacherWithdrawal(-100_000)).toThrow(
        "Withdrawal amount must be a positive integer in millimes.",
      );
    });

    it("should throw error for floating point numbers", () => {
      expect(() => calculateTeacherWithdrawal(100.5)).toThrow(
        "Withdrawal amount must be a positive integer in millimes.",
      );
      expect(() => calculateTeacherWithdrawal(0.99)).toThrow(
        "Withdrawal amount must be a positive integer in millimes.",
      );
    });

    it("should throw error for NaN, Infinity, and -Infinity", () => {
      expect(() => calculateTeacherWithdrawal(Number.NaN)).toThrow(
        "Withdrawal amount must be a positive integer in millimes.",
      );
      expect(() => calculateTeacherWithdrawal(Number.POSITIVE_INFINITY)).toThrow(
        "Withdrawal amount must be a positive integer in millimes.",
      );
      expect(() => calculateTeacherWithdrawal(Number.NEGATIVE_INFINITY)).toThrow(
        "Withdrawal amount must be a positive integer in millimes.",
      );
    });

    it("should throw error for numbers exceeding MAX_SAFE_INTEGER", () => {
      expect(() => calculateTeacherWithdrawal(Number.MAX_SAFE_INTEGER + 1000)).toThrow(
        "Withdrawal amount must be a positive integer in millimes.",
      );
    });
  });
});

describe("formatTndFromMillimes", () => {
  it("should format millimes into Tunisian Dinar currency string with 3 decimal places", () => {
    const formatted = formatTndFromMillimes(100_000);
    // 100,000 millimes = 100.000 TND (fr-TN uses comma or space and TND currency)
    expect(formatted).toContain("100");
    expect(formatted).toMatch(/TND|DT/);
  });

  it("should format 1000 millimes as 1 TND", () => {
    const formatted = formatTndFromMillimes(1000);
    expect(formatted).toContain("1");
    expect(formatted).toMatch(/1[,.]000/);
  });

  it("should format 0 millimes correctly", () => {
    const formatted = formatTndFromMillimes(0);
    expect(formatted).toMatch(/0[,.]000/);
  });

  it("should format fractional TND (e.g., 500 millimes = 0.500 TND)", () => {
    const formatted = formatTndFromMillimes(500);
    expect(formatted).toMatch(/0[,.]500/);
  });
});
