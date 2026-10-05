/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/db";
import {
  getActiveClinic,
  generateCmsMetadata,
  getPublicDoctors,
  getPublicDoctorById,
  getPublicServices,
  getPublicServiceBySlug,
  getPageBySlug,
} from "@/lib/services/cms.service";
import {
  getPatientProfile,
  updatePatientProfile,
  getPatientPaymentHistory,
  getAppointmentReceipt,
} from "@/lib/services/patient.service";
import { bookAppointment, cancelAppointment, rescheduleAppointment } from "@/lib/services/appointment.service";
import { createDoctor } from "@/lib/services/doctor.service";
import { saveDoctorWeeklySchedules } from "@/lib/services/schedule.service";
import { AppointmentType, DayOfWeek } from "@prisma/client";

describe("Phase 5 Public Website & Patient Portal Functional Tests", () => {
  let clinicId: string;
  let testDoctor: any;
  let testService: any;
  let patientUser: any;
  let otherPatientUser: any;

  beforeAll(async () => {
    const clinic = await getActiveClinic();
    clinicId = clinic.id;

    const admin = await prisma.user.findFirst({
      where: { role: "CLINIC_ADMIN" },
    });
    const adminUserId = admin?.id || "system";

    // Find or create active doctor
    testDoctor = await prisma.doctor.findFirst({
      where: { clinicId, isActive: true },
      include: { user: true },
    });

    if (!testDoctor) {
      testDoctor = await createDoctor(
        {
          clinicId,
          email: "dr.phase5.portal@ayurvedacare.com",
          fullName: "Dr. Phase 5 Specialist",
          phone: "+91 98888 12345",
          specialization: "Integrative Ayurveda & Wellness",
          qualification: "BAMS, MD",
          experienceYears: 15,
          consultationFee: 800,
          advanceBookingFee: 150,
          appointmentDurationMinutes: 30,
        },
        adminUserId
      );
    }

    // Setup 7-day schedule for test doctor
    const days = [
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
      DayOfWeek.SUNDAY,
    ];
    await saveDoctorWeeklySchedules(
      testDoctor.id,
      days.map((dayOfWeek) => ({
        dayOfWeek,
        startTime: "09:00",
        endTime: "18:00",
        slotDurationMinutes: 30,
        isActive: true,
        shifts: [
          {
            startTime: "09:00",
            endTime: "18:00",
            breakStartTime: "13:00",
            breakEndTime: "14:00",
          },
        ],
      }))
    );

    testDoctor = (await prisma.doctor.findUnique({
      where: { id: testDoctor.id },
      include: { user: true },
    }))!;

    // Find or create active service
    testService = await prisma.service.findFirst({
      where: { clinicId, isActive: true },
    });

    if (!testService) {
      testService = await prisma.service.create({
        data: {
          clinicId,
          name: "Comprehensive Ayurvedic Consultation",
          slug: "comprehensive-ayurvedic-consultation",
          durationMinutes: 30,
          fee: 800,
          isActive: true,
        },
      });
    }

    // Create or find test patient user
    patientUser = await prisma.user.upsert({
      where: { email: "phase5_patient@test.com" },
      update: { fullName: "Phase 5 Test Patient", phone: "+91 9888877771" },
      create: {
        email: "phase5_patient@test.com",
        passwordHash: "$2b$10$hashedpasswordplaceholderfortesting12345678",
        fullName: "Phase 5 Test Patient",
        phone: "+91 9888877771",
        role: "PATIENT",
        isActive: true,
      },
    });

    // Create another patient for unauthorized access checks
    otherPatientUser = await prisma.user.upsert({
      where: { email: "other_patient@test.com" },
      update: { fullName: "Other Patient", phone: "+91 9888877772" },
      create: {
        email: "other_patient@test.com",
        passwordHash: "$2b$10$hashedpasswordplaceholderfortesting12345678",
        fullName: "Other Patient",
        phone: "+91 9888877772",
        role: "PATIENT",
        isActive: true,
      },
    });

    // Clean up any prior test appointments / slots to ensure fresh run
    await prisma.appointment.deleteMany({
      where: {
        OR: [
          { patientProfile: { userId: patientUser.id } },
          { doctorId: testDoctor.id },
        ],
      },
    });
    await prisma.appointmentSlot.deleteMany({
      where: { doctorId: testDoctor.id },
    });
  });

  describe("1. CMS Dynamic Metadata & Public Data Retrieval", () => {
    it("generates dynamic SEO metadata from CMS / SiteSettings", async () => {
      const meta = await generateCmsMetadata(
        "home",
        "Ayurvedic Clinic & Healthcare",
        "Premier holistic medical consultation."
      );

      expect(meta.title).toBeDefined();
      expect(meta.description).toBeDefined();
      expect(meta.openGraph).toBeDefined();
      expect(meta.openGraph?.title).toBeDefined();
    });

    it("retrieves published public doctors with active schedules", async () => {
      const doctors = await getPublicDoctors(clinicId);
      expect(doctors.length).toBeGreaterThan(0);
      const doc = doctors.find((d) => d.id === testDoctor.id);
      expect(doc).toBeDefined();
      expect(doc?.specialization).toBe(testDoctor.specialization);
      expect(doc?.user.fullName).toBe(testDoctor.user.fullName);
    });

    it("retrieves full public doctor profile by id", async () => {
      const doc = await getPublicDoctorById(testDoctor.id);
      expect(doc).not.toBeNull();
      expect(doc?.id).toBe(testDoctor.id);
      expect(doc?.specialization).toBe(testDoctor.specialization);
      expect(doc?.qualification).toBe(testDoctor.qualification);
      expect(doc?.user.fullName).toBe(testDoctor.user.fullName);
      expect(doc?.clinic).toBeDefined();
    });

    it("retrieves published clinical services and service details by slug", async () => {
      const services = await getPublicServices(clinicId);
      expect(services.length).toBeGreaterThan(0);

      if (testService) {
        const singleService = await getPublicServiceBySlug(testService.slug, clinicId);
        expect(singleService).not.toBeNull();
        expect(singleService?.name).toBe(testService.name);
        expect(Number(singleService?.fee)).toBe(Number(testService.fee));
      }
    });

    it("retrieves CMS page content by slug with ordered sections", async () => {
      const page = await getPageBySlug("home", clinicId);
      expect(page).not.toBeNull();
      expect(page?.slug).toBe("home");
      expect(Array.isArray(page?.sections)).toBe(true);
    });
  });

  describe("2. Patient Profile & Clinical Records", () => {
    it("retrieves and auto-creates patient profile", async () => {
      const profile = await getPatientProfile(patientUser.id);
      expect(profile).toBeDefined();
      expect(profile.email).toBe(patientUser.email);
      expect(profile.fullName).toBe(patientUser.fullName);
    });

    it("updates patient personal, medical, and emergency contact details", async () => {
      const updated = await updatePatientProfile(patientUser.id, {
        fullName: "Phase 5 Updated Patient",
        phone: "+91 9999911111",
        dateOfBirth: "1990-05-15",
        gender: "MALE",
        bloodGroup: "O+",
        address: "742 Evergreen Terrace",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
        emergencyContactName: "Jane Doe",
        emergencyContactPhone: "+91 9888822222",
        medicalNotes: "No known drug allergies. Seasonal allergic rhinitis.",
      });

      expect(updated.bloodGroup).toBe("O+");
      expect(updated.city).toBe("Bengaluru");
      expect(updated.emergencyContactName).toBe("Jane Doe");
      expect(updated.medicalNotes).toContain("Seasonal allergic rhinitis");

      // Verify user table was also updated with phone and name
      const freshUser = await prisma.user.findUnique({ where: { id: patientUser.id } });
      expect(freshUser?.fullName).toBe("Phase 5 Updated Patient");
      expect(freshUser?.phone).toBe("+91 9999911111");

      // Verify audit log exists
      const audit = await prisma.auditLog.findFirst({
        where: { action: "UPDATE_PATIENT_PROFILE", userId: patientUser.id },
        orderBy: { createdAt: "desc" },
      });
      expect(audit).toBeDefined();
    });
  });

  describe("3. Real Appointment Booking Engine & Slot Integration", () => {
    let createdAppointmentId: string;
    let appointmentNumber: string;

    it("books a real appointment through Phase 4 appointment engine", async () => {
      // Choose date 7 days in the future to avoid conflicts
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const targetDate = futureDate.toISOString().slice(0, 10);

      const booking = await bookAppointment({
        doctorId: testDoctor.id,
        serviceId: testService?.id,
        appointmentDate: targetDate,
        appointmentTime: "11:00",
        appointmentType: AppointmentType.IN_PERSON,
        patientUserId: patientUser.id,
        patientDetails: {
          fullName: "Phase 5 Updated Patient",
          email: patientUser.email,
          phone: "+91 9999911111",
        },
        symptoms: "Mild lower back stiffness in morning hours",
        patientNotes: "Prefers herbal remedies if appropriate",
      });

      expect(booking).toBeDefined();
      expect(booking.id).toBeDefined();
      expect(booking.appointmentNumber).toMatch(/^APT-/);
      expect(booking.status).toBe("CONFIRMED");
      expect(Number(booking.advanceAmount)).toBeGreaterThanOrEqual(0);

      createdAppointmentId = booking.id;
      appointmentNumber = booking.appointmentNumber;
    });

    it("patient can reschedule the appointment using real engine", async () => {
      const rescheduleDate = new Date();
      rescheduleDate.setDate(rescheduleDate.getDate() + 8);
      const newTargetDate = rescheduleDate.toISOString().slice(0, 10);

      const rescheduled = await rescheduleAppointment(
        createdAppointmentId,
        {
          newDate: newTargetDate,
          newTime: "12:00",
          reason: "Patient office schedule conflict",
        },
        patientUser.id
      );

      expect(rescheduled).toBeDefined();
      expect(rescheduled.appointmentTime).toBe("12:00");
      expect(rescheduled.status).toBe("CONFIRMED");
    });

    it("generates official, verifiable receipt for the patient appointment", async () => {
      const receipt = await getAppointmentReceipt(createdAppointmentId, patientUser.id);

      expect(receipt).toBeDefined();
      expect(receipt.receiptNumber).toContain(appointmentNumber.replace("APT-", ""));
      expect(receipt.patient.fullName).toBe("Phase 5 Updated Patient");
      expect(receipt.doctor.fullName).toBe(testDoctor.user.fullName);
      expect(receipt.financials.consultationFee).toBeGreaterThan(0);
      expect(receipt.clinic.name).toBeDefined();
      expect(receipt.clinic.phone).toBeDefined();
    });

    it("prevents unauthorized users from accessing another patient's receipt", async () => {
      await expect(
        getAppointmentReceipt(createdAppointmentId, otherPatientUser.id)
      ).rejects.toThrow(/Unauthorized/);
    });

    it("patient can view their payment history ledger", async () => {
      const ledger = await getPatientPaymentHistory(patientUser.id);
      expect(Array.isArray(ledger)).toBe(true);
      expect(ledger.length).toBeGreaterThan(0);

      const foundAppt = ledger.find((l) => l.id === createdAppointmentId);
      expect(foundAppt).toBeDefined();
      expect(foundAppt?.appointmentNumber).toBe(appointmentNumber);
      expect(foundAppt?.doctorName).toBe(testDoctor.user.fullName);
    });

    it("patient can cancel the appointment within permitted rules", async () => {
      const cancelled = await cancelAppointment(
        createdAppointmentId,
        "Personal travel plans changed",
        patientUser.id
      );

      expect(cancelled.status).toBe("CANCELLED");
      expect(cancelled.cancellationReason).toBe("Personal travel plans changed");

      // Verify audit log
      const cancelAudit = await prisma.auditLog.findFirst({
        where: { action: "CANCEL_APPOINTMENT", entityId: createdAppointmentId },
      });
      expect(cancelAudit).toBeDefined();
    });
  });
});
