import { describe, it, expect } from "vitest";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validators/auth";

describe("Authentication Input Validators (Zod)", () => {
  describe("signupSchema", () => {
    it("should accept valid patient registration data", () => {
      const valid = {
        fullName: "Suresh Raina",
        email: "suresh@example.com",
        password: "ValidPassword1",
        phone: "+91 9876543210",
        gender: "MALE" as const,
        dateOfBirth: "1990-05-15",
      };

      const result = signupSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should reject invalid email format", () => {
      const invalid = {
        fullName: "Suresh Raina",
        email: "not-an-email",
        password: "ValidPassword1",
      };

      const result = signupSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.email).toBeDefined();
      }
    });

    it("should reject weak passwords without uppercase or numbers", () => {
      const weakPassword = {
        fullName: "Suresh Raina",
        email: "suresh@example.com",
        password: "onlylowercaseletters",
      };

      const result = signupSchema.safeParse(weakPassword);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.password).toBeDefined();
      }
    });

    it("should reject short passwords under 8 characters", () => {
      const short = {
        fullName: "Suresh Raina",
        email: "suresh@example.com",
        password: "Pass1",
      };

      const result = signupSchema.safeParse(short);
      expect(result.success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    it("should accept valid login credentials", () => {
      const result = loginSchema.safeParse({
        email: "doctor@clinic.com",
        password: "AnyPassword123",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty password", () => {
      const result = loginSchema.safeParse({
        email: "doctor@clinic.com",
        password: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("forgotPasswordSchema", () => {
    it("should validate valid email address", () => {
      const result = forgotPasswordSchema.safeParse({
        email: "user@domain.com",
      });
      expect(result.success).toBe(true);
    });

    it("should reject malformed email address", () => {
      const result = forgotPasswordSchema.safeParse({
        email: "user-domain.com",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("resetPasswordSchema", () => {
    it("should pass when new password and confirm password match", () => {
      const result = resetPasswordSchema.safeParse({
        token: "sample-reset-token-12345",
        newPassword: "NewSecretP@ssword1",
        confirmPassword: "NewSecretP@ssword1",
      });
      expect(result.success).toBe(true);
    });

    it("should fail when confirm password does not match", () => {
      const result = resetPasswordSchema.safeParse({
        token: "sample-reset-token-12345",
        newPassword: "NewSecretP@ssword1",
        confirmPassword: "DifferentP@ssword2",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.confirmPassword).toContain(
          "Passwords do not match"
        );
      }
    });
  });
});
