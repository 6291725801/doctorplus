import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("Password Security & Hashing", () => {
  it("should hash a valid password using bcrypt with salt", async () => {
    const plain = "StrongDoctorPassword#2026";
    const hashed = await hashPassword(plain);

    expect(hashed).toBeDefined();
    expect(hashed).not.toBe(plain);
    expect(hashed.startsWith("$2")).toBe(true); // bcrypt prefix
  });

  it("should verify correct password successfully", async () => {
    const plain = "ClinicalP@ssw0rd99";
    const hashed = await hashPassword(plain);

    const isMatch = await verifyPassword(plain, hashed);
    expect(isMatch).toBe(true);
  });

  it("should reject an incorrect password", async () => {
    const plain = "ClinicalP@ssw0rd99";
    const wrong = "ClinicalP@ssw0rd100";
    const hashed = await hashPassword(plain);

    const isMatch = await verifyPassword(wrong, hashed);
    expect(isMatch).toBe(false);
  });

  it("should enforce minimum 8 characters during hashing", async () => {
    await expect(hashPassword("short")).rejects.toThrow(
      "Password must be at least 8 characters long."
    );
  });
});
