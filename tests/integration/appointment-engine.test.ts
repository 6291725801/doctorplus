import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getActiveClinic } from "@/lib/services/cms.service";
import { createDoctor } from "@/lib/services/doctor.service";
import {
  saveDoctorWeeklySchedules,
  addDoctorLeave,
  addClinicHoliday,
  getDoctorAvailableSlots,
  normalizeDate,
} from "@/lib/services/schedule.service";
import {
  bookAppointment,
  cancelAppointment,
  rescheduleAppointment,
  updateAppointmentStatus,
  getDoctorAppointments,
  getPatientAppointments,
} from "@/lib/services/appointment.service";
import { AppointmentStatus, AppointmentType, DayOfWeek } from "@prisma/client";

describe("Phase 4: Appointment & Slot Booking Engine Workflows", () => {
  let clinicId: string;
  let adminUserId: string;
  let doctorId: string;
  let doctorUserId: string;
  const patientUserIds: string[] = [];
  const testBookedAppointmentIds: string[] = [];

  // A fixed future Monday for repeatable testing: 2027-02-01 is a Monday
  const targetDateMonday = "2027-02-01";
  const targetDateTuesday = "2027-02-02";
  const targetDateWednesday = "2027-02-03";
  const targetDateThursday = "2027-02-04";

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

    // Clean up any stale Phase 4 test records before run safely
    const staleDocUser = await prisma.user.findUnique({
      where: { email: "dr.phase4.booking@ayurvedacare.com" },
      include: { doctor: true },
    });
    if (staleDocUser?.doctor) {
      const docId = staleDocUser.doctor.id;
      await prisma.appointment.deleteMany({ where: { doctorId: docId } });
      await prisma.appointmentSlot.deleteMany({ where: { doctorId: docId } });
      await prisma.doctorLeave.deleteMany({ where: { doctorId: docId } });
      await prisma.doctorSchedule.deleteMany({ where: { doctorId: docId } });
      await prisma.doctor.deleteMany({ where: { id: docId } });
      await prisma.user.deleteMany({ where: { id: staleDocUser.id } });
    }

    // Clean up any stale patient records before run safely
    for (let i = 1; i <= 15; i++) {
      const pEmail = `patient${i}.phase4@ayurvedacare.com`;
      const existingP = await prisma.user.findUnique({ where: { email: pEmail } });
      if (existingP) {
        await prisma.appointment.deleteMany({
          where: { patientProfile: { userId: existingP.id } },
        });
        await prisma.patientProfile.deleteMany({ where: { userId: existingP.id } });
        await prisma.user.deleteMany({ where: { id: existingP.id } });
      }
    }

    // Create a dedicated test doctor for Phase 4
    const doctor = await createDoctor(
      {
        clinicId,
        email: "dr.phase4.booking@ayurvedacare.com",
        fullName: "Dr. Ananya Booking Specialist",
        phone: "+91 98765 00000",
        specialization: "Panchakarma & General Medicine",
        qualification: "BAMS, MD (Ayurveda)",
        experienceYears: 12,
        consultationFee: 1000,
        advanceBookingFee: 100,
        appointmentDurationMinutes: 30,
        maxDailyAppointments: 10, // 10 MAX bookings capacity for test
      },
      adminUserId
    );
    if (!doctor) throw new Error("Doctor creation returned null");
    doctorId = doctor.id;
    doctorUserId = doctor.userId;

    // Setup Doctor Schedule for Monday, Tuesday, Wednesday, Thursday
    // 09:00 to 17:00 with lunch break 13:00 to 14:00
    await saveDoctorWeeklySchedules(
      doctorId,
      [
        {
          dayOfWeek: DayOfWeek.MONDAY,
          startTime: "09:00",
          endTime: "17:00",
          breakStartTime: "13:00",
          breakEndTime: "14:00",
          slotDurationMinutes: 30,
          maxDailyAppointments: 10,
          isAvailable: true,
        },
        {
          dayOfWeek: DayOfWeek.TUESDAY,
          startTime: "09:00",
          endTime: "17:00",
          breakStartTime: "13:00",
          breakEndTime: "14:00",
          slotDurationMinutes: 30,
          maxDailyAppointments: 10,
          isAvailable: true,
        },
        {
          dayOfWeek: DayOfWeek.WEDNESDAY,
          startTime: "09:00",
          endTime: "17:00",
          breakStartTime: "13:00",
          breakEndTime: "14:00",
          slotDurationMinutes: 30,
          maxDailyAppointments: 10,
          isAvailable: true,
        },
        {
          dayOfWeek: DayOfWeek.THURSDAY,
          startTime: "09:00",
          endTime: "17:00",
          breakStartTime: "13:00",
          breakEndTime: "14:00",
          slotDurationMinutes: 30,
          maxDailyAppointments: 10,
          isAvailable: true,
        },
      ],
      adminUserId
    );

    // Create 15 test patient users
    for (let i = 1; i <= 15; i++) {
      const patient = await prisma.user.create({
        data: {
          email: `patient${i}.phase4@ayurvedacare.com`,
          fullName: `Patient Number ${i}`,
          phone: `+9198765000${String(i).padStart(2, "0")}`,
          passwordHash: "patient_hash_phase4",
          role: "PATIENT",
          clinicId,
        },
      });
      patientUserIds.push(patient.id);
    }
  });

  afterAll(async () => {
    // Teardown test appointments
    if (doctorId) {
      await prisma.appointment.deleteMany({ where: { doctorId } });
      await prisma.appointmentSlot.deleteMany({ where: { doctorId } });
      await prisma.doctorLeave.deleteMany({ where: { doctorId } });
      await prisma.doctorSchedule.deleteMany({ where: { doctorId } });
      await prisma.doctor.deleteMany({ where: { id: doctorId } });
    }
    if (doctorUserId) {
      await prisma.user.deleteMany({ where: { id: doctorUserId } });
    }
    if (patientUserIds.length > 0) {
      await prisma.patientProfile.deleteMany({
        where: { userId: { in: patientUserIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: patientUserIds } },
      });
    }
    await prisma.clinicHoliday.deleteMany({
      where: {
        date: {
          in: [
            new Date(targetDateWednesday),
            new Date(targetDateThursday),
          ],
        },
      },
    });
  });

  it("1. Tests booking 1 patient with financial calculation (fee, advance, balance)", async () => {
    const booking1 = await bookAppointment(
      {
        doctorId,
        appointmentDate: targetDateMonday,
        appointmentTime: "09:00",
        appointmentType: AppointmentType.IN_PERSON,
        patientUserId: patientUserIds[0],
        patientDetails: {
          fullName: "Patient Number 1",
          email: "patient1.phase4@ayurvedacare.com",
          phone: "+919876500001",
        },
        symptoms: "Chronic joint pain and morning stiffness",
      },
      patientUserIds[0]
    );

    expect(booking1).toBeDefined();
    expect(booking1.doctorId).toBe(doctorId);
    expect(normalizeDate(booking1.appointmentDate).dateStr).toBe(targetDateMonday);
    expect(booking1.appointmentTime).toBe("09:00");
    expect(booking1.appointmentType).toBe(AppointmentType.IN_PERSON);
    expect(booking1.status).toBe(AppointmentStatus.CONFIRMED);

    // Financial calculations
    expect(Number(booking1.consultationFee)).toBe(1000);
    expect(Number(booking1.advanceAmount)).toBe(100);
    expect(Number(booking1.balanceAmount)).toBe(900);

    testBookedAppointmentIds.push(booking1.id);

    // Verify slot capacity reflects booking
    const slot = await prisma.appointmentSlot.findFirst({
      where: {
        doctorId,
        date: new Date(targetDateMonday),
        startTime: "09:00",
      },
    });
    expect(slot).toBeDefined();
    expect(slot?.bookedCount).toBe(1);
  });

  it("2. Tests booking 5 patients sequentially (accumulates 5/10 capacity)", async () => {
    // Book patients 2 to 5 at consecutive slots
    const times = ["09:30", "10:00", "10:30", "11:00"];

    for (let i = 0; i < times.length; i++) {
      const patientIdx = i + 1; // 1, 2, 3, 4 (patient 2, 3, 4, 5)
      const appt = await bookAppointment(
        {
          doctorId,
          appointmentDate: targetDateMonday,
          appointmentTime: times[i],
          appointmentType: AppointmentType.VIDEO_CONSULTATION,
          patientUserId: patientUserIds[patientIdx],
          patientDetails: {
            fullName: `Patient Number ${patientIdx + 1}`,
            email: `patient${patientIdx + 1}.phase4@ayurvedacare.com`,
          },
        },
        patientUserIds[patientIdx]
      );
      testBookedAppointmentIds.push(appt.id);
    }

    // Now total bookings for Monday should be 5
    const availability = await getDoctorAvailableSlots(doctorId, targetDateMonday);
    expect(availability.available).toBe(true);
    expect(availability.currentBookedCount).toBe(5);
    expect(availability.maxDailyAppointments).toBe(10);
    expect(availability.isFullyBooked).toBe(false);

    // Verify 09:00, 09:30, 10:00, 10:30, 11:00 are marked isAvailable = false
    const morningSlots = availability.slots.filter((s) =>
      ["09:00", "09:30", "10:00", "10:30", "11:00"].includes(s.startTime)
    );
    morningSlots.forEach((s) => {
      expect(s.isAvailable).toBe(false);
    });
  });

  it("3. Tests booking up to 10 patients (reaches 10/10 FULL CAPACITY)", async () => {
    // Book remaining 5 slots to reach 10/10: 11:30, 12:00, 12:30, 14:00, 14:30
    const times = ["11:30", "12:00", "12:30", "14:00", "14:30"];

    for (let i = 0; i < times.length; i++) {
      const patientIdx = i + 5; // 5, 6, 7, 8, 9 (patient 6, 7, 8, 9, 10)
      const appt = await bookAppointment(
        {
          doctorId,
          appointmentDate: targetDateMonday,
          appointmentTime: times[i],
          appointmentType: AppointmentType.IN_PERSON,
          patientUserId: patientUserIds[patientIdx],
          patientDetails: {
            fullName: `Patient Number ${patientIdx + 1}`,
            email: `patient${patientIdx + 1}.phase4@ayurvedacare.com`,
          },
        },
        patientUserIds[patientIdx]
      );
      testBookedAppointmentIds.push(appt.id);
    }

    // Capacity has reached 10/10!
    const availability = await getDoctorAvailableSlots(doctorId, targetDateMonday);
    expect(availability.available).toBe(false);
    expect(availability.currentBookedCount).toBe(10);
    expect(availability.maxDailyAppointments).toBe(10);
    expect(availability.isFullyBooked).toBe(true);
    expect(availability.unavailabilityReason?.toLowerCase()).toContain("fully booked");
  });

  it("4. Tests 11th patient booking attempt is REJECTED with FULLY BOOKED", async () => {
    // Patient 11 attempts to book 15:00 on the fully booked Monday
    await expect(
      bookAppointment(
        {
          doctorId,
          appointmentDate: targetDateMonday,
          appointmentTime: "15:00",
          appointmentType: AppointmentType.IN_PERSON,
          patientUserId: patientUserIds[10], // Patient 11
          patientDetails: {
            fullName: "Patient Number 11",
            email: "patient11.phase4@ayurvedacare.com",
          },
        },
        patientUserIds[10]
      )
    ).rejects.toThrow(/fully booked/i);

    // Verify appointment count remains strictly 10
    const count = await prisma.appointment.count({
      where: {
        doctorId,
        appointmentDate: new Date(targetDateMonday),
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.RESCHEDULED] },
      },
    });
    expect(count).toBe(10);
  });

  it("5. Tests Next Available Date is calculated when requested date is full", async () => {
    const availability = await getDoctorAvailableSlots(doctorId, targetDateMonday);
    expect(availability.isFullyBooked).toBe(true);
    expect(availability.nextAvailableDate).toBeDefined();
    // Next available date should be Tuesday
    expect(availability.nextAvailableDate).toBe(targetDateTuesday);

    // Query Tuesday availability and confirm slots are open
    const tuesdayAvailability = await getDoctorAvailableSlots(
      doctorId,
      availability.nextAvailableDate!
    );
    expect(tuesdayAvailability.available).toBe(true);
    expect(tuesdayAvailability.isFullyBooked).toBe(false);
    expect(tuesdayAvailability.slots.some((s) => s.isAvailable)).toBe(true);
  });

  it("6. Tests Simultaneous Booking Attempts (Concurrency & Overbooking Prevention)", async () => {
    // On Tuesday at 09:00 (slot capacity = 1), 5 patients concurrently attempt to book
    const concurrentPatients = [
      patientUserIds[10],
      patientUserIds[11],
      patientUserIds[12],
      patientUserIds[13],
      patientUserIds[14],
    ];

    const attempts = await Promise.allSettled(
      concurrentPatients.map((pId, idx) =>
        bookAppointment(
          {
            doctorId,
            appointmentDate: targetDateTuesday,
            appointmentTime: "09:00",
            appointmentType: AppointmentType.IN_PERSON,
            patientUserId: pId,
            patientDetails: {
              fullName: `Concurrent Patient ${idx + 1}`,
              email: `concurrent${idx + 1}@example.com`,
            },
          },
          pId
        )
      )
    );

    // Exactly 1 must be fulfilled, and 4 must be rejected
    const fulfilled = attempts.filter((r) => r.status === "fulfilled");
    const rejected = attempts.filter((r) => r.status === "rejected");

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(4);

    if (fulfilled[0].status === "fulfilled") {
      testBookedAppointmentIds.push(fulfilled[0].value.id);
    }

    // Verify slot in database has bookedCount exactly 1 (NEVER OVERBOOKED)
    const slot = await prisma.appointmentSlot.findFirst({
      where: {
        doctorId,
        date: new Date(targetDateTuesday),
        startTime: "09:00",
      },
    });
    expect(slot?.bookedCount).toBe(1);
  });

  it("7. Tests Cancellation releases slot capacity and allows new bookings", async () => {
    // Monday is currently 10/10 (fully booked).
    // Let's cancel the 1st appointment
    const apptToCancelId = testBookedAppointmentIds[0];
    const cancelled = await cancelAppointment(
      apptToCancelId,
      "Patient unable to attend due to work schedule",
      patientUserIds[0]
    );

    expect(cancelled.status).toBe(AppointmentStatus.CANCELLED);
    expect(cancelled.cancellationReason).toBe(
      "Patient unable to attend due to work schedule"
    );

    // Monday should now have 9 bookings and NO LONGER be fully booked!
    const availability = await getDoctorAvailableSlots(doctorId, targetDateMonday);
    expect(availability.available).toBe(true);
    expect(availability.isFullyBooked).toBe(false);
    expect(availability.currentBookedCount).toBe(9);

    // Slot 09:00 should now be open and available!
    const slot0900 = availability.slots.find((s) => s.startTime === "09:00");
    expect(slot0900).toBeDefined();
    expect(slot0900?.isAvailable).toBe(true);

    // Patient 11 can now successfully book the released 09:00 slot!
    const newBooking = await bookAppointment(
      {
        doctorId,
        appointmentDate: targetDateMonday,
        appointmentTime: "09:00",
        appointmentType: AppointmentType.IN_PERSON,
        patientUserId: patientUserIds[10],
        patientDetails: {
          fullName: "Patient Number 11",
          email: "patient11.phase4@ayurvedacare.com",
        },
      },
      patientUserIds[10]
    );
    expect(newBooking.status).toBe(AppointmentStatus.CONFIRMED);
    testBookedAppointmentIds.push(newBooking.id);
  });

  it("8. Tests Rescheduling releases old slot and reserves new slot", async () => {
    // Appointment for patient 2 on Monday at 09:30
    const apptToRescheduleId = testBookedAppointmentIds[1];

    const rescheduled = await rescheduleAppointment(
      apptToRescheduleId,
      {
        newDate: targetDateTuesday,
        newTime: "10:00",
        reason: "Requesting move to Tuesday morning",
      },
      patientUserIds[1]
    );

    expect(normalizeDate(rescheduled.appointmentDate).dateStr).toBe(targetDateTuesday);
    expect(rescheduled.appointmentTime).toBe("10:00");
    expect(rescheduled.status).toBe(AppointmentStatus.CONFIRMED);

    // Check old Monday 09:30 slot is released (bookedCount: 0)
    const oldSlot = await prisma.appointmentSlot.findFirst({
      where: {
        doctorId,
        date: new Date(targetDateMonday),
        startTime: "09:30",
      },
    });
    expect(oldSlot?.bookedCount).toBe(0);

    // Check new Tuesday 10:00 slot is reserved (bookedCount: 1)
    const newSlot = await prisma.appointmentSlot.findFirst({
      where: {
        doctorId,
        date: new Date(targetDateTuesday),
        startTime: "10:00",
      },
    });
    expect(newSlot?.bookedCount).toBe(1);
  });

  it("9. Tests Doctor Leave blocks bookings and marks date unavailable", async () => {
    // Doctor takes leave on Wednesday
    await addDoctorLeave(
      doctorId,
      {
        startDate: targetDateWednesday,
        endDate: targetDateWednesday,
        reason: "Attending National Ayurveda Conference",
      },
      adminUserId
    );

    const availability = await getDoctorAvailableSlots(doctorId, targetDateWednesday);
    expect(availability.available).toBe(false);
    expect(availability.unavailabilityReason).toContain("leave");

    // Attempting to book should fail with doctor on leave
    await expect(
      bookAppointment(
        {
          doctorId,
          appointmentDate: targetDateWednesday,
          appointmentTime: "10:00",
          appointmentType: AppointmentType.IN_PERSON,
          patientUserId: patientUserIds[0],
          patientDetails: {
            fullName: "Patient 1",
            email: "patient1.phase4@ayurvedacare.com",
          },
        },
        patientUserIds[0]
      )
    ).rejects.toThrow(/leave/i);
  });

  it("10. Tests Clinic Holiday blocks bookings across all doctors", async () => {
    // Clinic Holiday on Thursday
    await addClinicHoliday(
      clinicId,
      {
        date: targetDateThursday,
        title: "Ayurveda Founder Day",
        description: "Clinic closed for national Ayurveda day celebration",
      },
      adminUserId
    );

    const availability = await getDoctorAvailableSlots(doctorId, targetDateThursday);
    expect(availability.available).toBe(false);
    expect(availability.unavailabilityReason).toContain("holiday");

    // Attempting to book on holiday should fail
    await expect(
      bookAppointment(
        {
          doctorId,
          appointmentDate: targetDateThursday,
          appointmentTime: "11:00",
          appointmentType: AppointmentType.IN_PERSON,
          patientUserId: patientUserIds[0],
          patientDetails: {
            fullName: "Patient 1",
            email: "patient1.phase4@ayurvedacare.com",
          },
        },
        patientUserIds[0]
      )
    ).rejects.toThrow(/holiday/i);
  });

  it("11. Tests Admin & Receptionist lifecycle: Check-in, Complete with notes, No-Show", async () => {
    // Take an active booking on Monday (e.g. testBookedAppointmentIds[2])
    const apptId = testBookedAppointmentIds[2];

    // 1. Mark Checked In
    const checkedIn = await updateAppointmentStatus(
      apptId,
      { status: AppointmentStatus.CHECKED_IN },
      adminUserId
    );
    expect(checkedIn.status).toBe(AppointmentStatus.CHECKED_IN);

    // 2. Mark Completed with Doctor Notes
    const completed = await updateAppointmentStatus(
      apptId,
      {
        status: AppointmentStatus.COMPLETED,
        doctorNotes: "Prescribed Triphala Churna 5g twice daily with warm water.",
      },
      doctorUserId
    );
    expect(completed.status).toBe(AppointmentStatus.COMPLETED);
    expect(completed.doctorNotes).toBe(
      "Prescribed Triphala Churna 5g twice daily with warm water."
    );

    // 3. Mark another appointment as NO_SHOW
    const apptNoShowId = testBookedAppointmentIds[3];
    const noShow = await updateAppointmentStatus(
      apptNoShowId,
      { status: AppointmentStatus.NO_SHOW },
      adminUserId
    );
    expect(noShow.status).toBe(AppointmentStatus.NO_SHOW);
  });

  it("12. Tests Role-based Appointment Views (Doctor and Patient)", async () => {
    // Doctor appointments view
    const docAppointments = await getDoctorAppointments(doctorId, {
      startDate: targetDateMonday,
      endDate: targetDateTuesday,
    });
    expect(docAppointments.length).toBeGreaterThan(0);
    expect(docAppointments.every((a) => a.doctorId === doctorId)).toBe(true);

    // Patient appointments view
    const patientAppointments = await getPatientAppointments(patientUserIds[10]);
    expect(patientAppointments.length).toBeGreaterThan(0);
  });
});
