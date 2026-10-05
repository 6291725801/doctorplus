import { prisma } from "@/lib/db";
import { AppointmentStatus, AppointmentType, DayOfWeek } from "@prisma/client";
import { recordAuditLog } from "@/lib/services/audit.service";
import { normalizeDate } from "@/lib/services/schedule.service";
import {
  sendAppointmentBookedNotification,
  sendAppointmentCancelledNotification,
  sendAppointmentRescheduledNotification,
  sendAppointmentCompletedNotification,
} from "@/lib/services/notification.service";

export interface BookAppointmentInput {
  doctorId: string;
  appointmentDate: string | Date;
  appointmentTime: string; // "HH:MM"
  appointmentType?: AppointmentType;
  serviceId?: string;
  patientProfileId?: string;
  patientUserId?: string;
  patientDetails?: {
    fullName: string;
    email: string;
    phone?: string;
    gender?: "MALE" | "FEMALE" | "OTHER";
  };
  symptoms?: string;
  patientNotes?: string;
  paymentMethod?: "UPI" | "ONLINE" | "CASH";
  upiTransactionId?: string;
}

export interface ListAppointmentsFilter {
  clinicId?: string;
  doctorId?: string;
  patientProfileId?: string;
  status?: AppointmentStatus;
  date?: string | Date;
  startDate?: string | Date;
  endDate?: string | Date;
  search?: string;
  page?: number;
  limit?: number;
}

const DAY_MAP: Record<number, DayOfWeek> = {
  0: DayOfWeek.SUNDAY,
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
  6: DayOfWeek.SATURDAY,
};

function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function generateAppointmentNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `APT-${dateStr}-${rand}`;
}

/**
 * PRODUCTION-GRADE ATOMIC APPOINTMENT BOOKING ENGINE
 * Enforces:
 * 1. Doctor status & active consultation validation
 * 2. Clinic holiday checks
 * 3. Doctor leave checks
 * 4. Doctor blocked dates / partial blocked intervals
 * 5. Working hours & break times validation
 * 6. Maximum appointment capacity limits (e.g. 10/10 capacity)
 * 7. Strict database row-level locking & concurrency guards to prevent double booking
 */
