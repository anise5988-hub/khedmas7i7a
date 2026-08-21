import { describe, it, expect } from "vitest";
import { loginSchema } from "@/lib/validation/login";

describe("loginSchema", () => {
  describe("Positive Cases", () => {
    it("should accept valid login credentials", () => {
      const input = {
        email: "student@example.com",
        password: "MySecurePassword123",
      };
      const result = loginSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("student@example.com");
        expect(result.data.password).toBe("MySecurePassword123");
      }
    });

    it("should trim and lowercase the email address", () => {
      const input = {
        email: "   User.NAME@Example.COM   ",
        password: "ValidPassword123",
      };
      const result = loginSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("user.name@example.com");
      }
    });

    it("should accept minimum (8 chars) and maximum (128 chars) password lengths", () => {
      const minPassInput = {
        email: "user@example.com",
        password: "12345678",
      };
      expect(loginSchema.safeParse(minPassInput).success).toBe(true);

      const maxPassInput = {
        email: "user@example.com",
        password: "a".repeat(128),
      };
      expect(loginSchema.safeParse(maxPassInput).success).toBe(true);
    });
  });

  describe("Negative Cases", () => {
    it("should reject invalid email formatting", () => {
      const invalidEmails = ["invalid-email", "@no-user.com", "user@", ""];
      invalidEmails.forEach((email) => {
        const result = loginSchema.safeParse({ email, password: "password123" });
        expect(result.success).toBe(false);
      });
    });

    it("should reject empty password", () => {
      const input = {
        email: "user@example.com",
        password: "",
      };
      const result = loginSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject password longer than 128 characters", () => {
      const input = {
        email: "user@example.com",
        password: "a".repeat(129),
      };
      const result = loginSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject missing email or password", () => {
      expect(loginSchema.safeParse({ email: "user@example.com" }).success).toBe(false);
      expect(loginSchema.safeParse({ password: "password123" }).success).toBe(false);
      expect(loginSchema.safeParse({}).success).toBe(false);
    });
  });
});
