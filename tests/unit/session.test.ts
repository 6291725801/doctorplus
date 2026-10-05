import { describe, it, expect } from "vitest";
import { createSessionToken, verifySessionToken, SessionPayload } from "@/lib/auth/session";

describe("Session Management & JWT Signing", () => {
  const samplePayload: SessionPayload = {
    userId: "cuid_user_12345",
    email: "doctor@ayurvedacare.com",
    fullName: "Dr. Ananya Sharma",
    role: "DOCTOR",
    clinicId: "cuid_clinic_67890",
  };

  it("should create and successfully verify a signed session JWT token", async () => {
    const token = await createSessionToken(samplePayload);
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3); // Header.Payload.Signature

    const decoded = await verifySessionToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(samplePayload.userId);
    expect(decoded?.email).toBe(samplePayload.email);
    expect(decoded?.fullName).toBe(samplePayload.fullName);
    expect(decoded?.role).toBe(samplePayload.role);
    expect(decoded?.clinicId).toBe(samplePayload.clinicId);
  });

  it("should reject tampered or corrupted tokens", async () => {
    const token = await createSessionToken(samplePayload);
    const tampered = token.slice(0, -6) + "xxxxxx";

    const decoded = await verifySessionToken(tampered);
    expect(decoded).toBeNull();
  });

  it("should return null for malformed tokens", async () => {
    expect(await verifySessionToken("invalid.token.structure")).toBeNull();
    expect(await verifySessionToken("")).toBeNull();
  });
});