export async function bookAppointment(input: BookAppointmentInput, actorUserId?: string) {
  const { dateObj: targetDate, dateStr } = normalizeDate(input.appointmentDate);
  const timeStr = input.appointmentTime.trim();

  // Run in a single PostgreSQL database transaction with row-level locks
  const appointment = await prisma.$transaction(async (tx) => {
    // 1. Fetch Doctor
    const doctor = await tx.doctor.findUnique({
      where: { id: input.doctorId },
      include: {
        clinic: { select: { id: true, name: true } },
        schedules: { where: { isAvailable: true } },
      },
    });

    if (!doctor) {
      throw new Error(`Doctor not found with ID ${input.doctorId}`);
    }

    if (!doctor.isActive || !doctor.isAvailableForBooking) {
      throw new Error("Doctor is currently inactive or not available for appointments.");
    }

    // 2. Check Clinic Holidays
    const holiday = await tx.clinicHoliday.findFirst({
      where: { clinicId: doctor.clinicId, date: targetDate },
    });
    if (holiday) {
      throw new Error(`Clinic is closed on ${dateStr} for holiday: ${holiday.title}`);
    }

    // 3. Check Doctor Approved Leaves
    const leave = await tx.doctorLeave.findFirst({
      where: {
        doctorId: doctor.id,
        isApproved: true,
        startDate: { lte: targetDate },
        endDate: { gte: targetDate },
      },
    });
    if (leave) {
      throw new Error(`Doctor is on leave on ${dateStr}: ${leave.reason || "Approved Leave"}`);
    }

    // 4. Check Full-Day Blocked Dates
    const fullDayBlocked = await tx.doctorBlockedSlot.findFirst({
      where: {
        doctorId: doctor.id,
        date: targetDate,
        startTime: null,
        endTime: null,
      },
    });
    if (fullDayBlocked) {
      throw new Error(`Doctor schedule is blocked on ${dateStr}: ${fullDayBlocked.reason || "Unavailable"}`);
    }

    // 5. Check Working Hours for the Day of Week
    const dayOfWeek = DAY_MAP[targetDate.getUTCDay()];
    const schedule = doctor.schedules.find((s) => s.dayOfWeek === dayOfWeek);

    if (!schedule) {
      throw new Error(`Doctor does not have consultation hours on ${dayOfWeek} (${dateStr}).`);
    }

    const slotDuration = schedule.slotDurationMinutes || doctor.appointmentDurationMinutes || 15;
    const requestedMinutes = timeToMinutes(timeStr);
    const startMinutes = timeToMinutes(schedule.startTime);
    const endMinutes = timeToMinutes(schedule.endTime);

    if (requestedMinutes < startMinutes || requestedMinutes + slotDuration > endMinutes) {
      throw new Error(
        `Requested time ${timeStr} is outside doctor's consultation hours (${schedule.startTime} - ${schedule.endTime}).`
      );
    }

    // 6. Check Breaks
    if (schedule.breakStartTime && schedule.breakEndTime) {
      const bStart = timeToMinutes(schedule.breakStartTime);
      const bEnd = timeToMinutes(schedule.breakEndTime);
      if (requestedMinutes < bEnd && requestedMinutes + slotDuration > bStart) {
        throw new Error(
          `Requested slot ${timeStr} falls within doctor's break (${schedule.breakReason || "Break"}).`
        );
      }
    }

    // 7. Check Partial Blocked Intervals
    const partialBlock = await tx.doctorBlockedSlot.findFirst({
      where: {
        doctorId: doctor.id,
        date: targetDate,
        startTime: { not: null },
        endTime: { not: null },
      },
    });
    if (partialBlock && partialBlock.startTime && partialBlock.endTime) {
      const pbStart = timeToMinutes(partialBlock.startTime);
      const pbEnd = timeToMinutes(partialBlock.endTime);
      if (requestedMinutes < pbEnd && requestedMinutes + slotDuration > pbStart) {
        throw new Error(`Time slot ${timeStr} is blocked: ${partialBlock.reason || "Doctor unavailable"}`);
      }
    }

    // 8. CAPACITY CHECK (Total Appointments per Day limit)
    // E.g. Maximum bookings = 10 -> Once 10 is reached, rejected with FULLY BOOKED
    const effectiveMaxDaily = schedule.maxDailyAppointments ?? doctor.maxDailyAppointments;
    if (effectiveMaxDaily !== null && effectiveMaxDaily > 0) {
      const activeCount = await tx.appointment.count({
        where: {
          doctorId: doctor.id,
          appointmentDate: targetDate,
          status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.RESCHEDULED] },
        },
      });

      if (activeCount >= effectiveMaxDaily) {
        throw new Error(
          `FULLY BOOKED: Doctor has reached the maximum capacity limit (${activeCount}/${effectiveMaxDaily}) for this date.`
        );
      }
    }

    // 9. CONCURRENCY: Slot Upsert & Row-Level Lock
    const maxCapacity = schedule.maxPatientsPerSlot || 1;

    // Calculate end time
    const [h, m] = timeStr.split(":").map(Number);
    const endTotal = h * 60 + m + slotDuration;
    const endH = Math.floor(endTotal / 60);
    const endM = endTotal % 60;
    const endTimeStr = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    // Upsert the appointment slot record
    const slot = await tx.appointmentSlot.upsert({
      where: {
        doctorId_date_startTime: {
          doctorId: doctor.id,
          date: targetDate,
          startTime: timeStr,
        },
      },
      create: {
        doctorId: doctor.id,
        date: targetDate,
        startTime: timeStr,
        endTime: endTimeStr,
        maxCapacity,
        bookedCount: 0,
        status: "AVAILABLE",
      },
      update: {},
    });

    // Acquire PostgreSQL ROW-LEVEL LOCK with SELECT ... FOR UPDATE
    const [lockedSlot] = await tx.$queryRaw<Array<{ id: string; bookedCount: number; maxCapacity: number }>>`
      SELECT id, "bookedCount", "maxCapacity" FROM "AppointmentSlot" WHERE id = ${slot.id} FOR UPDATE
    `;

    if (!lockedSlot || lockedSlot.bookedCount >= lockedSlot.maxCapacity) {
      throw new Error(`SLOT_UNAVAILABLE: Time slot ${timeStr} on ${dateStr} is already booked.`);
    }

    // Verify existing active appointment does not already take the slot
    if (maxCapacity <= 1) {
      const existingAppt = await tx.appointment.findFirst({
        where: {
          doctorId: doctor.id,
          appointmentDate: targetDate,
          appointmentTime: timeStr,
          status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.RESCHEDULED] },
        },
      });
      if (existingAppt) {
        throw new Error(`SLOT_UNAVAILABLE: Time slot ${timeStr} on ${dateStr} is already booked.`);
      }
    }

    // Atomically increment slot booked count
    const newBookedCount = lockedSlot.bookedCount + 1;
    await tx.appointmentSlot.update({
      where: { id: slot.id },
      data: {
        bookedCount: { increment: 1 },
        status: newBookedCount >= lockedSlot.maxCapacity ? "BOOKED" : "AVAILABLE",
      },
    });

    // 10. Resolve or Create Patient Profile
    let patientProfileId = input.patientProfileId;

    if (!patientProfileId && input.patientUserId) {
      const profile = await tx.patientProfile.upsert({
        where: { userId: input.patientUserId },
        create: { userId: input.patientUserId },
        update: {},
      });
      patientProfileId = profile.id;
    } else if (!patientProfileId && input.patientDetails) {
      const normalizedEmail = input.patientDetails.email.toLowerCase().trim();
      let user = await tx.user.findUnique({ where: { email: normalizedEmail } });
      if (!user) {
        user = await tx.user.create({
          data: {
            email: normalizedEmail,
            fullName: input.patientDetails.fullName.trim(),
            phone: input.patientDetails.phone?.trim() || null,
            role: "PATIENT",
            passwordHash: "GUEST_BOOKING_NO_PASSWORD",
            clinicId: doctor.clinicId,
          },
        });
      }
      const profile = await tx.patientProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          gender: input.patientDetails.gender || null,
        },
        update: {},
      });
      patientProfileId = profile.id;
    }

    if (!patientProfileId) {
      throw new Error("Patient identification or profile required to book an appointment.");
    }

    // 11. Calculate Fees
    let consultationFee = Number(doctor.consultationFee);
    if (input.serviceId) {
      const service = await tx.service.findUnique({ where: { id: input.serviceId } });
      if (service) {
        consultationFee = Number(service.fee);
      }
    }

    const clinicSettings = await tx.clinicSettings.findUnique({ where: { clinicId: doctor.clinicId } });
    const minAdvance = clinicSettings ? Number(clinicSettings.minAdvanceAmount) : 100.00;
    const doctorAdvance = Number(doctor.advanceBookingFee) || minAdvance;
    const advanceAmount = Math.min(consultationFee, Math.max(minAdvance, doctorAdvance));
    const balanceAmount = Math.max(0, consultationFee - advanceAmount);

    // 12. Create Appointment
    const appointmentNumber = generateAppointmentNumber();

    const isUpiPayment = input.paymentMethod === "UPI" || !!input.upiTransactionId;
    const isPaidFull = advanceAmount >= consultationFee;
    const initialPaymentStatus = isUpiPayment
      ? (isPaidFull ? "PAID" : "PARTIALLY_PAID")
      : "PENDING";
    const paymentDateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    const created = await tx.appointment.create({
      data: {
        appointmentNumber,
        clinicId: doctor.clinicId,
        doctorId: doctor.id,
        patientProfileId,
        serviceId: input.serviceId || null,
        slotId: slot.id,
        appointmentDate: targetDate,
        appointmentTime: timeStr,
        appointmentType: input.appointmentType || AppointmentType.IN_PERSON,
        status: AppointmentStatus.CONFIRMED,
        consultationFee,
        advanceAmount,
        balanceAmount: isPaidFull ? 0 : balanceAmount,
        paymentStatus: initialPaymentStatus,
        symptoms: input.symptoms?.trim() || null,
        patientNotes: input.patientNotes?.trim() || null,
        ...(isUpiPayment
          ? {
              payments: {
                create: {
                  paymentReference: `PAY-${paymentDateStr}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
                  amount: advanceAmount,
                  currency: "INR",
                  status: "PAID",
                  method: "UPI",
                  gatewayProvider: "UPI_QR",
                  gatewayPaymentId: input.upiTransactionId?.trim() || "UPI_CONFIRMED",
                  notes: `UPI Payment via QR Code (UTR: ${input.upiTransactionId?.trim() || "N/A"}) - Payee: Rohit Kumar (6291725801@superyes)`,
                  paidAt: new Date(),
                  attempts: {
                    create: {
                      attemptNumber: 1,
                      status: "PAID",
                      amount: advanceAmount,
                      currency: "INR",
                      gatewayProvider: "UPI_QR",
                      gatewayPaymentId: input.upiTransactionId?.trim() || "UPI_CONFIRMED",
                    },
                  },
                },
              },
            }
          : {}),
      },
      include: {
        doctor: {
          include: {
            user: { select: { fullName: true, email: true, phone: true } },
          },
        },
        patientProfile: {
          include: {
            user: { select: { fullName: true, email: true, phone: true } },
          },
        },
        service: true,
        payments: true,
      },
    });

    return created;
  });

  // Audit log
  await recordAuditLog({
    userId: actorUserId,
    clinicId: appointment.clinicId,
    action: "BOOK_APPOINTMENT",
    entity: "Appointment",
    entityId: appointment.id,
    metadata: {
      appointmentNumber: appointment.appointmentNumber,
      doctorId: appointment.doctorId,
      date: dateStr,
      time: timeStr,
      fee: Number(appointment.consultationFee),
    },
  });

  // Non-blocking notification dispatch
  sendAppointmentBookedNotification(appointment.id).catch((err) => {
    console.error("[AppointmentService] Notification trigger error:", err);
  });

  return appointment;
}

/**
 * CANCEL APPOINTMENT
 * Releases slot capacity and sets status to CANCELLED.
 */
export async function cancelAppointment(appointmentId: string, reason?: string, actorUserId?: string) {
  const cancelled = await prisma.$transaction(async (tx) => {
    const appt = await tx.appointment.findUnique({
      where: { id: appointmentId },
      include: { slot: true },
    });

    if (!appt) {
      throw new Error(`Appointment not found with ID ${appointmentId}`);
    }

    if (appt.status === AppointmentStatus.CANCELLED) {
      return appt;
    }

    // Release slot bookedCount
    if (appt.slotId) {
      await tx.appointmentSlot.update({
        where: { id: appt.slotId },
        data: {
          bookedCount: { decrement: 1 },
          status: "AVAILABLE",
        },
      });
    }

    return tx.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancellationReason: reason?.trim() || "Cancelled by user or clinic staff",
        cancelledAt: new Date(),
      },
      include: {
        doctor: { include: { user: { select: { fullName: true } } } },
        patientProfile: { include: { user: { select: { fullName: true, email: true } } } },
      },
    });
  });

  await recordAuditLog({
    userId: actorUserId,
    clinicId: cancelled.clinicId,
    action: "CANCEL_APPOINTMENT",
    entity: "Appointment",
    entityId: cancelled.id,
    metadata: { reason },
  });

  // Non-blocking notification dispatch
  sendAppointmentCancelledNotification(cancelled.id, reason).catch((err) => {
    console.error("[AppointmentService] Notification trigger error:", err);
  });

  return cancelled;
}

/**
 * RESCHEDULE APPOINTMENT
 * Atomically releases previous slot and reserves new target date/time slot.
 */
export async function rescheduleAppointment(
  appointmentId: string,
  inputOrNewDate:
    | string
    | Date
    | {
        newDate: string | Date;
        newTime: string;
        reason?: string;
      },
  newTimeOrActorId?: string,
  reasonOrRole?: string,
  actorUserId?: string
) {
  let newDateInput: string | Date;
  let newTime: string;
  let reason: string | undefined;
  let actorId: string | undefined;
  let previousDate: string | undefined;
  let previousTime: string | undefined;

  if (typeof inputOrNewDate === "object" && !(inputOrNewDate instanceof Date)) {
    newDateInput = inputOrNewDate.newDate;
    newTime = inputOrNewDate.newTime;
    reason = inputOrNewDate.reason;
    actorId = typeof newTimeOrActorId === "string" ? newTimeOrActorId : undefined;
  } else {
    newDateInput = inputOrNewDate;
    newTime = newTimeOrActorId as string;
    reason = reasonOrRole;
    actorId = actorUserId;
  }

  const { dateObj: newTargetDate, dateStr: newDateStr } = normalizeDate(newDateInput);
  const newTimeStr = newTime.trim();

  const rescheduled = await prisma.$transaction(async (tx) => {
    const appt = await tx.appointment.findUnique({
      where: { id: appointmentId },
      include: { slot: true, doctor: { include: { schedules: { where: { isAvailable: true } } } } },
    });

    if (!appt) {
      throw new Error(`Appointment not found with ID ${appointmentId}`);
    }

    if (appt.status === AppointmentStatus.CANCELLED || appt.status === AppointmentStatus.COMPLETED) {
      throw new Error(`Cannot reschedule an appointment that is already ${appt.status}.`);
    }

    // 1. Validate new date and working hours
    const dayOfWeek = DAY_MAP[newTargetDate.getUTCDay()];
    const schedule = appt.doctor.schedules.find((s) => s.dayOfWeek === dayOfWeek);
    if (!schedule) {
      throw new Error(`Doctor does not have consultation hours on ${dayOfWeek} (${newDateStr}).`);
    }

    // Check holiday
    const holiday = await tx.clinicHoliday.findFirst({
      where: { clinicId: appt.clinicId, date: newTargetDate },
    });
    if (holiday) {
      throw new Error(`Clinic is closed on ${newDateStr} for holiday: ${holiday.title}`);
    }

    // Check leave
    const leave = await tx.doctorLeave.findFirst({
      where: {
        doctorId: appt.doctorId,
        isApproved: true,
        startDate: { lte: newTargetDate },
        endDate: { gte: newTargetDate },
      },
    });
    if (leave) {
      throw new Error(`Doctor is on leave on ${newDateStr}.`);
    }

    // 2. Capacity Check on new date
    const effectiveMax = schedule.maxDailyAppointments ?? appt.doctor.maxDailyAppointments;
    if (effectiveMax !== null && effectiveMax > 0) {
      const activeCount = await tx.appointment.count({
        where: {
          doctorId: appt.doctorId,
          appointmentDate: newTargetDate,
          id: { not: appt.id },
          status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.RESCHEDULED] },
        },
      });
      if (activeCount >= effectiveMax) {
        throw new Error(
          `FULLY BOOKED: Doctor has reached the maximum capacity limit (${activeCount}/${effectiveMax}) on ${newDateStr}.`
        );
      }
    }

    // 3. Release previous slot
    if (appt.slotId) {
      await tx.appointmentSlot.update({
        where: { id: appt.slotId },
        data: {
          bookedCount: { decrement: 1 },
          status: "AVAILABLE",
        },
      });
    }

    // 4. Reserve new slot
    const slotDuration = schedule.slotDurationMinutes || appt.doctor.appointmentDurationMinutes || 15;
    const [h, m] = newTimeStr.split(":").map(Number);
    const endTotal = h * 60 + m + slotDuration;
    const endH = Math.floor(endTotal / 60);
    const endM = endTotal % 60;
    const endTimeStr = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    const newSlot = await tx.appointmentSlot.upsert({
      where: {
        doctorId_date_startTime: {
          doctorId: appt.doctorId,
          date: newTargetDate,
          startTime: newTimeStr,
        },
      },
      create: {
        doctorId: appt.doctorId,
        date: newTargetDate,
        startTime: newTimeStr,
        endTime: endTimeStr,
        maxCapacity: schedule.maxPatientsPerSlot || 1,
        bookedCount: 0,
        status: "AVAILABLE",
      },
      update: {},
    });

    const [lockedSlot] = await tx.$queryRaw<Array<{ id: string; bookedCount: number; maxCapacity: number }>>`
      SELECT id, "bookedCount", "maxCapacity" FROM "AppointmentSlot" WHERE id = ${newSlot.id} FOR UPDATE
    `;

    if (!lockedSlot || lockedSlot.bookedCount >= lockedSlot.maxCapacity) {
      throw new Error(`SLOT_UNAVAILABLE: Time slot ${newTimeStr} on ${newDateStr} is already booked.`);
    }

    await tx.appointmentSlot.update({
      where: { id: newSlot.id },
      data: {
        bookedCount: { increment: 1 },
        status: lockedSlot.bookedCount + 1 >= lockedSlot.maxCapacity ? "BOOKED" : "AVAILABLE",
      },
    });

    // 5. Update appointment
    previousDate = appt.appointmentDate.toISOString().slice(0, 10);
    previousTime = appt.appointmentTime;

    return tx.appointment.update({
      where: { id: appointmentId },
      data: {
        appointmentDate: newTargetDate,
        appointmentTime: newTimeStr,
        slotId: newSlot.id,
        status: AppointmentStatus.CONFIRMED,
        patientNotes: reason
          ? `${appt.patientNotes || ""}\n[Rescheduled from ${previousDate} ${previousTime}: ${reason}]`.trim()
          : appt.patientNotes,
      },
      include: {
        doctor: { include: { user: { select: { fullName: true } } } },
        patientProfile: { include: { user: { select: { fullName: true, email: true } } } },
      },
    });
  });

  await recordAuditLog({
    userId: actorId || actorUserId,
    clinicId: rescheduled.clinicId,
    action: "RESCHEDULE_APPOINTMENT",
    entity: "Appointment",
    entityId: rescheduled.id,
    metadata: { newDate: newDateStr, newTime: newTimeStr, reason },
  });

  // Non-blocking notification dispatch
  sendAppointmentRescheduledNotification(rescheduled.id, previousDate, previousTime).catch((err) => {
    console.error("[AppointmentService] Notification trigger error:", err);
  });

  return rescheduled;
}

/**
 * UPDATE APPOINTMENT STATUS (Check-in, Complete, No-Show, Confirm)
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  statusOrInput:
    | AppointmentStatus
    | {
        status: AppointmentStatus;
        notes?: string;
        doctorNotes?: string;
        cancellationReason?: string;
      },
  optionsOrActorId?:
    | string
    | {
        notes?: string;
        doctorNotes?: string;
        cancellationReason?: string;
      },
  actorUserIdOrRole?: string
) {
  let newStatus: AppointmentStatus;
  let notes: string | undefined;
  let cancellationReason: string | undefined;
  let actorId: string | undefined;

  if (typeof statusOrInput === "object" && statusOrInput !== null) {
    newStatus = statusOrInput.status;
    notes = statusOrInput.doctorNotes || statusOrInput.notes;
    cancellationReason = statusOrInput.cancellationReason;
    actorId = typeof optionsOrActorId === "string" ? optionsOrActorId : actorUserIdOrRole;
  } else {
    newStatus = statusOrInput;
    if (typeof optionsOrActorId === "object" && optionsOrActorId !== null) {
      notes = optionsOrActorId.doctorNotes || optionsOrActorId.notes;
      cancellationReason = optionsOrActorId.cancellationReason;
      actorId = actorUserIdOrRole;
    } else {
      actorId = typeof optionsOrActorId === "string" ? optionsOrActorId : undefined;
    }
  }

  if (newStatus === AppointmentStatus.CANCELLED) {
    return cancelAppointment(appointmentId, cancellationReason, actorId);
  }

  const data: Record<string, unknown> = { status: newStatus };

  if (newStatus === AppointmentStatus.CHECKED_IN) {
    data.checkedInAt = new Date();
  } else if (newStatus === AppointmentStatus.COMPLETED) {
    data.completedAt = new Date();
    if (notes) {
      data.doctorNotes = notes;
    }
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data,
    include: {
      doctor: { include: { user: { select: { fullName: true } } } },
      patientProfile: { include: { user: { select: { fullName: true, email: true, phone: true } } } },
      service: true,
    },
  });

  await recordAuditLog({
    userId: actorId,
    clinicId: updated.clinicId,
    action: `STATUS_${newStatus}`,
    entity: "Appointment",
    entityId: updated.id,
    metadata: { status: newStatus, notes },
  });

  // Non-blocking notification dispatch on lifecycle events
  if (newStatus === AppointmentStatus.COMPLETED) {
    sendAppointmentCompletedNotification(updated.id).catch((err) => {
      console.error("[AppointmentService] Notification trigger error:", err);
    });
  }

  return updated;
}

/**
 * GET APPOINTMENT BY ID
 */
export async function getAppointmentById(id: string) {
  return prisma.appointment.findUnique({
    where: { id },
    include: {
      clinic: true,
      doctor: {
        include: {
          user: { select: { fullName: true, email: true, phone: true } },
        },
      },
      patientProfile: {
        include: {
          user: { select: { fullName: true, email: true, phone: true } },
        },
      },
      service: true,
      payments: true,
    },
  });
}

/**
 * LIST APPOINTMENTS (Admin & Reception Filterable)
 */
export async function listAppointments(filter: ListAppointmentsFilter) {
  const where: Record<string, unknown> = {};

  if (filter.clinicId) where.clinicId = filter.clinicId;
  if (filter.doctorId) where.doctorId = filter.doctorId;
  if (filter.patientProfileId) where.patientProfileId = filter.patientProfileId;
  if (filter.status) where.status = filter.status;

  if (filter.date) {
    const { dateObj } = normalizeDate(filter.date);
    where.appointmentDate = dateObj;
  } else if (filter.startDate || filter.endDate) {
    const dateRange: Record<string, Date> = {};
    if (filter.startDate) dateRange.gte = normalizeDate(filter.startDate).dateObj;
    if (filter.endDate) dateRange.lte = normalizeDate(filter.endDate).dateObj;
    where.appointmentDate = dateRange;
  }

  if (filter.search) {
    const search = filter.search.trim();
    where.OR = [
      { appointmentNumber: { contains: search, mode: "insensitive" } },
      { patientProfile: { user: { fullName: { contains: search, mode: "insensitive" } } } },
      { patientProfile: { user: { phone: { contains: search, mode: "insensitive" } } } },
      { doctor: { user: { fullName: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const page = Math.max(1, filter.page || 1);
  const limit = Math.min(100, Math.max(1, filter.limit || 20));
  const skip = (page - 1) * limit;

  const [total, appointments] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      include: {
        doctor: {
          include: {
            user: { select: { fullName: true, phone: true } },
          },
        },
        patientProfile: {
          include: {
            user: { select: { fullName: true, email: true, phone: true } },
          },
        },
        service: true,
      },
      orderBy: [{ appointmentDate: "desc" }, { appointmentTime: "asc" }],
      skip,
      take: limit,
    }),
  ]);

  return {
    appointments,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * GET DOCTOR'S APPOINTMENTS (For Doctor Workspace)
 */
export async function getDoctorAppointments(
  doctorId: string,
  filter?:
    | string
    | Date
    | {
        startDate?: string | Date;
        endDate?: string | Date;
        date?: string | Date;
      }
) {
  const where: Record<string, unknown> = { doctorId };
  if (filter) {
    if (typeof filter === "string" || filter instanceof Date) {
      where.appointmentDate = normalizeDate(filter).dateObj;
    } else if (typeof filter === "object") {
      if (filter.date) {
        where.appointmentDate = normalizeDate(filter.date).dateObj;
      } else if (filter.startDate || filter.endDate) {
        const dateFilter: Record<string, Date> = {};
        if (filter.startDate) dateFilter.gte = normalizeDate(filter.startDate).dateObj;
        if (filter.endDate) dateFilter.lte = normalizeDate(filter.endDate).dateObj;
        where.appointmentDate = dateFilter;
      }
    }
  }

  return prisma.appointment.findMany({
    where,
    include: {
      patientProfile: {
        include: {
          user: { select: { fullName: true, email: true, phone: true } },
        },
      },
      service: true,
    },
    orderBy: [{ appointmentDate: "asc" }, { appointmentTime: "asc" }],
  });
}

/**
 * GET PATIENT'S APPOINTMENTS (For Patient Portal)
 */
export async function getPatientAppointments(userId: string) {
  const profile = await prisma.patientProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    return [];
  }

  return prisma.appointment.findMany({
    where: { patientProfileId: profile.id },
    include: {
      doctor: {
        include: {
          user: { select: { fullName: true, phone: true } },
        },
      },
      service: true,
    },
    orderBy: [{ appointmentDate: "desc" }, { appointmentTime: "asc" }],
  });
}
