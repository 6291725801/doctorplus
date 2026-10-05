import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getActiveClinic } from "@/lib/services/cms.service";
import {
  createDoctor,
  updateDoctor,
  toggleDoctorStatus,
  getDoctorById,
} from "@/lib/services/doctor.service";
import {
  saveDoctorWeeklySchedules,
  addDoctorLeave,
  deleteDoctorLeave,
  addDoctorBlockedSlot,
  deleteDoctorBlockedSlot,
  addClinicHoliday,
  deleteClinicHoliday,
  getDoctorAvailableSlots,
} from "@/lib/services/schedule.service";
import { DayOfWeek } from "@prisma/client";

describe("Phase 3: Doctor & Clinic Schedule Engine Workflows", () => {
  let clinicId: string;
  let adminUserId: string;
  let doctorAId: string;
  let doctorBId: string;
  let serviceId: string;

  beforeAll(async () => {
    const clinic = await getActiveClinic();
    clinicId = clinic.id;

    const admin = await prisma.user.findFirst({
      where: { role: "CLINIC_ADMIN" },
    });
    if (!admin) {
      throw new Error("Admin user not found. Ensure database is seeded.");
    }
    adminUserId = admin.id;

    // Retrieve or create a test clinical service
    let service = await prisma.service.findFirst({
      where: { clinicId },
    });
    if (!service) {
      service = await prisma.service.create({
        data: {
          clinicId,
          name: "Holistic Health Consultation",
          slug: "holistic-health-consultation",
          durationMinutes: 30,
          fee: 600,
        },
      });
    }
    serviceId = service.id;
  });

  afterAll(async () => {
    // Cleanup created test doctors if any remain
    if (doctorAId) {
      await prisma.doctor.deleteMany({ where: { id: doctorAId } });
    }
    if (doctorBId) {
      await prisma.doctor.deleteMany({ where: { id: doctorBId } });
    }
    await prisma.user.deleteMany({
      where: { email: { in: ["dr.test.phase3a@ayurvedacare.com", "dr.test.phase3b@ayurvedacare.com"] } },
    });
  });

  it("1. Admin creates Doctor A with complete clinical profile and services", async () => {
    const doctor = await createDoctor(
      {
        clinicId,
        fullName: "Dr. Ananya Varma",
        email: "dr.test.phase3a@ayurvedacare.com",
        phone: "+91 98765 43210",
        specialization: "Panchakarma & Chronic Disorders",
        qualification: "BAMS, MD (Ayurveda), Gold Medalist",
        experienceYears: 12,
        registrationNumber: "AYU-DEL-2014-99881",
        languages: "English, Hindi, Sanskrit",
        consultationFee: 750,
        advanceBookingFee: 150,
        appointmentDurationMinutes: 30,
        roomNumber: "Room 102, Wing B",
        clinicLocation: "First Floor, Main Block",
        bio: "Specialist in classical Ayurvedic medicine with over 12 years of clinical excellence.",
        profilePhotoUrl: "/uploads/doctors/dr-ananya.jpg",
        serviceIds: [serviceId],
      },
      adminUserId
    );

    expect(doctor).toBeDefined();
    if (!doctor) throw new Error("Doctor creation returned null");
    expect(doctor.id).toBeDefined();
    expect(doctor.user.fullName).toBe("Dr. Ananya Varma");
    expect(doctor.user.role).toBe("DOCTOR");
    expect(doctor.specialization).toBe("Panchakarma & Chronic Disorders");
    expect(doctor.registrationNumber).toBe("AYU-DEL-2014-99881");
    expect(doctor.languages).toBe("English, Hindi, Sanskrit");
    expect(Number(doctor.consultationFee)).toBe(750);
    expect(doctor.appointmentDurationMinutes).toBe(30);
    expect(doctor.roomNumber).toBe("Room 102, Wing B");
    expect(doctor.clinicLocation).toBe("First Floor, Main Block");
    expect(doctor.services.length).toBeGreaterThanOrEqual(1);

    doctorAId = doctor.id;
  });

  it("2. Doctor profile is editable (update qualifications, fees, room, languages)", async () => {
    const updated = await updateDoctor(
      doctorAId,
      {
        consultationFee: 850,
        roomNumber: "Room 205 (Executive Suite)",
        languages: "English, Hindi, Marathi, Sanskrit",
        bio: "Senior consultant with enhanced holistic protocols.",
      },
      adminUserId
    );

    expect(updated).toBeDefined();
    if (!updated) throw new Error("Doctor update returned null");
    expect(Number(updated.consultationFee)).toBe(850);
    expect(updated.roomNumber).toBe("Room 205 (Executive Suite)");
    expect(updated.languages).toContain("Marathi");
    expect(updated.bio).toBe("Senior consultant with enhanced holistic protocols.");

    const fresh = await getDoctorById(doctorAId);
    expect(Number(fresh?.consultationFee)).toBe(850);
  });

  it("3. Configures weekly working schedule with shift break", async () => {
    // Wednesday: 10:00 to 14:00 (4 hours), 30-min slots, with Lunch break 12:00 to 13:00
    const schedules = await saveDoctorWeeklySchedules(
      doctorAId,
      [
        {
          dayOfWeek: DayOfWeek.WEDNESDAY,
          startTime: "10:00",
          endTime: "14:00",
          slotDurationMinutes: 30,
          breakStartTime: "12:00",
          breakEndTime: "13:00",
          breakReason: "Midday Consultation Break",
          isAvailable: true,
        },
      ],
      adminUserId
    );

    expect(schedules.length).toBe(1);
    expect(schedules[0].dayOfWeek).toBe(DayOfWeek.WEDNESDAY);
    expect(schedules[0].startTime).toBe("10:00");
    expect(schedules[0].endTime).toBe("14:00");
    expect(schedules[0].breakStartTime).toBe("12:00");
    expect(schedules[0].breakEndTime).toBe("13:00");
  });

  it("4. Dynamic Schedule Engine computes slots correctly, respecting shift breaks", async () => {
    // 2026-10-14 is a Wednesday
    const testDate = "2026-10-14";
    const slotResponse = await getDoctorAvailableSlots(doctorAId, testDate);

    expect(slotResponse.available).toBe(true);
    expect(slotResponse.dayOfWeek).toBe(DayOfWeek.WEDNESDAY);
    expect(slotResponse.workingHours?.startTime).toBe("10:00");
    expect(slotResponse.workingHours?.endTime).toBe("14:00");

    // Total slots: 10:00 to 14:00 in 30m intervals = 8 slots total
    expect(slotResponse.totalSlots).toBe(8);

    // Verify slots breakdown:
    // 10:00-10:30 (AVAILABLE)
    // 10:30-11:00 (AVAILABLE)
    // 11:00-11:30 (AVAILABLE)
    // 11:30-12:00 (AVAILABLE)
    // 12:00-12:30 (BREAK)
    // 12:30-13:00 (BREAK)
    // 13:00-13:30 (AVAILABLE)
    // 13:30-14:00 (AVAILABLE)
    const availableSlots = slotResponse.slots.filter((s) => s.isAvailable);
    const breakSlots = slotResponse.slots.filter((s) => s.status === "BREAK");

    expect(availableSlots.length).toBe(6);
    expect(breakSlots.length).toBe(2);

    expect(breakSlots[0].startTime).toBe("12:00");
    expect(breakSlots[0].reason).toBe("Midday Consultation Break");
    expect(breakSlots[1].startTime).toBe("12:30");

    expect(availableSlots[0].startTime).toBe("10:00");
    expect(availableSlots[5].startTime).toBe("13:30");
  });

  it("5. Schedule Engine excludes blocked dates (partial day blockout)", async () => {
    const testDate = "2026-10-14";

    // Doctor blocks 10:00 - 11:00 for a hospital clinical round
    const blockedSlot = await addDoctorBlockedSlot(
      doctorAId,
      {
        date: testDate,
        startTime: "10:00",
        endTime: "11:00",
        reason: "OPD Rounds / Medical Board Meeting",
      },
      adminUserId
    );

    expect(blockedSlot.id).toBeDefined();

    const slotResponse = await getDoctorAvailableSlots(doctorAId, testDate);
    const blocked = slotResponse.slots.filter((s) => s.status === "BLOCKED");

    expect(blocked.length).toBe(2); // 10:00-10:30 and 10:30-11:00
    expect(blocked[0].reason).toBe("OPD Rounds / Medical Board Meeting");

    // Available count should now be 4 (11:00-12:00 and 13:00-14:00)
    const available = slotResponse.slots.filter((s) => s.isAvailable);
    expect(available.length).toBe(4);

    // Clean up blocked slot
    await deleteDoctorBlockedSlot(blockedSlot.id, adminUserId);
  });

  it("6. Schedule Engine respects Doctor Leave (full day unavailable)", async () => {
    const testDate = "2026-10-14";

    const leave = await addDoctorLeave(
      doctorAId,
      {
        startDate: testDate,
        endDate: testDate,
        reason: "Attending National Ayurveda Conference",
        isApproved: true,
      },
      adminUserId
    );

    expect(leave.id).toBeDefined();

    const slotResponse = await getDoctorAvailableSlots(doctorAId, testDate);
    expect(slotResponse.available).toBe(false);
    expect(slotResponse.unavailabilityReason).toContain("leave");
    expect(slotResponse.availableSlotsCount).toBe(0);

    // Clean up leave
    await deleteDoctorLeave(leave.id, adminUserId);

    // Verify slots restored
    const restoredResponse = await getDoctorAvailableSlots(doctorAId, testDate);
    expect(restoredResponse.available).toBe(true);
    expect(restoredResponse.availableSlotsCount).toBe(6);
  });

  it("7. Schedule Engine respects Clinic Holidays (clinic-wide closure)", async () => {
    const testDate = "2026-10-14";

    const holiday = await addClinicHoliday(
      clinicId,
      {
        date: testDate,
        title: "Ayurveda Dhanvantari Jayanti",
        description: "Clinic closed on auspicious holiday",
      },
      adminUserId
    );

    expect(holiday.id).toBeDefined();

    const slotResponse = await getDoctorAvailableSlots(doctorAId, testDate);
    expect(slotResponse.available).toBe(false);
    expect(slotResponse.unavailabilityReason).toContain("Ayurveda Dhanvantari Jayanti");
    expect(slotResponse.availableSlotsCount).toBe(0);

    // Clean up clinic holiday
    await deleteClinicHoliday(holiday.id, adminUserId);

    // Verify slots restored
    const restoredResponse = await getDoctorAvailableSlots(doctorAId, testDate);
    expect(restoredResponse.available).toBe(true);
  });

  it("8. Admin can deactivate doctor -> deactivation prevents slot booking", async () => {
    const deactivated = await toggleDoctorStatus(doctorAId, false, adminUserId);
    expect(deactivated).toBeDefined();
    if (!deactivated) throw new Error("Deactivation returned null");
    expect(deactivated.isActive).toBe(false);

    const slotResponse = await getDoctorAvailableSlots(doctorAId, "2026-10-14");
    expect(slotResponse.available).toBe(false);
    expect(slotResponse.unavailabilityReason).toContain("inactive");

    // Reactivate doctor
    const reactivated = await toggleDoctorStatus(doctorAId, true, adminUserId);
    expect(reactivated).toBeDefined();
    if (!reactivated) throw new Error("Reactivation returned null");
    expect(reactivated.isActive).toBe(true);

    const restoredSlotResponse = await getDoctorAvailableSlots(doctorAId, "2026-10-14");
    expect(restoredSlotResponse.available).toBe(true);
  });

  it("9. Supports Multiple Doctors with independent schedules & durations", async () => {
    // Create Doctor B with 15-minute slot duration and different timing
    const doctorB = await createDoctor(
      {
        clinicId,
        fullName: "Dr. Rajesh Kulkarni",
        email: "dr.test.phase3b@ayurvedacare.com",
        phone: "+91 98765 00000",
        specialization: "Kayachikitsa (Internal Medicine)",
        qualification: "BAMS, MD",
        experienceYears: 8,
        appointmentDurationMinutes: 15,
        consultationFee: 500,
        roomNumber: "Room 105",
      },
      adminUserId
    );

    expect(doctorB).toBeDefined();
    if (!doctorB) throw new Error("Doctor B creation returned null");
    doctorBId = doctorB.id;

    // Doctor B works on Wednesday from 15:00 to 17:00 (2 hours = 8 slots of 15m)
    await saveDoctorWeeklySchedules(
      doctorBId,
      [
        {
          dayOfWeek: DayOfWeek.WEDNESDAY,
          startTime: "15:00",
          endTime: "17:00",
          slotDurationMinutes: 15,
          isAvailable: true,
        },
      ],
      adminUserId
    );

    // Verify Doctor A schedule remains untouched (10:00 to 14:00, 30 min slots)
    const slotsA = await getDoctorAvailableSlots(doctorAId, "2026-10-14");
    expect(slotsA.workingHours?.startTime).toBe("10:00");
    expect(slotsA.slotDurationMinutes).toBe(30);

    // Verify Doctor B schedule is completely distinct (15:00 to 17:00, 15 min slots)
    const slotsB = await getDoctorAvailableSlots(doctorBId, "2026-10-14");
    expect(slotsB.workingHours?.startTime).toBe("15:00");
    expect(slotsB.slotDurationMinutes).toBe(15);
    expect(slotsB.totalSlots).toBe(8); // (120 min / 15 min = 8 slots)
    expect(slotsB.availableSlotsCount).toBe(8);
  });
});
