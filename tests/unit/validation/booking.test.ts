import { describe, it, expect } from "vitest";
import { bookingRequestSchema } from "@/lib/validation/booking";

describe("bookingRequestSchema", () => {
  const validBase = {
    teacherId: "teacher-uuid-123",
    startsAt: "2026-09-01T10:00:00.000Z",
    durationMinutes: 60 as const,
    amountInMillimes: 35_000,
    mode: "ONLINE" as const,
  };

  describe("Positive Cases", () => {
    it("should accept valid booking requests with all allowed duration options", () => {
      const allowedDurations = [30, 60, 90, 120] as const;

      allowedDurations.forEach((durationMinutes) => {
        const input = {
          ...validBase,
          durationMinutes,
        };
        const result = bookingRequestSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.durationMinutes).toBe(durationMinutes);
        }
      });
    });

    it("should accept all allowed modes: ONLINE and IN_PERSON", () => {
      const modes = ["ONLINE", "IN_PERSON"] as const;

      modes.forEach((mode) => {
        const input = {
          ...validBase,
          mode,
        };
        const result = bookingRequestSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.mode).toBe(mode);
        }
      });
    });

    it("should coerce ISO string, timestamp, or Date object into a Date instance", () => {
      const stringDate = "2026-10-15T14:30:00.000Z";
      const resultFromString = bookingRequestSchema.safeParse({
        ...validBase,
        startsAt: stringDate,
      });
      expect(resultFromString.success).toBe(true);
      if (resultFromString.success) {
        expect(resultFromString.data.startsAt).toBeInstanceOf(Date);
        expect(resultFromString.data.startsAt.toISOString()).toBe(stringDate);
      }

      const dateObj = new Date("2026-11-20T09:00:00.000Z");
      const resultFromObj = bookingRequestSchema.safeParse({
        ...validBase,
        startsAt: dateObj,
      });
      expect(resultFromObj.success).toBe(true);
      if (resultFromObj.success) {
        expect(resultFromObj.data.startsAt.getTime()).toBe(dateObj.getTime());
      }
    });
  });

  describe("Negative Cases - Duration & Mode", () => {
    it("should reject non-standard duration values", () => {
      const invalidDurations = [0, 15, 45, 50, 75, 100, 180, -60];

      invalidDurations.forEach((durationMinutes) => {
        const input = {
          ...validBase,
          durationMinutes,
        };
        const result = bookingRequestSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    it("should reject invalid modes", () => {
      const invalidModes = ["HYBRID", "REMOTE", "online", "in_person", ""];

      invalidModes.forEach((mode) => {
        const input = {
          ...validBase,
          mode,
        };
        const result = bookingRequestSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("Negative Cases - TeacherId & Amount & Date", () => {
    it("should reject empty teacherId", () => {
      const input = {
        ...validBase,
        teacherId: "",
      };
      expect(bookingRequestSchema.safeParse(input).success).toBe(false);
    });

    it("should reject 0 or negative amountInMillimes", () => {
      expect(bookingRequestSchema.safeParse({ ...validBase, amountInMillimes: 0 }).success).toBe(false);
      expect(bookingRequestSchema.safeParse({ ...validBase, amountInMillimes: -5000 }).success).toBe(false);
    });

    it("should reject floating point amounts", () => {
      expect(bookingRequestSchema.safeParse({ ...validBase, amountInMillimes: 3500.5 }).success).toBe(false);
    });

    it("should reject unparseable date values", () => {
      const invalidDates = ["not-a-date", "invalid_timestamp", "2026-99-99"];

      invalidDates.forEach((startsAt) => {
        const result = bookingRequestSchema.safeParse({
          ...validBase,
          startsAt,
        });
        expect(result.success).toBe(false);
      });
    });
  });
});
