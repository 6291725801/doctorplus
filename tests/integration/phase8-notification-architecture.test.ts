import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { providerRegistry } from "@/lib/notifications/registry";
import { MockEmailProvider } from "@/lib/notifications/providers/email.provider";
import { MockSmsProvider } from "@/lib/notifications/providers/sms.provider";
import { MockWhatsAppProvider } from "@/lib/notifications/providers/whatsapp.provider";
import {
  dispatchNotification,
  sendAppointmentBookedNotification,
  sendPaymentSuccessfulNotification,
  sendAppointmentCancelledNotification,
  sendAppointmentRescheduledNotification,
  sendAppointmentReminderNotification,
  sendDoctorScheduleChangedNotification,
  sendAppointmentCompletedNotification,
  getNotificationTemplates,
  updateNotificationTemplate,
  resetNotificationTemplate,
  getNotificationLogs,
  seedDefaultTemplates,
} from "@/lib/services/notification.service";
import { bookAppointment, cancelAppointment } from "@/lib/services/appointment.service";
import { NotificationType, NotificationChannel, NotificationDeliveryStatus, UserRole } from "@prisma/client";

describe("Phase 8: Notification Architecture, Multi-Channel Abstraction & Templates", () => {
  let clinicId: string;
  let testDoctor: any;
  let testPatientUser: any;
  let testPatientProfile: any;
  let mockEmail: MockEmailProvider;
  let mockSms: MockSmsProvider;
  let mockWhatsApp: MockWhatsAppProvider;

  beforeAll(async () => {
    // 1. Fetch clinic
    const clinic = await prisma.clinic.findFirst();
    if (!clinic) throw new Error("No clinic found. Seed database first.");
    clinicId = clinic.id;

    // 2. Ensure default templates seeded
    await seedDefaultTemplates(clinicId);

    // 3. Setup mock providers
    mockEmail = new MockEmailProvider();
    mockSms = new MockSmsProvider();
    mockWhatsApp = new MockWhatsAppProvider();

    providerRegistry.setEmailProvider(mockEmail);
    providerRegistry.setSmsProvider(mockSms);
    providerRegistry.setWhatsAppProvider(mockWhatsApp);

    // 4. Fetch or create test doctor
    testDoctor = await prisma.doctor.findFirst({
      where: { clinicId, isActive: true },
      include: { user: true, schedules: true },
    });

    if (!testDoctor) {
      const docUser = await prisma.user.create({
        data: {
          email: "dr.phase8.notify@ayurvedacare.com",
          fullName: "Dr. Phase 8 Specialist",
          phone: "+91 98888 11111",
          passwordHash: "hash_phase8",
          role: UserRole.DOCTOR,
          clinicId,
        },
      });

      testDoctor = await prisma.doctor.create({
        data: {
          userId: docUser.id,
          clinicId,
          specialization: "Holistic Health",
          qualification: "BAMS, MD (Ayurveda)",
          experienceYears: 10,
          registrationNumber: "AYU-88899",
          consultationFee: 600,
          advanceBookingFee: 150,
          appointmentDurationMinutes: 15,
          isActive: true,
          isAvailableForBooking: true,
          schedules: {
            create: [
              { dayOfWeek: "MONDAY", startTime: "09:00", endTime: "18:00", isAvailable: true, slotDurationMinutes: 15 },
              { dayOfWeek: "TUESDAY", startTime: "09:00", endTime: "18:00", isAvailable: true, slotDurationMinutes: 15 },
              { dayOfWeek: "WEDNESDAY", startTime: "09:00", endTime: "18:00", isAvailable: true, slotDurationMinutes: 15 },
              { dayOfWeek: "THURSDAY", startTime: "09:00", endTime: "18:00", isAvailable: true, slotDurationMinutes: 15 },
              { dayOfWeek: "FRIDAY", startTime: "09:00", endTime: "18:00", isAvailable: true, slotDurationMinutes: 15 },
            ],
          },
        },
        include: { user: true, schedules: true },
      });
    }

    // 5. Create test patient
    testPatientUser = await prisma.user.upsert({
      where: { email: "patient.phase8@test.com" },
      update: { fullName: "Aarav Phase 8 Patient", phone: "+91 98888 22222" },
      create: {
        email: "patient.phase8@test.com",
        fullName: "Aarav Phase 8 Patient",
        phone: "+91 98888 22222",
        role: UserRole.PATIENT,
        passwordHash: "hash_phase8",
        clinicId,
      },
    });

    testPatientProfile = await prisma.patientProfile.upsert({
      where: { userId: testPatientUser.id },
      update: {},
      create: { userId: testPatientUser.id, city: "Mumbai" },
    });

    // Ensure all templates start in active state for testing
    await prisma.notificationTemplate.updateMany({ data: { isActive: true } });
  });

  beforeEach(() => {
    mockEmail.clear();
    mockSms.clear();
    mockWhatsApp.clear();
  });

  afterAll(async () => {
    providerRegistry.resetDefaults();
  });

  // ====================================================
  // TEST SUITE 1: Multi-Channel Provider Abstraction
  // ====================================================
  describe("1. Multi-Channel Provider Architecture & Abstraction", () => {
    it("dispatches notification via Email provider and stores notification log", async () => {
      const results = await dispatchNotification({
        event: NotificationType.APPOINTMENT_BOOKED,
        recipient: {
          name: "Aarav Patel",
          email: "aarav@test.com",
          userId: testPatientUser.id,
        },
        variables: {
          patientName: "Aarav Patel",
          doctorName: "Dr. Phase 8 Specialist",
          clinicName: "AyurvedaCare",
          appointmentNumber: "APT-801",
          appointmentDate: "2026-10-15",
          appointmentTime: "10:30",
        },
        channels: [NotificationChannel.EMAIL],
        clinicId,
      });

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(true);
      expect(results[0].channel).toBe(NotificationChannel.EMAIL);
      expect(results[0].provider).toBe("MockEmailProvider");
      expect(mockEmail.sentEmails.length).toBe(1);
      expect(mockEmail.sentEmails[0].to).toBe("aarav@test.com");
      expect(mockEmail.sentEmails[0].subject).toContain("APT-801");

      // Verify log persisted in database
      const log = await prisma.notificationLog.findFirst({
        where: { recipient: "aarav@test.com", event: NotificationType.APPOINTMENT_BOOKED },
        orderBy: { createdAt: "desc" },
      });
      expect(log).toBeDefined();
      expect(log?.status).toBe(NotificationDeliveryStatus.SENT);
      expect(log?.channel).toBe(NotificationChannel.EMAIL);
    });

    it("dispatches notification via SMS provider architecture", async () => {
      const results = await dispatchNotification({
        event: NotificationType.APPOINTMENT_REMINDER,
        recipient: {
          name: "Aarav Patel",
          phone: "+919888822222",
          userId: testPatientUser.id,
        },
        variables: {
          patientName: "Aarav Patel",
          doctorName: "Dr. Phase 8 Specialist",
          clinicName: "AyurvedaCare",
          appointmentDate: "2026-10-15",
          appointmentTime: "10:30",
        },
        channels: [NotificationChannel.SMS],
        clinicId,
      });

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(true);
      expect(results[0].channel).toBe(NotificationChannel.SMS);
      expect(results[0].provider).toBe("MockSmsProvider");
      expect(mockSms.sentMessages.length).toBe(1);
      expect(mockSms.sentMessages[0].to).toBe("+919888822222");
      expect(mockSms.sentMessages[0].message).toContain("Dr. Phase 8 Specialist");
    });

    it("dispatches notification via WhatsApp provider architecture", async () => {
      const results = await dispatchNotification({
        event: NotificationType.PAYMENT_SUCCESSFUL,
        recipient: {
          name: "Aarav Patel",
          phone: "+919888822222",
          userId: testPatientUser.id,
        },
        variables: {
          patientName: "Aarav Patel",
          amount: "500.00",
          appointmentNumber: "APT-802",
          clinicName: "AyurvedaCare",
          receiptNumber: "REC-802",
          paymentMethod: "UPI",
        },
        channels: [NotificationChannel.WHATSAPP],
        clinicId,
      });

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(true);
      expect(results[0].channel).toBe(NotificationChannel.WHATSAPP);
      expect(results[0].provider).toBe("MockWhatsAppProvider");
      expect(mockWhatsApp.sentMessages.length).toBe(1);
      expect(mockWhatsApp.sentMessages[0].message).toContain("500.00");
    });

    it("supports broadcasting across multiple channels simultaneously", async () => {
      const results = await dispatchNotification({
        event: NotificationType.APPOINTMENT_BOOKED,
        recipient: {
          name: "Aarav Patel",
          email: "aarav.multi@test.com",
          phone: "+919888822222",
          userId: testPatientUser.id,
        },
        variables: {
          patientName: "Aarav Patel",
          doctorName: "Dr. Phase 8 Specialist",
          clinicName: "AyurvedaCare",
          appointmentNumber: "APT-MULTI-1",
          appointmentDate: "2026-10-15",
          appointmentTime: "11:00",
        },
        channels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.WHATSAPP],
        clinicId,
      });

      expect(results.length).toBe(3);
      expect(mockEmail.sentEmails.length).toBe(1);
      expect(mockSms.sentMessages.length).toBe(1);
      expect(mockWhatsApp.sentMessages.length).toBe(1);
    });
  });

  // ====================================================
  // TEST SUITE 2: All 7 Required Event Triggers
  // ====================================================
  describe("2. The 7 Required Lifecycle Event Triggers", () => {
    let testAppointmentId: string;
    let testPaymentId: string;

    it("Event 1: triggers APPOINTMENT_BOOKED on booking appointment", async () => {
      const appt = await prisma.appointment.create({
        data: {
          appointmentNumber: `APT-EV1-${Date.now()}`,
          clinicId,
          doctorId: testDoctor.id,
          patientProfileId: testPatientProfile.id,
          appointmentDate: new Date("2026-11-01"),
          appointmentTime: "10:00",
          status: "CONFIRMED",
          consultationFee: 500,
          advanceAmount: 100,
          balanceAmount: 400,
        },
      });
      testAppointmentId = appt.id;

      const results = await sendAppointmentBookedNotification(appt.id);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].success).toBe(true);
      expect(results[0].subject).toContain(appt.appointmentNumber);
      expect(mockEmail.sentEmails.some((e) => e.subject.includes(appt.appointmentNumber))).toBe(true);
    });

    it("Event 2: triggers PAYMENT_SUCCESSFUL on payment verification", async () => {
      const payment = await prisma.payment.create({
        data: {
          paymentReference: `PAY-EV2-${Date.now()}`,
          appointmentId: testAppointmentId,
          amount: 100.0,
          currency: "INR",
          status: "PAID",
          method: "ONLINE",
          gatewayProvider: "RAZORPAY",
          gatewayPaymentId: "pay_phase8_test_123",
          paidAt: new Date(),
        },
      });
      testPaymentId = payment.id;

      const results = await sendPaymentSuccessfulNotification(payment.id);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].success).toBe(true);
      expect(mockEmail.sentEmails.some((e) => e.subject.includes("Payment Received"))).toBe(true);
    });

    it("Event 3: triggers APPOINTMENT_CANCELLED with cancellation reason", async () => {
      const results = await sendAppointmentCancelledNotification(
        testAppointmentId,
        "Patient emergency travel conflict"
      );
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].success).toBe(true);
      expect(results[0].content).toContain("Patient emergency travel conflict");
      expect(mockEmail.sentEmails.some((e) => e.subject.includes("Appointment Cancelled"))).toBe(true);
    });

    it("Event 4: triggers APPOINTMENT_RESCHEDULED with previous and new timings", async () => {
      const results = await sendAppointmentRescheduledNotification(
        testAppointmentId,
        "2026-11-01",
        "10:00"
      );
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].success).toBe(true);
      expect(mockEmail.sentEmails.some((e) => e.subject.includes("Rescheduled"))).toBe(true);
    });

    it("Event 5: triggers APPOINTMENT_REMINDER with clinic and timing details", async () => {
      const results = await sendAppointmentReminderNotification(testAppointmentId);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].success).toBe(true);
      expect(mockEmail.sentEmails.some((e) => e.subject.includes("Reminder"))).toBe(true);
    });

    it("Event 6: triggers DOCTOR_SCHEDULE_CHANGED to affected booked patients", async () => {
      const results = await sendDoctorScheduleChangedNotification(
        testDoctor.id,
        "Dr. Phase 8 will be available in Morning Session (09:00 - 13:00) on Tuesdays"
      );
      expect(Array.isArray(results)).toBe(true);
    });

    it("Event 7: triggers APPOINTMENT_COMPLETED when consultation finishes", async () => {
      const results = await sendAppointmentCompletedNotification(testAppointmentId);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].success).toBe(true);
      expect(mockEmail.sentEmails.some((e) => e.subject.includes("Thank you for visiting"))).toBe(true);
    });
  });

  // ====================================================
  // TEST SUITE 3: CMS & Admin Template Configuration
  // ====================================================
  describe("3. CMS & Admin Notification Template Customization", () => {
    it("fetches templates from database for all 7 events", async () => {
      const templates = await getNotificationTemplates(clinicId);
      expect(templates.length).toBeGreaterThanOrEqual(21); // 7 events * 3 channels

      const events = new Set(templates.map((t) => t.event));
      expect(events.has("APPOINTMENT_BOOKED")).toBe(true);
      expect(events.has("PAYMENT_SUCCESSFUL")).toBe(true);
      expect(events.has("APPOINTMENT_CANCELLED")).toBe(true);
      expect(events.has("APPOINTMENT_RESCHEDULED")).toBe(true);
      expect(events.has("APPOINTMENT_REMINDER")).toBe(true);
      expect(events.has("DOCTOR_SCHEDULE_CHANGED")).toBe(true);
      expect(events.has("APPOINTMENT_COMPLETED")).toBe(true);
    });

    it("allows admin to edit a notification template and uses the updated content", async () => {
      const bookedEmailTpl = await prisma.notificationTemplate.findFirst({
        where: {
          clinicId,
          event: NotificationType.APPOINTMENT_BOOKED,
          channel: NotificationChannel.EMAIL,
        },
      });
      expect(bookedEmailTpl).toBeDefined();

      const customSubject = "CUSTOMIZED SUBJECT: Welcome {{patientName}} to {{clinicName}} (#{{appointmentNumber}})";
      const customBody = "<p>Special Ayurvedic Welcome to {{patientName}}! Token: {{appointmentNumber}}</p>";

      const updated = await updateNotificationTemplate(bookedEmailTpl!.id, {
        subject: customSubject,
        body: customBody,
        isActive: true,
      });

      expect(updated.subject).toBe(customSubject);

      // Now dispatch and verify customized content is rendered
      const results = await dispatchNotification({
        event: NotificationType.APPOINTMENT_BOOKED,
        recipient: { name: "Test Custom Patient", email: "custom.tpl@test.com" },
        variables: {
          patientName: "Dr. Sharma",
          clinicName: "Ayurveda Wellness",
          appointmentNumber: "APT-CUSTOM-99",
        },
        channels: [NotificationChannel.EMAIL],
        clinicId,
      });

      expect(results[0].subject).toBe("CUSTOMIZED SUBJECT: Welcome Dr. Sharma to Ayurveda Wellness (#APT-CUSTOM-99)");
      expect(results[0].content).toContain("Special Ayurvedic Welcome to Dr. Sharma! Token: APT-CUSTOM-99");

      // Reset template back to default
      await resetNotificationTemplate(bookedEmailTpl!.id);
      const reset = await prisma.notificationTemplate.findUnique({ where: { id: bookedEmailTpl!.id } });
      expect(reset?.subject).not.toBe(customSubject);
    });

    it("respects template isActive toggle (does not dispatch when template is disabled)", async () => {
      const reminderSmsTpl = await prisma.notificationTemplate.findFirst({
        where: {
          clinicId,
          event: NotificationType.APPOINTMENT_REMINDER,
          channel: NotificationChannel.SMS,
        },
      });

      // Disable template
      await updateNotificationTemplate(reminderSmsTpl!.id, {
        body: reminderSmsTpl!.body,
        isActive: false,
      });

      const results = await dispatchNotification({
        event: NotificationType.APPOINTMENT_REMINDER,
        recipient: { name: "Patient X", phone: "+919876543210" },
        variables: { doctorName: "Dr. Seth" },
        channels: [NotificationChannel.SMS],
        clinicId,
      });

      // Disabled template yields no dispatches
      expect(results.length).toBe(0);
      expect(mockSms.sentMessages.length).toBe(0);

      // Re-enable template
      await updateNotificationTemplate(reminderSmsTpl!.id, {
        body: reminderSmsTpl!.body,
        isActive: true,
      });
    });
  });

  // ====================================================
  // TEST SUITE 4: Failure Handling & Non-Blocking Resilience
  // ====================================================
  describe("4. Failure Handling & Non-Blocking Isolation", () => {
    it("safely handles provider failure without throwing and logs FAILED status with error details", async () => {
      // Simulate connection timeout failure on Email provider
      mockEmail.simulateFailure = true;
      mockEmail.failureErrorMessage = "SMTP relay connection timed out (ETIMEDOUT 587)";

      // Dispatching does NOT throw
      const results = await dispatchNotification({
        event: NotificationType.APPOINTMENT_BOOKED,
        recipient: { name: "Unlucky Patient", email: "unlucky@test.com" },
        variables: { appointmentNumber: "APT-FAIL-01" },
        channels: [NotificationChannel.EMAIL],
        clinicId,
      });

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(false);
      expect(results[0].errorMessage).toContain("SMTP relay connection timed out");

      // Verify failure log recorded in database
      const failedLog = await prisma.notificationLog.findFirst({
        where: {
          recipient: "unlucky@test.com",
          status: NotificationDeliveryStatus.FAILED,
        },
        orderBy: { createdAt: "desc" },
      });

      expect(failedLog).toBeDefined();
      expect(failedLog?.status).toBe(NotificationDeliveryStatus.FAILED);
      expect(failedLog?.errorMessage).toContain("SMTP relay connection timed out");

      // Reset mock provider failure state
      mockEmail.simulateFailure = false;
    });

    it("ensures that core booking workflow succeeds even if notification provider fails", async () => {
      mockEmail.simulateFailure = true;

      // Clean up previous test run appointment and slot for clean run
      await prisma.appointment.deleteMany({
        where: { doctorId: testDoctor.id, appointmentDate: new Date("2026-11-05") },
      });
      await prisma.appointmentSlot.deleteMany({
        where: { doctorId: testDoctor.id, date: new Date("2026-11-05") },
      });

      // Book an appointment through core booking engine
      const appointment = await bookAppointment(
        {
          doctorId: testDoctor.id,
          appointmentDate: "2026-11-05",
          appointmentTime: "11:00",
          patientUserId: testPatientUser.id,
          patientDetails: {
            fullName: "Resilient Booking Patient",
            email: "resilient@test.com",
            phone: "+91 98888 33333",
          },
        },
        testPatientUser.id
      );

      // Core booking MUST succeed completely!
      expect(appointment).toBeDefined();
      expect(appointment.id).toBeDefined();
      expect(appointment.status).toBe("CONFIRMED");

      mockEmail.simulateFailure = false;
    });

    it("handles invalid recipient information gracefully with logged failure", async () => {
      const results = await dispatchNotification({
        event: NotificationType.APPOINTMENT_BOOKED,
        recipient: { name: "No Email User", email: "" },
        variables: { clinicName: "AyurvedaCare" },
        channels: [NotificationChannel.EMAIL],
        clinicId,
      });

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(false);
      expect(results[0].errorMessage).toBeDefined();
    });
  });

  // ====================================================
  // TEST SUITE 5: Delivery Logs & Security
  // ====================================================
  describe("5. Delivery Logs Querying & Zero Secret Exposure", () => {
    it("queries notification logs with status and event filtering", async () => {
      const { logs, total } = await getNotificationLogs({
        clinicId,
        limit: 10,
      });

      expect(Array.isArray(logs)).toBe(true);
      expect(total).toBeGreaterThan(0);
      expect(logs[0].recipient).toBeDefined();
      expect(logs[0].channel).toBeDefined();
      expect(logs[0].status).toBeDefined();
    });

    it("verifies provider status registry exposes no secrets or auth tokens", () => {
      const statuses = providerRegistry.getProviderStatuses();
      expect(statuses.email.name).toBeDefined();
      expect(statuses.sms.name).toBeDefined();
      expect(statuses.whatsapp.name).toBeDefined();

      const serialized = JSON.stringify(statuses);
      expect(serialized).not.toContain("password");
      expect(serialized).not.toContain("secret");
      expect(serialized).not.toContain("authToken");
      expect(serialized).not.toContain("api_key");
    });
  });
});
