import { describe, it, expect } from "vitest";
import { registerSchema } from "@/lib/validation/auth";

describe("registerSchema", () => {
  const validStudent = {
    firstName: "Ahmed",
    lastName: "Ben Ali",
    email: "ahmed.benali@example.com",
    phone: "+216 20 123 456",
    password: "StrongPassword123!",
    role: "STUDENT" as const,
  };

  const validTeacher = {
    firstName: "Sarra",
    lastName: "Mansour",
    email: "sarra.mansour@example.com",
    phone: "98765432",
    password: "TeacherPassword2026",
    role: "TEACHER" as const,
  };

  describe("Positive Cases", () => {
    it("should accept valid student registration data", () => {
      const result = registerSchema.safeParse(validStudent);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe("STUDENT");
        expect(result.data.email).toBe("ahmed.benali@example.com");
      }
    });

    it("should accept valid teacher registration data", () => {
      const result = registerSchema.safeParse(validTeacher);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe("TEACHER");
      }
    });

    it("should normalize and lowercase email addresses automatically", () => {
      const input = {
        ...validStudent,
        email: "   AHMED.BENALI@EXAMPLE.COM   ",
      };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("ahmed.benali@example.com");
      }
    });

    it("should trim firstName and lastName automatically", () => {
      const input = {
        ...validStudent,
        firstName: "  Ahmed  ",
        lastName: "  Ben Ali  ",
      };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBe("Ahmed");
        expect(result.data.lastName).toBe("Ben Ali");
      }
    });

    it("should allow optional or empty phone numbers", () => {
      const inputWithoutPhone = {
        firstName: "Ahmed",
        lastName: "Ben Ali",
        email: "ahmed@example.com",
        password: "StrongPassword123!",
        role: "STUDENT" as const,
      };
      expect(registerSchema.safeParse(inputWithoutPhone).success).toBe(true);

      const inputWithEmptyPhone = {
        ...inputWithoutPhone,
        phone: "",
      };
      expect(registerSchema.safeParse(inputWithEmptyPhone).success).toBe(true);
    });

    it("should accept boundary name lengths (2 chars and 80 chars)", () => {
      const minNameInput = {
        ...validStudent,
        firstName: "Al",
        lastName: "Du",
      };
      expect(registerSchema.safeParse(minNameInput).success).toBe(true);

      const maxNameInput = {
        ...validStudent,
        firstName: "A".repeat(80),
        lastName: "B".repeat(80),
      };
      expect(registerSchema.safeParse(maxNameInput).success).toBe(true);
    });

    it("should accept boundary password lengths (8 chars and 128 chars)", () => {
      const minPasswordInput = {
        ...validStudent,
        password: "12345678",
      };
      expect(registerSchema.safeParse(minPasswordInput).success).toBe(true);

      const maxPasswordInput = {
        ...validStudent,
        password: "P".repeat(128),
      };
      expect(registerSchema.safeParse(maxPasswordInput).success).toBe(true);
    });
  });

  describe("Negative Cases - Name Validation", () => {
    it("should reject firstName shorter than 2 characters", () => {
      const input = { ...validStudent, firstName: "A" };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject firstName that becomes < 2 chars after trimming", () => {
      const input = { ...validStudent, firstName: "  A  " };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject firstName longer than 80 characters", () => {
      const input = { ...validStudent, firstName: "A".repeat(81) };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject lastName shorter than 2 characters", () => {
      const input = { ...validStudent, lastName: "B" };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject lastName longer than 80 characters", () => {
      const input = { ...validStudent, lastName: "B".repeat(81) };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("Negative Cases - Email Validation", () => {
    it("should reject invalid email formats", () => {
      const invalidEmails = [
        "plainaddress",
        "#@%^%#$@#$@#.com",
        "@example.com",
        "email@example@example.com",
        ".email@example.com",
        "email.@example.com",
        "",
      ];

      invalidEmails.forEach((email) => {
        const input = { ...validStudent, email };
        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("Negative Cases - Phone Validation", () => {
    it("should reject phone numbers shorter than 8 characters when non-empty", () => {
      const input = { ...validStudent, phone: "1234567" };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject phone numbers longer than 30 characters", () => {
      const input = { ...validStudent, phone: "1".repeat(31) };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("Negative Cases - Password Validation", () => {
    it("should reject passwords shorter than 8 characters", () => {
      const input = { ...validStudent, password: "1234567" };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject passwords longer than 128 characters", () => {
      const input = { ...validStudent, password: "P".repeat(129) };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("Negative Cases - Role Validation", () => {
    it("should reject unauthorized or unknown roles", () => {
      const invalidRoles = ["ADMIN", "MODERATOR", "SUPERADMIN", "student", "teacher", ""];

      invalidRoles.forEach((role) => {
        const input = { ...validStudent, role };
        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });
});
