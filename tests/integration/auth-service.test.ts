/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  registerPatient,
  authenticateUser,
  requestPasswordReset,
  resetPassword,
} from "@/lib/services/auth.service";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

// Mock prisma and cookies for isolated service layer testing
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    clinic: {
      findFirst: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  }),
}));

describe("Authentication Service Integration Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("registerPatient", () => {
    it("should successfully register a patient and return safe user with session token", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.clinic.findFirst).mockResolvedValue({
        id: "clinic_123",
      } as any);

      const mockCreatedUser = {
        id: "usr_patient_01",
        email: "patient@example.com",
        fullName: "Rahul Verma",
        phone: "+91 9988776655",
        passwordHash: "mocked_hashed_pw",
        role: "PATIENT" as const,
        isActive: true,
        clinicId: "clinic_123",
        patientProfile: {
          id: "prof_01",
          gender: "MALE" as const,
          dateOfBirth: new Date("1992-04-10"),
          bloodGroup: "O+",
        },
      };

      vi.mocked(prisma.user.create).mockResolvedValue(mockCreatedUser as any);

      const result = await registerPatient({
        fullName: "Rahul Verma",
        email: "patient@example.com",
        password: "ValidPassword#2026",
        phone: "+91 9988776655",
        gender: "MALE",
        dateOfBirth: "1992-04-10",
      });

      expect(result.user.id).toBe("usr_patient_01");
      expect(result.user.role).toBe("PATIENT");
      expect(result.user.email).toBe("patient@example.com");
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe("string");
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it("should throw error if email already exists", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "existing_user",
        email: "duplicate@example.com",
      } as any);

      await expect(
        registerPatient({
          fullName: "Duplicate User",
          email: "duplicate@example.com",
          password: "ValidPassword#2026",
        })
      ).rejects.toThrow("An account with this email already exists.");
    });
  });

  describe("authenticateUser", () => {
    it("should authenticate active user with correct password", async () => {
      const plainPassword = "DoctorSecretPassword#2026";
      const hashedPassword = await hashPassword(plainPassword);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "usr_doctor_01",
        email: "doctor@ayurvedacare.com",
        fullName: "Dr. Deepak",
        phone: "+91 9123456780",
        passwordHash: hashedPassword,
        role: "DOCTOR" as const,
        isActive: true,
        clinicId: "clinic_123",
        patientProfile: null,
        doctor: {
          id: "doc_01",
          specialization: "Panchakarma & General Medicine",
          qualification: "BAMS, MD",
          consultationFee: 600,
          advanceBookingFee: 100,
        },
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      const result = await authenticateUser({
        email: "doctor@ayurvedacare.com",
        password: plainPassword,
      });

      expect(result.user.id).toBe("usr_doctor_01");
      expect(result.user.role).toBe("DOCTOR");
      expect(result.token).toBeDefined();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "usr_doctor_01" },
          data: { lastLoginAt: expect.any(Date) },
        })
      );
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it("should reject deactivated accounts", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "usr_inactive",
        email: "inactive@example.com",
        isActive: false,
      } as any);

      await expect(
        authenticateUser({
          email: "inactive@example.com",
          password: "AnyPassword123",
        })
      ).rejects.toThrow("Your account has been deactivated.");
    });

    it("should reject wrong credentials", async () => {
      const hashedPassword = await hashPassword("RealPassword#123");

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "usr_01",
        email: "user@example.com",
        passwordHash: hashedPassword,
        isActive: true,
      } as any);

      await expect(
        authenticateUser({
          email: "user@example.com",
          password: "WrongPassword#999",
        })
      ).rejects.toThrow("Invalid email or password.");
    });
  });

  describe("requestPasswordReset and resetPassword", () => {
    it("should generate reset token for active user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "usr_reset_target",
        email: "target@example.com",
        isActive: true,
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      const result = await requestPasswordReset({
        email: "target@example.com",
      });

      expect(result.message).toContain("password reset instructions have been sent");
      expect(result.debugToken).toBeDefined();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resetPasswordToken: expect.any(String),
            resetPasswordExpires: expect.any(Date),
          }),
        })
      );
    });

    it("should reject reset with invalid or expired token", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      await expect(
        resetPassword({
          token: "expired_or_invalid_token",
          newPassword: "BrandNewPassword#2026",
          confirmPassword: "BrandNewPassword#2026",
        })
      ).rejects.toThrow("Invalid or expired password reset link.");
    });
  });
});
