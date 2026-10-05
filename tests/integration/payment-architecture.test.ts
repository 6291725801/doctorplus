import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import {
  getClinicPaymentSettings,
  updateClinicPaymentSettings,
  calculateAppointmentFeeBreakdown,
  initializeAppointmentPayment,
  verifyAppointmentPayment,
  retryPaymentAttempt,
  processPaymentWebhook,
  processPaymentRefund,
  getAdminPaymentsList,
} from "@/lib/services/payment.service";
import { MockPaymentProvider } from "@/lib/payments/providers/mock.provider";
import { setPaymentProvider } from "@/lib/payments/factory";

describe("Phase 6: Production-Ready Payment Architecture & Lifecycle", () => {
  let clinicId: string;
  let adminUserId: string;
  let doctorId: string;
  let doctorUserId: string;
  let patientUserId: string;
  let patientProfileId: string;
  let testAppointmentId: string;
  let mockProvider: MockPaymentProvider;

  beforeAll(async () => {
    // Set up dedicated MockPaymentProvider for testing
    mockProvider = new MockPaymentProvider({ secretKey: "test_payment_secret_32bytes_key!" });
    setPaymentProvider(mockProvider);

    // 1. Create a dedicated isolated clinic for Phase 6 payment testing
    const clinic = await prisma.clinic.create({
      data: {
        name: `Payment Test Clinic ${Date.now()}`,
        slug: `pay-test-clinic-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        phone: "+91 9876543210",
        email: `billing-${Date.now()}@payclinic.org`,
        settings: {
          create: {
            minAdvanceAmount: 100.00,
            enableOnlinePayment: true,
            currency: "INR",
          },
        },
      },
    });
    clinicId = clinic.id;

    // 2. Create Admin user
    const admin = await prisma.user.create({
      data: {
        email: `admin-pay-${Date.now()}@test.org`,
        fullName: "Dr. Admin Controller",
        role: "CLINIC_ADMIN",
        passwordHash: "test_hashed_password",
        clinicId,
      },
    });
    adminUserId = admin.id;

    // 3. Create Doctor user and doctor profile
    const doctorUser = await prisma.user.create({
      data: {
        email: `dr-pay-${Date.now()}@test.org`,
        fullName: "Dr. Aarti Sharma",
        role: "DOCTOR",
        passwordHash: "test_hashed_password",
        clinicId,
      },
    });
    doctorUserId = doctorUser.id;

    const doctor = await prisma.doctor.create({
      data: {
        userId: doctorUserId,
        clinicId,
        specialization: "Cardiology",
        qualification: "MBBS, MD (Cardiology)",
        consultationFee: 500.00,
        advanceBookingFee: 100.00,
      },
    });
    doctorId = doctor.id;

    // 4. Create Patient user and patient profile
    const patientUser = await prisma.user.create({
      data: {
        email: `patient-pay-${Date.now()}@test.org`,
        fullName: "Rajesh Kumar",
        role: "PATIENT",
        passwordHash: "test_hashed_password",
        phone: "+91 9898989898",
        clinicId,
      },
    });
    patientUserId = patientUser.id;

    const profile = await prisma.patientProfile.create({
      data: {
        userId: patientUserId,
        gender: "MALE",
      },
    });
    patientProfileId = profile.id;

    // 5. Create a test appointment
    const appointment = await prisma.appointment.create({
      data: {
        appointmentNumber: `APPT-PAY-${Date.now()}`,
        clinicId,
        doctorId,
        patientProfileId,
        appointmentDate: new Date(),
        appointmentTime: "11:00",
        status: "CONFIRMED",
        consultationFee: 500.00,
        advanceAmount: 100.00,
        balanceAmount: 400.00,
        paymentStatus: "PENDING",
      },
    });
    testAppointmentId = appointment.id;
  });

  afterAll(async () => {
    // Reset provider instance
    setPaymentProvider(null);

    // Clean up test data
    await prisma.refund.deleteMany({
      where: { payment: { appointment: { clinicId } } },
    });
    await prisma.paymentAttempt.deleteMany({
      where: { payment: { appointment: { clinicId } } },
    });
    await prisma.payment.deleteMany({
      where: { appointment: { clinicId } },
    });
    await prisma.appointment.deleteMany({
      where: { clinicId },
    });
    await prisma.patientProfile.deleteMany({
      where: { userId: patientUserId },
    });
    await prisma.doctor.deleteMany({
      where: { id: doctorId },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [adminUserId, doctorUserId, patientUserId] } },
    });
    await prisma.clinicSettings.deleteMany({ where: { clinicId } });
    await prisma.clinic.deleteMany({ where: { id: clinicId } });
  });

  // =========================================================================
  // 1. Minimum Advance Payment & Consultation Fee Configuration
  // =========================================================================
  describe("1. Fee Configuration & Breakdown (₹500 consultation = ₹100 advance + ₹400 remaining)", () => {
    it("should retrieve default minimum advance payment of ₹100", async () => {
      const settings = await getClinicPaymentSettings(clinicId);
      expect(settings.minAdvanceAmount).toBeGreaterThanOrEqual(100);
      expect(settings.currency).toBe("INR");
    });

    it("should allow admin to update the minimum advance amount to ₹150", async () => {
      const updated = await updateClinicPaymentSettings({
        clinicId,
        minAdvanceAmount: 150.00,
        adminUserId,
      });

      expect(updated.minAdvanceAmount).toBe(150.00);

      // Verify audit log entry was created
      const audit = await prisma.auditLog.findFirst({
        where: { action: "PAYMENT_SETTINGS_UPDATE", userId: adminUserId },
        orderBy: { createdAt: "desc" },
      });
      expect(audit).toBeDefined();
    });

    it("should compute fee breakdown dynamically: Consultation = ₹500, Advance = ₹150, Remaining = ₹350", async () => {
      const breakdown = await calculateAppointmentFeeBreakdown({
        doctorId,
        clinicId,
      });

      expect(breakdown.consultationFee).toBe(500);
      expect(breakdown.advanceAmount).toBe(150);
      expect(breakdown.balanceAmount).toBe(350);
      expect(breakdown.currency).toBe("INR");
    });
  });

  // =========================================================================
  // 2. Payment Initialization & PaymentAttempt Architecture
  // =========================================================================
  describe("2. Payment & PaymentAttempt Initialization", () => {
    it("should initialize payment, creating Payment record and PaymentAttempt #1 in PROCESSING status", async () => {
      const initResult = await initializeAppointmentPayment({
        appointmentId: testAppointmentId,
        amountType: "ADVANCE",
        clientIp: "127.0.0.1",
        userAgent: "Vitest/1.0",
      });

      expect(initResult.paymentId).toBeDefined();
      expect(initResult.paymentReference).toMatch(/^PAY-\d{8}-[A-Z0-9]+$/);
      expect(initResult.attemptNumber).toBe(1);
      expect(initResult.amount).toBe(100); // Appointment advance was 100
      expect(initResult.gatewayOrderId).toMatch(/^order_mock_/);
      expect(initResult.provider).toBe("MOCK");

      // Verify DB record
      const paymentInDb = await prisma.payment.findUnique({
        where: { id: initResult.paymentId },
        include: { attempts: true },
      });

      expect(paymentInDb).toBeDefined();
      expect(paymentInDb?.status).toBe("PROCESSING");
      expect(paymentInDb?.attempts.length).toBe(1);
      expect(paymentInDb?.attempts[0].status).toBe("PROCESSING");
      expect(paymentInDb?.attempts[0].attemptNumber).toBe(1);
    });

    it("PCI-DSS Compliance: Verify no card numbers, CVVs, or expirations are stored in database", async () => {
      const paymentInDb = await prisma.payment.findFirst({
        where: { appointmentId: testAppointmentId },
      });
      expect(paymentInDb).toBeDefined();
      // Ensure only gateway order and payment references are stored
      expect(paymentInDb).not.toHaveProperty("cardNumber");
      expect(paymentInDb).not.toHaveProperty("cvv");
      expect(paymentInDb).not.toHaveProperty("expiry");
    });
  });

  // =========================================================================
  // 3. Security: Tampered / Forged Payment Rejection (Server-Side Verification)
  // =========================================================================
  describe("3. Server-Side Verification Security (Rejection of Fake / Forged Payments)", () => {
    it("Appointment must NOT be considered paid merely because frontend passes a fake payment ID without valid signature", async () => {
      const payment = await prisma.payment.findFirst({
        where: { appointmentId: testAppointmentId },
      });
      expect(payment).toBeDefined();

      const fakeGatewayOrderId = payment!.gatewayOrderId!;
      const fakeGatewayPaymentId = `pay_fake_forged_${Date.now()}`;
      const fakeSignature = "invalid_tampered_signature_hex_12345";

      // Attempt verification with forged signature
      await expect(
        verifyAppointmentPayment({
          appointmentId: testAppointmentId,
          paymentId: payment!.id,
          gatewayOrderId: fakeGatewayOrderId,
          gatewayPaymentId: fakeGatewayPaymentId,
          gatewaySignature: fakeSignature,
        })
      ).rejects.toThrow(/Server-side verification failed|Payment verification failed/);

      // Verify DB state: Appointment MUST remain PENDING!
      const appointment = await prisma.appointment.findUnique({
        where: { id: testAppointmentId },
      });
      expect(appointment?.paymentStatus).toBe("PENDING");

      // Verify PaymentAttempt was marked FAILED
      const latestAttempt = await prisma.paymentAttempt.findFirst({
        where: { paymentId: payment!.id },
        orderBy: { attemptNumber: "desc" },
      });
      expect(latestAttempt?.status).toBe("FAILED");
      expect(latestAttempt?.errorCode).toBe("INVALID_SIGNATURE");
    });

    it("should reject payment verification if signature is completely missing", async () => {
      const payment = await prisma.payment.findFirst({
        where: { appointmentId: testAppointmentId },
      });

      await expect(
        verifyAppointmentPayment({
          appointmentId: testAppointmentId,
          paymentId: payment!.id,
          gatewayOrderId: payment!.gatewayOrderId!,
          gatewayPaymentId: `pay_fake_no_sig_${Date.now()}`,
          gatewaySignature: undefined,
        })
      ).rejects.toThrow(/Payment verification failed/);
    });
  });

  // =========================================================================
  // 4. Payment Failure Scenario
  // =========================================================================
  describe("4. Payment Gateway Failure Handling", () => {
    it("should record failed attempt when payment gateway reports decline or insufficient funds", async () => {
      const payment = await prisma.payment.findFirst({
        where: { appointmentId: testAppointmentId },
      });

      const orderId = payment!.gatewayOrderId!;
      const failedPaymentId = `pay_fail_declined_${Date.now()}`;
      const validSig = mockProvider.generateTestSignature(orderId, failedPaymentId);

      await expect(
        verifyAppointmentPayment({
          appointmentId: testAppointmentId,
          paymentId: payment!.id,
          gatewayOrderId: orderId,
          gatewayPaymentId: failedPaymentId,
          gatewaySignature: validSig,
        })
      ).rejects.toThrow(/Simulated payment failure/);

      const latestAttempt = await prisma.paymentAttempt.findFirst({
        where: { paymentId: payment!.id },
        orderBy: { attemptNumber: "desc" },
      });
      expect(latestAttempt?.status).toBe("FAILED");
      expect(latestAttempt?.errorCode).toBe("PAYMENT_FAILED_SIMULATED");
    });
  });

  // =========================================================================
  // 5. Payment Retry Scenario
  // =========================================================================
  describe("5. Payment Retry Scenario (Attempt #2)", () => {
    it("should create a fresh PaymentAttempt #2 after failure and succeed upon retry", async () => {
      const payment = await prisma.payment.findFirst({
        where: { appointmentId: testAppointmentId },
      });

      // 1. Retry attempt
      const retryResult = await retryPaymentAttempt(payment!.id, "127.0.0.1", "Vitest/1.0");

      expect(retryResult.attemptNumber).toBe(2);
      expect(retryResult.gatewayOrderId).toMatch(/^order_mock_/);

      // Verify Attempt #2 was created in DB
      const attempts = await prisma.paymentAttempt.findMany({
        where: { paymentId: payment!.id },
        orderBy: { attemptNumber: "asc" },
      });
      expect(attempts.length).toBe(2);
      expect(attempts[1].attemptNumber).toBe(2);
      expect(attempts[1].status).toBe("PROCESSING");

      // 2. Perform valid cryptographic verification on Attempt #2
      const validPaymentId = `pay_valid_retry_${Date.now()}`;
      const validSignature = mockProvider.generateTestSignature(
        retryResult.gatewayOrderId,
        validPaymentId
      );

      const verifyResult = await verifyAppointmentPayment({
        appointmentId: testAppointmentId,
        paymentId: payment!.id,
        gatewayOrderId: retryResult.gatewayOrderId,
        gatewayPaymentId: validPaymentId,
        gatewaySignature: validSignature,
      });

      expect(verifyResult.success).toBe(true);
      expect(verifyResult.paymentStatus).toBe("PARTIALLY_PAID"); // ₹100 of ₹500 paid

      // Verify DB: Appointment status is PARTIALLY_PAID and CONFIRMED
      const updatedAppt = await prisma.appointment.findUnique({
        where: { id: testAppointmentId },
      });
      expect(updatedAppt?.paymentStatus).toBe("PARTIALLY_PAID");
      expect(updatedAppt?.status).toBe("CONFIRMED");

      // Verify PaymentAttempt #2 is marked PAID
      const attempt2 = await prisma.paymentAttempt.findFirst({
        where: { paymentId: payment!.id, attemptNumber: 2 },
      });
      expect(attempt2?.status).toBe("PAID");
      expect(attempt2?.gatewayPaymentId).toBe(validPaymentId);
    });
  });

  // =========================================================================
  // 6. Webhook Server Verification
  // =========================================================================
  describe("6. Webhook Processing & Server Update", () => {
    it("should reject webhook with invalid signature", async () => {
      const rawPayload = JSON.stringify({
        eventType: "payment.captured",
        orderId: "order_mock_test",
      });

      await expect(
        processPaymentWebhook({
          rawBody: rawPayload,
          signature: "forged_webhook_signature",
        })
      ).rejects.toThrow(/Invalid mock webhook cryptographic signature/);
    });

    it("should process payment.captured webhook with valid cryptographic signature", async () => {
      // Create a second appointment to test webhook status transition
      const appt2 = await prisma.appointment.create({
        data: {
          appointmentNumber: `APPT-WEBHOOK-${Date.now()}`,
          clinicId,
          doctorId,
          patientProfileId,
          appointmentDate: new Date(),
          appointmentTime: "14:00",
          status: "PENDING",
          consultationFee: 500.00,
          advanceAmount: 500.00, // Full fee
          balanceAmount: 0.00,
          paymentStatus: "PENDING",
        },
      });

      const initResult = await initializeAppointmentPayment({
        appointmentId: appt2.id,
        amountType: "FULL",
      });

      const webhookBody = JSON.stringify({
        eventType: "payment.captured",
        orderId: initResult.gatewayOrderId,
        paymentId: `pay_webhook_${Date.now()}`,
        amount: 500.00,
        currency: "INR",
        status: "PAID",
      });

      // Generate valid webhook signature using mock secret
      const crypto = await import("crypto");
      const validSig = crypto
        .createHmac("sha256", "test_payment_secret_32bytes_key!")
        .update(webhookBody)
        .digest("hex");

      const event = await processPaymentWebhook({
        rawBody: webhookBody,
        signature: validSig,
      });

      expect(event.eventType).toBe("payment.captured");
      expect(event.status).toBe("PAID");

      // Verify DB was updated by the webhook!
      const paymentInDb = await prisma.payment.findUnique({
        where: { id: initResult.paymentId },
      });
      expect(paymentInDb?.status).toBe("PAID");

      const apptInDb = await prisma.appointment.findUnique({
        where: { id: appt2.id },
      });
      expect(apptInDb?.paymentStatus).toBe("PAID");
      expect(apptInDb?.status).toBe("CONFIRMED");
    });
  });

  // =========================================================================
  // 7. Refund Architecture & Processing
  // =========================================================================
  describe("7. Refund Architecture & Processing", () => {
    it("should process a refund, creating a Refund record and marking Payment & Appointment REFUNDED", async () => {
      const payment = await prisma.payment.findFirst({
        where: { appointmentId: testAppointmentId },
      });
      expect(payment).toBeDefined();

      const refund = await processPaymentRefund({
        paymentId: payment!.id,
        amount: 100.00,
        reason: "Patient cancelled within eligible cancellation window",
        adminUserId,
      });

      expect(refund.id).toBeDefined();
      expect(refund.refundReference).toMatch(/^REF-\d{8}-[A-Z0-9]+$/);
      expect(refund.status).toBe("REFUNDED");
      expect(refund.gatewayRefundId).toMatch(/^rfnd_mock_/);

      // Verify Payment record status is REFUNDED
      const updatedPayment = await prisma.payment.findUnique({
        where: { id: payment!.id },
      });
      expect(updatedPayment?.status).toBe("REFUNDED");

      // Verify Appointment status is REFUNDED and CANCELLED
      const updatedAppt = await prisma.appointment.findUnique({
        where: { id: testAppointmentId },
      });
      expect(updatedAppt?.paymentStatus).toBe("REFUNDED");
      expect(updatedAppt?.status).toBe("CANCELLED");
    });

    it("should reject refund on an already refunded or unpaid payment", async () => {
      const payment = await prisma.payment.findFirst({
        where: { appointmentId: testAppointmentId },
      });

      await expect(
        processPaymentRefund({
          paymentId: payment!.id,
          amount: 100.00,
          adminUserId,
        })
      ).rejects.toThrow(/Cannot refund payment in 'REFUNDED' status/);
    });
  });

  // =========================================================================
  // 8. Admin Payments View (Audit & Reporting)
  // =========================================================================
  describe("8. Admin Payments Ledger & Audit View", () => {
    it("Admin must see: Amount, Payment status, Appointment, Patient, Doctor, Transaction reference, Date", async () => {
      const result = await getAdminPaymentsList({ limit: 10 });

      expect(result.items.length).toBeGreaterThan(0);
      const item = result.items[0];

      // Verify exact required fields:
      // 1. Amount
      expect(item.amount).toBeDefined();
      expect(typeof item.amount).toBe("number");

      // 2. Payment status
      expect(item.status).toBeDefined();
      expect(["PENDING", "PROCESSING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_PAID"]).toContain(item.status);

      // 3. Appointment
      expect(item.appointment).toBeDefined();
      expect(item.appointment.appointmentNumber).toBeDefined();
      expect(item.appointment.date).toBeDefined();
      expect(item.appointment.time).toBeDefined();

      // 4. Patient
      expect(item.patient).toBeDefined();
      expect(item.patient.fullName).toBeDefined();

      // 5. Doctor
      expect(item.doctor).toBeDefined();
      expect(item.doctor.fullName).toBeDefined();
      expect(item.doctor.specialization).toBeDefined();

      // 6. Transaction reference
      expect(item.paymentReference).toBeDefined();

      // 7. Date
      expect(item.createdAt).toBeDefined();
    });

    it("should support filtering admin payments by status", async () => {
      const refundedPayments = await getAdminPaymentsList({ status: "REFUNDED" });
      for (const item of refundedPayments.items) {
        expect(item.status).toBe("REFUNDED");
      }
    });
  });

  // =========================================================================
  // 9. Production Guard (No Fake Payments in Production)
  // =========================================================================
  describe("9. Production Security Guard", () => {
    it("should strictly forbid MockPaymentProvider when NODE_ENV is production", () => {
      const originalEnv = process.env.NODE_ENV;
      const envObj = process.env as Record<string, string | undefined>;
      try {
        envObj.NODE_ENV = "production";
        expect(() => new MockPaymentProvider()).toThrow(
          /CRITICAL SECURITY: MockPaymentProvider is strictly prohibited in production mode/
        );
      } finally {
        envObj.NODE_ENV = originalEnv;
      }
    });
  });
});
